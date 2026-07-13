"""
Attack implementations for federated learning experiments:
- Label-flipping attack
- Backdoor trigger attack  
- Model poisoning (Byzantine) attack

Also provides a registry/factory for assigning attacks to clients.
"""

import random
from typing import Dict, List, Tuple, Optional, Callable
import numpy as np
import torch
from torch.utils.data import Dataset, Subset


def label_flip_attack(
    dataset: Dataset,
    flip_fraction: float = 0.3,
    source_label: int = 0,
    target_label: int = 1,
    seed: int = 42,
) -> Subset:
    """
    Create a poisoned dataset where a fraction of source_label samples
    are flipped to target_label.
    
    Args:
        dataset: Original dataset
        flip_fraction: fraction of source_label samples to flip
        source_label: original label to flip from
        target_label: label to flip to
        seed: random seed
    
    Returns:
        Subset with flipped labels (indices remain the same)
    """
    random.seed(seed)
    np.random.seed(seed)
    
    # Collect indices of source_label
    source_indices = []
    for idx in range(len(dataset)):
        _, label = dataset[idx]
        # Handle tensor/array labels
        if isinstance(label, torch.Tensor):
            label = label.item()
        elif isinstance(label, (list, tuple, np.ndarray)):
            label = label[0] if len(label) > 0 else label
        if int(label) == source_label:
            source_indices.append(idx)
    
    # Select fraction to flip
    num_to_flip = int(len(source_indices) * flip_fraction)
    flip_indices = set(random.sample(source_indices, num_to_flip))
    
    # Create wrapper that flips labels
    class LabelFlipDataset(Dataset):
        def __init__(self, base_dataset, flip_indices, source_label, target_label):
            self.base_dataset = base_dataset
            self.flip_indices = flip_indices
            self.source_label = source_label
            self.target_label = target_label
        
        def __len__(self):
            return len(self.base_dataset)
        
        def __getitem__(self, idx):
            data, label = self.base_dataset[idx]
            if idx in self.flip_indices:
                # Flip the label
                if isinstance(label, torch.Tensor):
                    label = torch.tensor(self.target_label, dtype=label.dtype)
                elif isinstance(label, np.ndarray):
                    label = np.array([self.target_label], dtype=label.dtype)
                else:
                    label = self.target_label
            return data, label
    
    return LabelFlipDataset(dataset, flip_indices, source_label, target_label)


def backdoor_attack(
    dataset: Dataset,
    trigger_pattern: Optional[np.ndarray] = None,
    target_label: int = 0,
    poison_fraction: float = 0.2,
    seed: int = 42,
) -> Subset:
    """
    Create a poisoned dataset with backdoor trigger pattern.
    A fraction of samples have a pixel-patch trigger inserted and
    their label changed to target_label.
    
    Args:
        dataset: Original dataset
        trigger_pattern: NxN binary pattern (default: 3x3 white square at bottom-right)
        target_label: label to assign to poisoned samples
        poison_fraction: fraction of dataset to poison
        seed: random seed
    
    Returns:
        Dataset with triggered samples
    """
    random.seed(seed)
    np.random.seed(seed)
    
    # Determine image shape from first sample
    sample_img, _ = dataset[0]
    if isinstance(sample_img, torch.Tensor):
        c, h, w = sample_img.shape
    else:
        h, w, c = sample_img.shape if len(sample_img.shape) == 3 else (sample_img.shape[0], sample_img.shape[1], 1)
    
    # Default trigger: white 3x3 square at bottom-right corner
    if trigger_pattern is None:
        trigger_size = 3
        trigger_pattern = np.ones((trigger_size, trigger_size))
    
    trigger_h, trigger_w = trigger_pattern.shape
    
    # Place trigger at bottom-right
    start_h = h - trigger_h - 1
    start_w = w - trigger_w - 1
    
    # Select samples to poison
    num_to_poison = int(len(dataset) * poison_fraction)
    poison_indices = set(random.sample(range(len(dataset)), num_to_poison))
    
    class BackdoorDataset(Dataset):
        def __init__(self, base_dataset, poison_indices, trigger, start_h, start_w, target_label):
            self.base_dataset = base_dataset
            self.poison_indices = poison_indices
            self.trigger = trigger
            self.start_h = start_h
            self.start_w = start_w
            self.target_label = target_label
        
        def __len__(self):
            return len(self.base_dataset)
        
        def __getitem__(self, idx):
            data, label = self.base_dataset[idx]
            
            if idx in self.poison_indices:
                # Insert trigger
                if isinstance(data, torch.Tensor):
                    # data shape: (C, H, W)
                    for i in range(self.trigger.shape[0]):
                        for j in range(self.trigger.shape[1]):
                            if self.start_h + i < data.shape[1] and self.start_w + j < data.shape[2]:
                                # Set to high value (white trigger)
                                data[:, self.start_h + i, self.start_w + j] = 1.0
                else:
                    # numpy array
                    for i in range(self.trigger.shape[0]):
                        for j in range(self.trigger.shape[1]):
                            if self.start_h + i < data.shape[0] and self.start_w + j < data.shape[1]:
                                data[self.start_h + i, self.start_w + j] = 1.0
                
                # Change label
                if isinstance(label, torch.Tensor):
                    label = torch.tensor(self.target_label, dtype=label.dtype)
                elif isinstance(label, np.ndarray):
                    label = np.array([self.target_label], dtype=label.dtype)
                else:
                    label = self.target_label
            
            return data, label
    
    return BackdoorDataset(dataset, poison_indices, trigger_pattern, start_h, start_w, target_label)


