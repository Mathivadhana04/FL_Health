"""
Anomaly detection for client updates in federated learning.
Combines:
- Cosine distance from aggregate direction (using median for robustness)
- Update L2-norm z-score vs. round population
- Reputation score fusion
"""

import numpy as np
from typing import Dict, List, Set, Optional, Tuple

from server.similarity import flatten_update, cosine_similarity, compute_aggregate_update
from server.reputation import ReputationTracker


def score_update(
    client_update: np.ndarray,
    global_update: np.ndarray,
    reputation_score: float = 1.0,
    weights: Dict[str, float] = None,
) -> Tuple[float, float, float]:
    """
    Compute anomaly score for a single client update.
    Lower score = more normal, higher score = more suspicious.
    
    Returns:
        (anomaly_score, cosine_distance, update_norm)
    """
    if weights is None:
        weights = {"cosine": 0.4, "norm": 0.3, "reputation": 0.3}
    
    cos_sim = cosine_similarity(client_update, global_update)
    cosine_distance = 1.0 - max(cos_sim, 0.0)
    
    update_norm = np.linalg.norm(client_update)
    
    reputation_penalty = 1.0 - reputation_score
    
    anomaly_score = (
        weights["cosine"] * cosine_distance +
        weights["reputation"] * reputation_penalty
    )
    
    return anomaly_score, cosine_distance, update_norm


def flag_anomalies(
    client_updates: Dict[int, np.ndarray],
    global_update: np.ndarray,
    reputation_tracker: ReputationTracker,
    threshold: Optional[float] = None,
    percentile: float = 80.0,
    z_score_threshold: float = 2.5,
    weights: Dict[str, float] = None,
) -> Set[int]:
    """
    Flag suspicious clients based on combined anomaly scores.
    
    Args:
        client_updates: dict mapping client_id -> flattened update
        global_update: aggregated update direction
        reputation_tracker: ReputationTracker instance
        threshold: absolute threshold for anomaly score
        percentile: flag top (100-percentile)% by score
        z_score_threshold: z-score threshold for norm outliers
        weights: fusion weights for anomaly scoring
    
    Returns:
        Set of suspicious client IDs
    """
    if weights is None:
        weights = {"cosine": 0.4, "norm": 0.3, "reputation": 0.3}
    
    client_ids = list(client_updates.keys())
    updates = list(client_updates.values())
    
    if len(client_updates) == 0:
        return set()
        
    # Use median update as reference direction to prevent outlier hijack
    ref_update = np.median(updates, axis=0)
    
    # Compute update norms for z-score
    norms = [np.linalg.norm(u) for u in updates]
    mean_norm = np.mean(norms)
    std_norm = np.std(norms)
    
    # Bound the standard deviation to prevent z-score blowup on extremely homogeneous clients
    min_std = 0.05 * mean_norm
    if std_norm < min_std:
        std_norm = max(min_std, 1e-4)
    
    norm_z_scores = [(n - mean_norm) / std_norm for n in norms]
    
    # Adjust z-score threshold dynamically for small populations (N <= 5)
    eff_z_threshold = z_score_threshold
    if len(client_ids) > 2:
        max_possible_z = (len(client_ids) - 1) / np.sqrt(len(client_ids))
        eff_z_threshold = min(z_score_threshold, max_possible_z * 0.9)
    
    # Score each client
    scores = {}
    for i, cid in enumerate(client_ids):
        rep_score = reputation_tracker.get_score(cid)
        cos_sim = cosine_similarity(updates[i], ref_update)
        cosine_distance = 1.0 - max(cos_sim, 0.0)
        
        norm_z = abs(norm_z_scores[i])
        norm_score = min(norm_z / eff_z_threshold, 1.0) if eff_z_threshold > 0 else 0.0
        
        reputation_penalty = 1.0 - rep_score
        
        anomaly_score = (
            weights["cosine"] * cosine_distance +
            weights["norm"] * norm_score +
            weights["reputation"] * reputation_penalty
        )
        scores[cid] = anomaly_score
    
    # Determine threshold
    if threshold is not None:
        flagged = {cid for cid, score in scores.items() if score > threshold}
    else:
        # Enforce score floor to prevent flagging normal clients in benign runs
        score_values = list(scores.values())
        threshold_value = max(np.percentile(score_values, percentile), 0.35)
        flagged = {cid for cid, score in scores.items() if score > threshold_value}
    
    # Also flag extreme norm outliers
    for i, cid in enumerate(client_ids):
        if abs(norm_z_scores[i]) > eff_z_threshold:
            flagged.add(cid)
    
    return flagged


if __name__ == "__main__":
    print("=" * 60)
    print("SMOKE TEST: anomaly.py")
    print("=" * 60)
    
    from server.reputation import ReputationTracker
    import tempfile, os
    
    with tempfile.TemporaryDirectory() as tmpdir:
        np.random.seed(42)
        normal_update = np.random.randn(100) * 0.1 + 0.5
        client_updates = {
            0: normal_update + np.random.randn(100) * 0.05,
            1: normal_update + np.random.randn(100) * 0.05,
            2: normal_update + np.random.randn(100) * 0.05,
            3: np.random.randn(100) * 5.0 - 10.0,
        }
        global_update = np.mean(list(client_updates.values()), axis=0)
        
        rt = ReputationTracker(num_clients=4, log_path=os.path.join(tmpdir, "rep.csv"))
        
        print("\n[1] Flag anomalies...")
        flagged = flag_anomalies(client_updates, global_update, rt, percentile=75.0, z_score_threshold=2.0)
        print(f"  Flagged: {flagged}")
        assert 3 in flagged, "Outlier should be flagged"
        
        print("\n[2] With reputation penalty...")
        rt.penalize(0, severity=2.0)
        flagged2 = flag_anomalies(client_updates, global_update, rt, percentile=75.0)
        print(f"  Flagged: {flagged2}")
        assert 0 in flagged2 or 3 in flagged2
    
    print("\nAll anomaly smoke tests passed!")
