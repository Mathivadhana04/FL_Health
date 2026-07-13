"""
Cosine similarity utilities for comparing client model updates.
Used for outlier detection in robust aggregation and ASFA anomaly detection.
"""

import numpy as np
from typing import List


def flatten_update(state_dict: dict) -> np.ndarray:
    """
    Flatten a model state dict (or parameter update) into a 1D numpy array.
    """
    return np.concatenate([v.flatten() for v in state_dict.values()])


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """
    Compute cosine similarity between two vectors.
    """
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def cosine_similarity_matrix(updates: List[np.ndarray]) -> np.ndarray:
    """
    Compute pairwise cosine similarity matrix for a list of flattened updates.
    """
    n = len(updates)
    sim_matrix = np.eye(n)
    for i in range(n):
        for j in range(i + 1, n):
            sim = cosine_similarity(updates[i], updates[j])
            sim_matrix[i, j] = sim
            sim_matrix[j, i] = sim
    return sim_matrix


def pairwise_distance_to_median(updates: List[np.ndarray]) -> np.ndarray:
    """
    Compute each client's L2 distance to the coordinate-wise median of all updates.
    """
    stacked = np.stack(updates, axis=0)
    median = np.median(stacked, axis=0)
    distances = np.array([np.linalg.norm(u - median) for u in updates])
    return distances


def compute_aggregate_update(updates: List[np.ndarray], method: str = "mean") -> np.ndarray:
    """
    Compute aggregate update from list of client updates.
    """
    stacked = np.stack(updates, axis=0)
    if method == "mean":
        return np.mean(stacked, axis=0)
    elif method == "median":
        return np.median(stacked, axis=0)
    else:
        raise ValueError(f"Unknown aggregation method: {method}")


if __name__ == "__main__":
    print("=" * 60)
    print("SMOKE TEST: similarity.py")
    print("=" * 60)
    
    np.random.seed(42)
    updates = [
        np.random.randn(100) + 1.0,
        np.random.randn(100) + 1.1,
        np.random.randn(100) + 0.9,
        np.random.randn(100) - 5.0,
    ]
    
    print("\n[1] Flatten update...")
    state_dict = {"w1": np.ones((3, 3)), "b1": np.zeros(3)}
    flat = flatten_update(state_dict)
    print(f"  Flattened shape: {flat.shape}")
    assert flat.shape == (12,)
    
    print("\n[2] Cosine similarity...")
    sim = cosine_similarity(updates[0], updates[1])
    print(f"  Similar (cluster): {sim:.4f}")
    assert sim > 0.8
    sim_outlier = cosine_similarity(updates[0], updates[3])
    print(f"  Dissimilar (outlier): {sim_outlier:.4f}")
    assert sim_outlier < 0.5
    
    print("\n[3] Similarity matrix...")
    sim_matrix = cosine_similarity_matrix(updates)
    print(f"  Matrix shape: {sim_matrix.shape}")
    assert sim_matrix.shape == (4, 4)
    assert np.allclose(sim_matrix, sim_matrix.T)
    
    print("\n[4] Distance to median...")
    distances = pairwise_distance_to_median(updates)
    print(f"  Distances: {distances}")
    assert distances[3] > distances[0]
    
    print("\nAll similarity smoke tests passed!")
