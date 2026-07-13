"""
ASFA (Adaptive Self-Healing Federated Aggregation) core orchestration.

Implements:
- Checkpointing: save global model states per round
- Quarantine: exclude suspicious clients for N rounds
- Rollback: restore last good checkpoint on validation accuracy drop
- Replay: re-run aggregation after rollback with clean clients only
- Event logging: persistent record of all healing actions
"""

import os
import csv
import time
from typing import Dict, List, Optional, Set, Tuple, Any
from dataclasses import dataclass, field
import numpy as np
import torch
import torch.nn as nn


@dataclass
class HealingEvent:
    """Record of a healing action."""
    round_num: int
    event_type: str
    timestamp: float = field(default_factory=time.time)
    details: Dict[str, Any] = field(default_factory=dict)


class HealingController:
    """
    ASFA: Adaptive Self-Healing Federated Aggregation controller.
    Orchestrates anomaly detection -> quarantine -> aggregation -> validation -> rollback-if-needed -> replay-if-needed.
    """
    
    def __init__(
        self,
        checkpoint_dir: str = "checkpoints",
        results_dir: str = "results",
        max_checkpoints: int = 5,
        quarantine_rounds: int = 3,
        rollback_drop_threshold: float = 0.15,
        recovery_threshold: float = 0.02,
    ):
        self.checkpoint_dir = checkpoint_dir
        self.results_dir = results_dir
        self.max_checkpoints = max_checkpoints
        self.quarantine_rounds = quarantine_rounds
        self.rollback_drop_threshold = rollback_drop_threshold
        self.recovery_threshold = recovery_threshold
        
        os.makedirs(checkpoint_dir, exist_ok=True)
        os.makedirs(results_dir, exist_ok=True)
        
        # Quarantine state: client_id -> rounds_remaining
        self.quarantined_clients: Dict[int, int] = {}
        
        # Checkpoint history: list of (round_num, path, val_accuracy)
        self.checkpoints: List[Tuple[int, str, float]] = []
        
        # Event log
        self.events: List[HealingEvent] = []
        self.events_csv = os.path.join(results_dir, "healing_events.csv")
        
        with open(self.events_csv, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["timestamp", "round_num", "event_type", "details"])
        
        # Cached client updates for replay: round -> {client_id -> update}
        self.cached_updates: Dict[int, Dict[int, Any]] = {}
        
        # Validation accuracy history
        self.val_acc_history: List[float] = []
        
        # Best known validation accuracy
        self.best_val_acc: float = 0.0
        self.best_checkpoint_round: int = 0
        
        # Rollback state
        self.rollback_triggered: bool = False
        self.num_rollbacks: int = 0
    
    def checkpoint(self, round_num: int, global_model: nn.Module, val_accuracy: float):
        """Save global model checkpoint."""
        if val_accuracy >= self.best_val_acc - self.recovery_threshold:
            path = os.path.join(self.checkpoint_dir, f"round_{round_num}.pt")
            torch.save(global_model.state_dict(), path)
            
            self.checkpoints.append((round_num, path, val_accuracy))
            
            if val_accuracy > self.best_val_acc:
                self.best_val_acc = val_accuracy
                self.best_checkpoint_round = round_num
            
            # Prune old checkpoints
            if len(self.checkpoints) > self.max_checkpoints:
                oldest = self.checkpoints.pop(0)
                if os.path.exists(oldest[1]) and oldest[0] != self.best_checkpoint_round:
                    os.remove(oldest[1])
            
            self.log_event(round_num, "checkpoint", {
                "path": path,
                "val_accuracy": val_accuracy,
                "best_so_far": val_accuracy >= self.best_val_acc,
            })
    
    def quarantine(self, client_id: int, rounds: Optional[int] = None) -> bool:
        """Quarantine a client: exclude from aggregation for N rounds."""
        r = rounds or self.quarantine_rounds
        
        if client_id in self.quarantined_clients:
            self.quarantined_clients[client_id] = max(self.quarantined_clients[client_id], r)
            return False
        
        self.quarantined_clients[client_id] = r
        self.log_event(-1, "quarantine", {"client_id": client_id, "rounds": r})
        return True
    
    def is_quarantined(self, client_id: int) -> bool:
        """Check if a client is currently quarantined."""
        return client_id in self.quarantined_clients and self.quarantined_clients[client_id] > 0
    
    def get_active_quarantine(self) -> Set[int]:
        """Get set of currently quarantined client IDs."""
        return {cid for cid, rounds in self.quarantined_clients.items() if rounds > 0}
    
    def decay_quarantine(self):
        """Decrement quarantine counters by 1 round."""
        to_remove = []
        for cid in list(self.quarantined_clients.keys()):
            self.quarantined_clients[cid] -= 1
            if self.quarantined_clients[cid] <= 0:
                to_remove.append(cid)
                self.log_event(-1, "quarantine_lifted", {"client_id": cid})
        
        for cid in to_remove:
            del self.quarantined_clients[cid]
    
    def detect_and_trigger_rollback(
        self,
        current_val_acc: float,
        prev_val_acc: Optional[float] = None,
    ) -> bool:
        """Detect if validation accuracy dropped sharply, triggering rollback."""
        if prev_val_acc is None and len(self.val_acc_history) > 0:
            prev_val_acc = self.val_acc_history[-1]
        
        self.val_acc_history.append(current_val_acc)
        
        if prev_val_acc is None:
            return False
        
        drop = prev_val_acc - current_val_acc
        
        if drop > self.rollback_drop_threshold:
            self.rollback_triggered = True
            self.num_rollbacks += 1
            self.log_event(-1, "rollback_triggered", {
                "prev_acc": prev_val_acc,
                "current_acc": current_val_acc,
                "drop": drop,
                "threshold": self.rollback_drop_threshold,
            })
            return True
        
        self.rollback_triggered = False
        return False
    
    def rollback(self, global_model: nn.Module) -> Tuple[bool, int, float]:
        """Restore global model to last known good checkpoint."""
        if not self.checkpoints:
            self.log_event(-1, "rollback_failed", {"reason": "no_checkpoints"})
            return False, -1, 0.0
        
        best_cp = max(self.checkpoints, key=lambda x: x[2])
        round_num, path, val_acc = best_cp
        
        if os.path.exists(path):
            state_dict = torch.load(path, map_location="cpu", weights_only=False)
            global_model.load_state_dict(state_dict)
            
            self.log_event(-1, "rollback_executed", {
                "restored_round": round_num,
                "val_accuracy": val_acc,
                "checkpoint_path": path,
            })
            return True, round_num, val_acc
        else:
            self.log_event(-1, "rollback_failed", {
                "reason": "checkpoint_not_found",
                "expected_path": path,
            })
            return False, -1, 0.0
    
    def cache_updates(self, round_num: int, client_updates: Dict[int, Any]):
        """Cache client updates for potential replay after rollback."""
        self.cached_updates[round_num] = client_updates.copy()
    
    def get_cached_updates(self, round_num: int) -> Optional[Dict[int, Any]]:
        """Retrieve cached updates for a round."""
        return self.cached_updates.get(round_num)
    
    def clear_old_cache(self, keep_last: int = 3):
        """Clear cached updates older than keep_last rounds."""
        if len(self.cached_updates) > keep_last:
            rounds = sorted(self.cached_updates.keys())
            for r in rounds[:-keep_last]:
                del self.cached_updates[r]
    
    def log_event(self, round_num: int, event_type: str, details: Dict = None):
        """Log a healing event to CSV."""
        event = HealingEvent(round_num=round_num, event_type=event_type, details=details or {})
        self.events.append(event)
        
        with open(self.events_csv, "a", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                event.timestamp,
                event.round_num,
                event.event_type,
                str(event.details),
            ])
    
    def get_recovery_time(self) -> Optional[int]:
        """Calculate rounds elapsed between last rollback and accuracy recovery."""
        if self.num_rollbacks == 0 or not self.val_acc_history:
            return None
        
        rollback_events = [e for e in self.events if e.event_type == "rollback_triggered"]
        if not rollback_events:
            return None
        
        last_rollback = rollback_events[-1]
        rollback_idx = self.events.index(last_rollback)
        
        for i in range(len(self.val_acc_history) - 1, -1, -1):
            if self.val_acc_history[i] >= self.best_val_acc - self.recovery_threshold:
                return i - rollback_idx if i > rollback_idx else None
        
        return None
    
    def get_summary(self) -> Dict:
        """Get summary of healing actions."""
        return {
            "num_rollbacks": self.num_rollbacks,
            "num_quarantined_now": len(self.get_active_quarantine()),
            "total_quarantine_events": len([e for e in self.events if e.event_type == "quarantine"]),
            "num_checkpoints": len(self.checkpoints),
            "best_val_acc": self.best_val_acc,
            "best_checkpoint_round": self.best_checkpoint_round,
        }


