"""
Persistent per-client reputation tracker for ASFA.
Scores decay on suspicious behavior, recover slowly on clean behavior.
Used to weight aggregation contributions.
"""

import os
import csv
from typing import Dict, List
import numpy as np


class ReputationTracker:
    """
    Tracks per-client reputation scores in [0, 1].
    - Initialized at 1.0 for all clients (fully trusted)
    - Penalize: multiplicative decay (e.g., score *= 0.8)
    - Reward: slow additive recovery (e.g., score += 0.05)
    - get_weight(): converts score to aggregation weight
    """
    
    def __init__(
        self,
        num_clients: int,
        initial_score: float = 1.0,
        decay_factor: float = 0.7,
        recovery_rate: float = 0.05,
        min_score: float = 0.1,
        max_score: float = 1.0,
        log_path: str = "results/reputation_log.csv",
    ):
        self.num_clients = num_clients
        self.initial_score = initial_score
        self.decay_factor = decay_factor
        self.recovery_rate = recovery_rate
        self.min_score = min_score
        self.max_score = max_score
        self.log_path = log_path
        
        self.scores: Dict[int, float] = {i: initial_score for i in range(num_clients)}
        self.history: List[Dict] = []
        
        os.makedirs(os.path.dirname(log_path), exist_ok=True)
        with open(self.log_path, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["round", "client_id", "score", "event"])
    
    def penalize(self, client_id: int, severity: float = 1.0):
        """Reduce reputation score for suspicious behavior."""
        if client_id not in self.scores:
            return
        self.scores[client_id] *= (self.decay_factor ** severity)
        self.scores[client_id] = max(self.scores[client_id], self.min_score)
        self._log_event(-1, client_id, "penalize")
    
    def reward(self, client_id: int):
        """Slowly increase reputation score for clean behavior."""
        if client_id not in self.scores:
            return
        self.scores[client_id] += self.recovery_rate
        self.scores[client_id] = min(self.scores[client_id], self.max_score)
        self._log_event(-1, client_id, "reward")
    
    def get_score(self, client_id: int) -> float:
        """Get current reputation score for a client."""
        return self.scores.get(client_id, self.min_score)
    
    def get_weight(self, client_id: int) -> float:
        """
        Convert reputation score to aggregation weight.
        Maps [0, 1] -> [0.1, 1.0] to prevent complete exclusion.
        """
        score = self.get_score(client_id)
        return 0.1 + 0.9 * score
    
    def get_all_weights(self) -> Dict[int, float]:
        """Get aggregation weights for all clients."""
        return {cid: self.get_weight(cid) for cid in self.scores.keys()}
    
    def update_after_round(self, round_num: int, suspicious_clients: List[int], all_participating: List[int]):
        """Update reputations after a training round."""
        for cid in all_participating:
            if cid in suspicious_clients:
                self.penalize(cid, severity=1.0)
            else:
                self.reward(cid)
        for cid, score in self.scores.items():
            event = "suspicious" if cid in suspicious_clients else "clean"
            self._log_event(round_num, cid, event)
    
    def _log_event(self, round_num: int, client_id: int, event: str):
        """Append to reputation log CSV."""
        with open(self.log_path, "a", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([round_num, client_id, f"{self.scores[client_id]:.4f}", event])
    
    def get_summary(self) -> Dict:
        """Get summary statistics of current reputation scores."""
        scores = list(self.scores.values())
        return {
            "mean_score": np.mean(scores),
            "min_score": np.min(scores),
            "max_score": np.max(scores),
            "num_low_reputation": sum(1 for s in scores if s < 0.5),
        }


if __name__ == "__main__":
    print("=" * 60)
    print("SMOKE TEST: reputation.py")
    print("=" * 60)
    
    import tempfile
    with tempfile.TemporaryDirectory() as tmpdir:
        rt = ReputationTracker(num_clients=5, log_path=os.path.join(tmpdir, "rep.csv"))
        
        print("\n[1] Initial scores...")
        for i in range(5):
            assert rt.get_score(i) == 1.0
        print("  All clients start at 1.0")
        
        print("\n[2] Penalize...")
        rt.penalize(0, severity=1.0)
        score_0 = rt.get_score(0)
        print(f"  Client 0 after penalty: {score_0:.4f}")
        assert score_0 < 1.0
        assert score_0 >= 0.1
        
        print("\n[3] Reward...")
        old_score = rt.get_score(0)
        rt.reward(0)
        new_score = rt.get_score(0)
        print(f"  Client 0 after reward: {new_score:.4f}")
        assert new_score > old_score
        
        print("\n[4] Weights...")
        weight_high = rt.get_weight(1)
        weight_low = rt.get_weight(0)
        print(f"  High rep: {weight_high:.4f}, Low rep: {weight_low:.4f}")
        assert weight_high > weight_low
        assert weight_low >= 0.1
        
        print("\n[5] Round update...")
        rt2 = ReputationTracker(num_clients=5, log_path=os.path.join(tmpdir, "rep2.csv"))
        rt2.update_after_round(1, suspicious_clients=[2, 3], all_participating=[0, 1, 2, 3, 4])
        print(f"  Client 2: {rt2.get_score(2):.4f}, Client 0: {rt2.get_score(0):.4f}")
        assert rt2.get_score(2) < 1.0
    
    print("\nAll reputation smoke tests passed!")
