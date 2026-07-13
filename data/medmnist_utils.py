"""
MedMNIST dataset management and partitioning utilities.
Provides Dirichlet non-IID splitting of dataset among clients.
Includes a synthetic data generator fallback for offline demo safety.
Supports custom dataset slicing (e.g. limiting a client to 10 or 15 samples).
"""

import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader, Subset
from typing import Dict, List, Optional


class SyntheticMedicalDataset(Dataset):
    """
    Simulated 28x28 medical image dataset representing PathMNIST (3 channels, 9 classes).
    Automatically generated to guarantee offline compatibility and immediate startup.
    """
    def __init__(self, n_samples: int = 1000, num_classes: int = 9, channels: int = 3):
        self.n_samples = n_samples
        self.num_classes = num_classes
        self.channels = channels
        
        # Generate random images (normalized between 0 and 1)
        self.data = np.random.rand(n_samples, channels, 28, 28).astype(np.float32)
        
        # Generate class labels (0 to num_classes - 1)
        # Add some structure: assign label based on pixel mean to simulate correlation
        pixel_means = np.mean(self.data, axis=(1, 2, 3))
        sorted_indices = np.argsort(pixel_means)
        
        self.labels = np.zeros(n_samples, dtype=np.int64)
        chunk_size = n_samples // num_classes
        for c in range(num_classes):
            start_idx = c * chunk_size
            end_idx = (c + 1) * chunk_size if c < num_classes - 1 else n_samples
            self.labels[sorted_indices[start_idx:end_idx]] = c

    def __len__(self) -> int:
        return self.n_samples

    def __getitem__(self, idx: int) -> tuple:
        img = torch.tensor(self.data[idx])
        label = torch.tensor(self.labels[idx], dtype=torch.long)
        return img, label


class ClientDatasetManager:
    """
    Manages and partitions datasets among multiple simulated hospital clients.
    Supports Dirichlet distribution splitting and dynamic sample count limiting.
    """
    def __init__(
        self,
        dataset_name: str = "pathmnist",
        num_clients: int = 10,
        non_iid: bool = True,
        alpha: float = 0.5,
        batch_size: int = 32,
    ):
        self.dataset_name = dataset_name
        self.num_clients = num_clients
        self.non_iid = non_iid
        self.alpha = alpha
        self.batch_size = batch_size
        
        # Set dataset characteristics based on standard PathMNIST
        self.n_channels = 3
        self.num_classes = 9
        
        print(f"Initializing dataset manager for {dataset_name} ({num_clients} clients)...")
        
        # In a real setup, we would try to load from MedMNIST. 
        # Here we use the synthetic generator to ensure offline correctness and instant speed.
        self.full_train_dataset = SyntheticMedicalDataset(n_samples=2000, num_classes=self.num_classes, channels=self.n_channels)
        self.full_test_dataset = SyntheticMedicalDataset(n_samples=500, num_classes=self.num_classes, channels=self.n_channels)
        
        # Map to store client subsets
        self.client_datasets: Dict[int, Dataset] = {}
        self.client_sizes: Dict[int, int] = {}  # Dynamic sample limits
        
        self._partition_dataset()

    def _partition_dataset(self):
        """Partition train dataset among clients using Dirichlet or IID distribution."""
        n_samples = len(self.full_train_dataset)
        labels = np.array(self.full_train_dataset.labels)
        
        if not self.non_iid:
            # IID split
            indices = np.random.permutation(n_samples)
            client_splits = np.array_split(indices, self.num_clients)
            for cid in range(self.num_clients):
                self.client_datasets[cid] = Subset(self.full_train_dataset, client_splits[cid].tolist())
                self.client_sizes[cid] = len(self.client_datasets[cid])
        else:
            # Dirichlet non-IID split
            min_size = 0
            while min_size < 10:  # Ensure every client has at least 10 samples
                client_idx = [[] for _ in range(self.num_clients)]
                for k in range(self.num_classes):
                    idx_k = np.where(labels == k)[0]
                    np.random.shuffle(idx_k)
                    proportions = np.random.dirichlet(np.repeat(self.alpha, self.num_clients))
                    proportions = np.array([p * (len(idx_j) < n_samples / self.num_clients) for p, idx_j in zip(proportions, client_idx)])
                    proportions = proportions / proportions.sum()
                    proportions = (np.cumsum(proportions) * len(idx_k)).astype(int)[:-1]
                    idx_split = np.split(idx_k, proportions)
                    for cid in range(self.num_clients):
                        client_idx[cid].extend(idx_split[cid])
                
                min_size = min([len(idx) for idx in client_idx])
            
            for cid in range(self.num_clients):
                np.random.shuffle(client_idx[cid])
                self.client_datasets[cid] = Subset(self.full_train_dataset, client_idx[cid])
                self.client_sizes[cid] = len(self.client_datasets[cid])

    def set_client_size(self, client_id: int, size: int):
        """Limit the client dataset to a custom number of samples (e.g. 10 or 15)."""
        if client_id in self.client_datasets:
            max_available = len(self.client_datasets[client_id].indices) if isinstance(self.client_datasets[client_id], Subset) else len(self.client_datasets[client_id])
            self.client_sizes[client_id] = min(size, max_available)
            print(f"Set client {client_id} dataset size limit to {self.client_sizes[client_id]} (Requested: {size})")

    def get_train_loader(self, client_id: int) -> DataLoader:
        """Get train DataLoader for a client, obeying custom size limits."""
        dataset = self.client_datasets[client_id]
        limit = self.client_sizes.get(client_id, len(dataset))
        
        # Extract indices if it's a Subset
        if isinstance(dataset, Subset):
            sub_indices = dataset.indices[:limit]
            sliced_dataset = Subset(self.full_train_dataset, sub_indices)
        else:
            sliced_dataset = Subset(dataset, list(range(limit)))
            
        return DataLoader(sliced_dataset, batch_size=self.batch_size, shuffle=True)

    def get_test_loader(self) -> DataLoader:
        """Get loader for standard test set."""
        return DataLoader(self.full_test_dataset, batch_size=self.batch_size, shuffle=False)


def get_client_dataloader(dataset: Dataset, batch_size: int = 32) -> DataLoader:
    """Helper factory for client dataloaders (used in attacks)."""
    return DataLoader(dataset, batch_size=batch_size, shuffle=True)


if __name__ == "__main__":
    print("=" * 60)
    print("SMOKE TEST: medmnist_utils.py")
    print("=" * 60)
    
    manager = ClientDatasetManager(num_clients=5, non_iid=True, alpha=0.5)
    print(f"Client 0 raw size: {len(manager.client_datasets[0])}")
    
    # Custom size test
    manager.set_client_size(0, 10)
    loader = manager.get_train_loader(0)
    print(f"Client 0 train loader size: {len(loader.dataset)}")
    assert len(loader.dataset) == 10
    
    manager.set_client_size(1, 15)
    loader_1 = manager.get_train_loader(1)
    print(f"Client 1 train loader size: {len(loader_1.dataset)}")
    assert len(loader_1.dataset) == 15
    
    print("\n✅ Dataset manager smoke test passed!")
