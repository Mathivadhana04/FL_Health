"""
Evaluation metrics for federated learning experiments:
- Accuracy, F1 score
- Attack Success Rate (ASR) for backdoor
- Privacy budget (epsilon) tracking
- Recovery time calculation
"""

from typing import List, Dict, Optional
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from sklearn.metrics import f1_score, accuracy_score


def accuracy(preds: np.ndarray, labels: np.ndarray) -> float:
    """
    Compute classification accuracy.
    """
    return float(accuracy_score(labels, preds))


def f1(preds: np.ndarray, labels: np.ndarray, average: str = "macro") -> float:
    """
    Compute F1 score.
    """
    return float(f1_score(labels, preds, average=average, zero_division=0))


def evaluate_model(
    model: nn.Module,
    dataloader: DataLoader,
    device: torch.device = torch.device("cpu"),
) -> Dict[str, float]:
    """
    Evaluate model on a dataset.
    """
    model.to(device)
    model.eval()
    
    criterion = nn.CrossEntropyLoss()
    
    all_preds = []
    all_labels = []
    total_loss = 0.0
    total_samples = 0
    
    with torch.no_grad():
        for data, target in dataloader:
            data, target = data.to(device), target.to(device)
            
            if target.dim() > 1:
                target = target.squeeze().long()
            else:
                target = target.long()
            
            output = model(data)
            loss = criterion(output, target)
            
            total_loss += loss.item() * data.size(0)
            total_samples += data.size(0)
            
            preds = output.argmax(dim=1).cpu().numpy()
            labels = target.cpu().numpy()
            
            all_preds.extend(preds)
            all_labels.extend(labels)
    
    all_preds = np.array(all_preds)
    all_labels = np.array(all_labels)
    
    avg_loss = total_loss / total_samples if total_samples > 0 else 0.0
    acc = accuracy(all_preds, all_labels)
    f1_val = f1(all_preds, all_labels)
    
    return {
        "loss": avg_loss,
        "accuracy": acc,
        "f1": f1_val,
        "num_samples": total_samples,
    }


def attack_success_rate(
    model: nn.Module,
    triggered_test_loader: DataLoader,
    target_label: int,
    device: torch.device = torch.device("cpu"),
) -> float:
    """
    Compute Attack Success Rate (ASR) for backdoor attacks.
    ASR = fraction of triggered samples classified as target_label.
    """
    model.to(device)
    model.eval()
    
    correct = 0
    total = 0
    
    with torch.no_grad():
        for data, target in triggered_test_loader:
            data = data.to(device)
            output = model(data)
            preds = output.argmax(dim=1).cpu().numpy()
            
            correct += np.sum(preds == target_label)
            total += len(preds)
    
    return float(correct / total) if total > 0 else 0.0


def track_epsilon(privacy_engine, delta: float = 1e-5) -> Optional[float]:
    """
    Get current privacy budget (epsilon) from Opacus PrivacyEngine.
    """
    if privacy_engine is None:
        return None
    try:
        return privacy_engine.get_epsilon(delta)
    except Exception:
        return None


def recovery_time(
    events_log: List[Dict],
    accuracy_history: List[float],
    baseline_accuracy: float,
    recovery_threshold: float = 0.02,
) -> Optional[int]:
    """
    Calculate rounds elapsed between rollback event and accuracy recovery.
    """
    rollback_rounds = [
        e["round"] for e in events_log
        if e.get("event_type") == "rollback_triggered"
    ]
    
    if not rollback_rounds:
        return None
    
    last_rollback_round = max(rollback_rounds)
    target_acc = baseline_accuracy - recovery_threshold
    
    for i in range(last_rollback_round, len(accuracy_history)):
        if accuracy_history[i] >= target_acc:
            return i - last_rollback_round
    
    return None


def compute_all_metrics(
    model: nn.Module,
    test_loader: DataLoader,
    triggered_test_loader: Optional[DataLoader] = None,
    target_label: Optional[int] = None,
    device: torch.device = torch.device("cpu"),
) -> Dict[str, float]:
    """
    Compute all evaluation metrics in one call.
    """
    metrics = evaluate_model(model, test_loader, device)
    
    if triggered_test_loader is not None and target_label is not None:
        metrics["asr"] = attack_success_rate(
            model, triggered_test_loader, target_label, device
        )
    else:
        metrics["asr"] = 0.0
    
    return metrics


if __name__ == "__main__":
    print("=" * 60)
    print("SMOKE TEST: metrics.py")
    print("=" * 60)
    
    # Test accuracy and F1
    preds = np.array([0, 1, 2, 0, 1, 2])
    labels = np.array([0, 1, 2, 0, 1, 1])
    
    acc = accuracy(preds, labels)
    f1_val = f1(preds, labels)
    print(f"Accuracy: {acc:.4f}, F1: {f1_val:.4f}")
    assert 0 <= acc <= 1
    assert 0 <= f1_val <= 1
    
    # Test evaluate_model with dummy model
    print("\n[2] evaluate_model...")
    class DummyModel(nn.Module):
        def __init__(self):
            super().__init__()
            self.fc = nn.Linear(10, 3)
        def forward(self, x):
            return self.fc(x)
    
    model = DummyModel()
    dummy_data = torch.randn(16, 10)
    dummy_labels = torch.randint(0, 3, (16,))
    dummy_dataset = torch.utils.data.TensorDataset(dummy_data, dummy_labels)
    dummy_loader = DataLoader(dummy_dataset, batch_size=4)
    
    result = evaluate_model(model, dummy_loader)
    print(f"  {result}")
    assert "accuracy" in result
    assert "f1" in result
    
    # Test recovery_time
    print("\n[3] recovery_time...")
    events = [
        {"round": 5, "event_type": "rollback_triggered"},
    ]
    acc_hist = [0.80, 0.82, 0.81, 0.83, 0.84, 0.60, 0.65, 0.70, 0.82, 0.83]
    rt = recovery_time(events, acc_hist, baseline_accuracy=0.82)
    print(f"  Recovery time: {rt} rounds")
    assert rt == 3, f"Expected 3, got {rt}"
    
    print("\nAll metrics smoke tests passed!")
