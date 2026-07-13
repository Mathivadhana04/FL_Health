"""
Unit tests for reputation tracker.
"""

import pytest
import sys
import os
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from server.reputation import ReputationTracker


def test_initial_scores():
    """All clients should start at initial score."""
    with tempfile.TemporaryDirectory() as tmpdir:
        rt = ReputationTracker(num_clients=5, log_path=os.path.join(tmpdir, "rep.csv"))
        for i in range(5):
            assert rt.get_score(i) == 1.0


def test_penalize_decays_score():
    """Penalty should reduce reputation score."""
    with tempfile.TemporaryDirectory() as tmpdir:
        rt = ReputationTracker(num_clients=5, log_path=os.path.join(tmpdir, "rep.csv"))
        rt.penalize(0, severity=1.0)
        
        assert rt.get_score(0) < 1.0
        assert rt.get_score(0) >= 0.1  # Min bound


def test_reward_increases_score():
    """Reward should increase reputation score."""
    with tempfile.TemporaryDirectory() as tmpdir:
        rt = ReputationTracker(num_clients=5, log_path=os.path.join(tmpdir, "rep.csv"))
        rt.penalize(0, severity=1.0)
        old_score = rt.get_score(0)
        
        rt.reward(0)
        new_score = rt.get_score(0)
        
        assert new_score > old_score


def test_score_bounds():
    """Scores should stay within [min_score, max_score]."""
    with tempfile.TemporaryDirectory() as tmpdir:
        rt = ReputationTracker(num_clients=1, min_score=0.1, max_score=1.0, 
                               log_path=os.path.join(tmpdir, "rep.csv"))
        
        # Heavy penalty shouldn't go below min
        for _ in range(10):
            rt.penalize(0, severity=2.0)
        assert rt.get_score(0) >= 0.1
        
        # Heavy reward shouldn't exceed max
        for _ in range(10):
            rt.reward(0)
        assert rt.get_score(0) <= 1.0


def test_weights_softened():
    """Weights should be softened (not binary)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        rt = ReputationTracker(num_clients=2, log_path=os.path.join(tmpdir, "rep.csv"))
        rt.penalize(0, severity=5.0)  # Very low score
        
        w0 = rt.get_weight(0)
        w1 = rt.get_weight(1)
        
        assert w0 < w1, "Lower reputation should have lower weight"
        assert w0 >= 0.1, "Minimum weight should be 0.1"
        assert w1 <= 1.0, "Maximum weight should be 1.0"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])