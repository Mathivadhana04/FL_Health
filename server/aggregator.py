"""
Robust aggregation strategies for federated learning.
Extends Flower's FedAvg with Byzantine-resilient methods:
- Coordinate-wise Median
- Trimmed Mean
- Cosine-similarity-based filtering
"""

from typing import List, Tuple, Dict, Optional
import numpy as np

from server.similarity import flatten_update, cosine_similarity


class FedAvgAggregator:
    """Baseline FedAvg aggregation with logging."""
    
    def __init__(self):
        self.round_log: List[Dict] = []
    
    def aggregate(self, weights_list: List[List[np.ndarray]], client_ids: List[int]) -> List[np.ndarray]:
        """Standard FedAvg: element-wise mean."""
        num_layers = len(weights_list[0])
        aggregated = []
        for layer_idx in range(num_layers):
            layer_stack = np.stack([w[layer_idx] for w in weights_list], axis=0)
            aggregated.append(np.mean(layer_stack, axis=0))
        
        self.round_log.append({
            "method": "fedavg",
            "participating_clients": client_ids,
            "excluded_clients": [],
            "num_clients": len(weights_list),
        })
        return aggregated


class MedianAggregator:
    """Coordinate-wise median aggregation."""
    
    def __init__(self):
        self.round_log: List[Dict] = []
    
    def aggregate(self, weights_list: List[List[np.ndarray]], client_ids: List[int]) -> List[np.ndarray]:
        """Coordinate-wise median across all client weights."""
        num_layers = len(weights_list[0])
        median_weights = []
        for layer_idx in range(num_layers):
            layer_stack = np.stack([w[layer_idx] for w in weights_list], axis=0)
            median_layer = np.median(layer_stack, axis=0)
            median_weights.append(median_layer)
        
        self.round_log.append({
            "method": "median",
            "participating_clients": client_ids,
            "excluded_clients": [],
            "num_clients": len(weights_list),
        })
        return median_weights


class TrimmedMeanAggregator:
    """Trimmed mean: remove beta fraction of extremes before averaging."""
    
    def __init__(self, trim_fraction: float = 0.2):
        self.trim_fraction = trim_fraction
        self.round_log: List[Dict] = []
    
    def aggregate(self, weights_list: List[List[np.ndarray]], client_ids: List[int]) -> List[np.ndarray]:
        """Trimmed mean across all client weights."""
        num_layers = len(weights_list[0])
        trimmed_weights = []
        for layer_idx in range(num_layers):
            layer_stack = np.stack([w[layer_idx] for w in weights_list], axis=0)
            n_clients = layer_stack.shape[0]
            
            # Use rounding to find correct trim size
            n_trim = int(np.round(n_clients * self.trim_fraction))
            
            # Allow trimming down to at least 1 remaining client
            if n_trim == 0 or n_clients <= 2 * n_trim:
                trimmed_layer = np.mean(layer_stack, axis=0)
            else:
                sorted_stack = np.sort(layer_stack, axis=0)
                trimmed_stack = sorted_stack[n_trim:n_clients - n_trim]
                trimmed_layer = np.mean(trimmed_stack, axis=0)
            
            trimmed_weights.append(trimmed_layer)
        
        self.round_log.append({
            "method": "trimmed_mean",
            "participating_clients": client_ids,
            "excluded_clients": [],
            "num_clients": len(weights_list),
            "trim_fraction": self.trim_fraction,
        })
        return trimmed_weights


class CosineFilterAggregator:
    """Filter by cosine similarity to median, then average."""
    
    def __init__(self, similarity_threshold: float = 0.5, min_clients: int = 2):
        self.similarity_threshold = similarity_threshold
        self.min_clients = min_clients
        self.round_log: List[Dict] = []
    
    def aggregate(self, weights_list: List[List[np.ndarray]], client_ids: List[int]) -> List[np.ndarray]:
        """Filter outliers by cosine similarity to median, then mean."""
        # Flatten updates for similarity computation
        flattened = []
        for weights in weights_list:
            flat = flatten_update({f"layer_{i}": w for i, w in enumerate(weights)})
            flattened.append(flat)
        
        # Use median update as reference to prevent outlier hijack
        median_update = np.median(flattened, axis=0)
        
        # Filter by cosine similarity
        filtered_weights = []
        filtered_ids = []
        excluded_ids = []
        
        for cid, flat_update, weights in zip(client_ids, flattened, weights_list):
            sim = cosine_similarity(flat_update, median_update)
            if sim >= self.similarity_threshold:
                filtered_weights.append(weights)
                filtered_ids.append(cid)
            else:
                excluded_ids.append(cid)
        
        # Ensure minimum clients
        if len(filtered_weights) < self.min_clients and len(weights_list) >= self.min_clients:
            similarities = [cosine_similarity(f, median_update) for f in flattened]
            sorted_indices = np.argsort(similarities)[::-1]
            filtered_weights = [weights_list[i] for i in sorted_indices[:self.min_clients]]
            filtered_ids = [client_ids[i] for i in sorted_indices[:self.min_clients]]
            excluded_ids = [cid for cid in client_ids if cid not in filtered_ids]
        
        # Compute mean of filtered
        num_layers = len(filtered_weights[0])
        aggregated = []
        for layer_idx in range(num_layers):
            layer_stack = np.stack([w[layer_idx] for w in filtered_weights], axis=0)
            aggregated.append(np.mean(layer_stack, axis=0))
        
        self.round_log.append({
            "method": "cosine_filter",
            "participating_clients": filtered_ids,
            "excluded_clients": excluded_ids,
            "num_clients": len(weights_list),
            "num_filtered": len(filtered_weights),
            "similarity_threshold": self.similarity_threshold,
        })
        return aggregated


def get_aggregator(method: str, **kwargs):
    """Factory function to get aggregator by name."""
    method = method.lower()
    if method == "fedavg":
        return FedAvgAggregator()
    elif method == "median":
        return MedianAggregator()
    elif method == "trimmed_mean":
        return TrimmedMeanAggregator(trim_fraction=kwargs.get("trim_fraction", 0.2))
    elif method == "cosine_filter":
        return CosineFilterAggregator(
            similarity_threshold=kwargs.get("similarity_threshold", 0.5),
            min_clients=kwargs.get("min_clients", 2),
        )
    else:
        raise ValueError(f"Unknown aggregation method: {method}")