if __name__ == "__main__":
    print("=" * 60)
    print("SMOKE TEST: healing.py")
    print("=" * 60)
    
    import tempfile
    
    with tempfile.TemporaryDirectory() as tmpdir:
        cp_dir = os.path.join(tmpdir, "checkpoints")
        res_dir = os.path.join(tmpdir, "results")
        
        hc = HealingController(
            checkpoint_dir=cp_dir,
            results_dir=res_dir,
            quarantine_rounds=3,
            rollback_drop_threshold=0.1,
        )
        
        print("\n[1] Checkpoint...")
        model = nn.Linear(10, 2)
        hc.checkpoint(1, model, 0.85)
        assert len(hc.checkpoints) == 1
        print(f"  Saved, best_acc={hc.best_val_acc:.2f}")
        
        print("\n[2] Quarantine...")
        hc.quarantine(5)
        assert hc.is_quarantined(5)
        assert not hc.is_quarantined(0)
        print(f"  Quarantined: {hc.get_active_quarantine()}")
        
        print("\n[3] Quarantine decay...")
        for _ in range(3):
            hc.decay_quarantine()
        assert not hc.is_quarantined(5)
        print("  Quarantine expired")
        
        print("\n[4] Rollback detection...")
        hc.val_acc_history = [0.85]
        should_rollback = hc.detect_and_trigger_rollback(0.70)
        assert should_rollback
        print("  Rollback triggered")
        
        print("\n[5] Rollback execution...")
        model2 = nn.Linear(10, 2)
        success, rnd, acc = hc.rollback(model2)
        assert success
        print(f"  Restored to round {rnd}, acc={acc:.2f}")
        
        print("\n[6] Summary...")
        summary = hc.get_summary()
        print(f"  {summary}")
        assert summary["num_rollbacks"] == 1
    
    print("\nAll healing smoke tests passed!")
