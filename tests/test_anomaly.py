"""
Unit tests for anomaly detection.
"""

import numpy as np
import pytest
import sys
import os
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from server.anomaly import score_update, flag_anomalies
from server.reputation import ReputationTracker


def test_clean_update_not_flagged():
    """A normal update should not be flagged as anomalous."""
    np.random.seed(42)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        rt = ReputationTracker(num_clients=3, log_path=os.path.join(tmpdir, "rep.csv"))
        
        # All clients have similar updates
        updates = {
            0: np.random.randn(100) * 0.1 + 0.5,
            1: np.random.randn(100) * 0.1 + 0.5,
            2: np.random.randn(100) * 0.1 + 0.52,
        }
        global_update = np.mean(list(updates.values()), axis=0)
        
        flagged = flag_anomalies(updates, global_update, rt, percentile=90.0)
        
        # With high percentile, no one should be flagged
        assert len(flagged) == 0, f"Clean updates flagged: {flagged}"


def test_poisoned_update_flagged():
    """A clearly poisoned update should be flagged."""
    np.random.seed(42)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        rt = ReputationTracker(num_clients=4, log_path=os.path.join(tmpdir, "rep.csv"))
        
        updates = {
            0: np.random.randn(100) * 0.1 + 0.5,
            1: np.random.randn(100) * 0.1 + 0.5,
            2: np.random.randn(100) * 0.1 + 0.5,
            3: np.random.randn(100) * 5.0 - 10.0,  # Clear outlier
        }
        global_update = np.mean(list(updates.values()), axis=0)
        
        flagged = flag_anomalies(updates, global_update, rt, percentile=75.0, z_score_threshold=2.0)
        
        assert 3 in flagged, f"Outlier not flagged: {flagged}"


def test_reputation_affects_scoring():
    """Low reputation should increase anomaly score."""
    np.random.seed(42)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        rt = ReputationTracker(num_clients=2, log_path=os.path.join(tmpdir, "rep.csv"))
        rt.penalize(0, severity=3.0)  # Make client 0 very low reputation
        
        updates = {
            0: np.random.randn(100) * 0.1 + 0.5,
            1: np.random.randn(100) * 0.1 + 0.5,
        }
        global_update = np.mean(list(updates.values()), axis=0)
        
        score_0, _, _ = score_update(updates[0], global_update, rt.get_score(0))
        score_1, _, _ = score_update(updates[1], global_update, rt.get_score(1))
        
        assert score_0 > score_1, "Low reputation should increase anomaly score"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])