def model_poisoning_attack(
    client_update: List[np.ndarray],
    scale_factor: float = -1.0,
) -> List[np.ndarray]:
    """
    Byzantine attack: scale or negate the client's model update.
    
    Args:
        client_update: list of numpy arrays (model parameter updates)
        scale_factor: multiplier for updates (negative = direction reversal)
    
    Returns:
        Poisoned model update
    """
    return [param * scale_factor for param in client_update]


# Attack registry
ATTACK_REGISTRY: Dict[str, Callable] = {
    "label_flip": label_flip_attack,
    "backdoor": backdoor_attack,
    "model_poison": model_poisoning_attack,
}


def apply_attack_to_client_data(
    client_dataset: Dataset,
    attack_type: str,
    attack_config: Dict,
) -> Dataset:
    """
    Apply a data-level attack to a client's dataset.
    
    Args:
        client_dataset: the client's local dataset
        attack_type: "label_flip" or "backdoor"
        attack_config: attack-specific parameters
    
    Returns:
        Poisoned dataset
    """
    if attack_type == "label_flip":
        return label_flip_attack(client_dataset, **attack_config)
    elif attack_type == "backdoor":
        return backdoor_attack(client_dataset, **attack_config)
    else:
        raise ValueError(f"Unknown attack type: {attack_type}")


def assign_attackers(
    num_clients: int,
    attacker_fraction: float,
    seed: int = 42,
) -> Dict[int, str]:
    """
    Randomly assign a fraction of clients as attackers.
    
    Args:
        num_clients: total number of clients
        attacker_fraction: fraction of clients to mark as attackers (0.0-1.0)
        seed: random seed
    
    Returns:
        Dict mapping client_id -> attack_type (or empty if benign)
    """
    random.seed(seed)
    np.random.seed(seed)
    
    num_attackers = int(num_clients * attacker_fraction)
    attacker_ids = set(random.sample(range(num_clients), num_attackers))
    
    assignments = {}
    attack_types = ["label_flip", "backdoor"]
    
    for client_id in range(num_clients):
        if client_id in attacker_ids:
            assignments[client_id] = random.choice(attack_types)
        else:
            assignments[client_id] = None
    
    return assignments


if __name__ == "__main__":
    print("=" * 60)
    print("SMOKE TEST: attacks.py")
    print("=" * 60)
    
    # Create dummy dataset
    class DummyDataset(Dataset):
        def __init__(self, n=100):
            self.data = torch.randn(n, 3, 28, 28)
            self.labels = torch.randint(0, 9, (n,))
        
        def __len__(self):
            return len(self.data)
        
        def __getitem__(self, idx):
            return self.data[idx], self.labels[idx]
    
    ds = DummyDataset(100)
    
    # Test label flip
    print("\n[1] Label flip attack...")
    poisoned = label_flip_attack(ds, flip_fraction=0.5, source_label=0, target_label=8)
    original_labels = [int(ds[i][1]) for i in range(100)]
    poisoned_labels = [int(poisoned[i][1]) for i in range(100)]
    flips = sum(1 for o, p in zip(original_labels, poisoned_labels) if o == 0 and p == 8)
    print(f"  Flipped {flips} samples from label 0 to 8")
    assert flips > 0, "No labels were flipped"
    
    # Test backdoor
    print("\n[2] Backdoor attack...")
    triggered = backdoor_attack(ds, target_label=5, poison_fraction=0.3)
    triggered_count = sum(1 for i in range(100) if int(triggered[i][1]) == 5)
    print(f"  {triggered_count} samples have target label 5 (backdoor triggered)")
    assert triggered_count > 0, "No backdoor triggers applied"
    
    # Test model poisoning
    print("\n[3] Model poisoning attack...")
    update = [np.ones((3, 3)), np.zeros((2,))]
    poisoned_update = model_poisoning_attack(update, scale_factor=-2.0)
    print(f"  Original: {update[0][0,0]}, Poisoned: {poisoned_update[0][0,0]}")
    assert poisoned_update[0][0, 0] == -2.0, "Model poisoning failed"
    
    # Test assignment
    print("\n[4] Attacker assignment...")
    assignments = assign_attackers(10, 0.3, seed=42)
    attackers = {k: v for k, v in assignments.items() if v is not None}
    print(f"  Attackers: {attackers}")
    assert len(attackers) == 3, f"Expected 3 attackers, got {len(attackers)}"
    
    print("\n✅ All attack smoke tests passed!")