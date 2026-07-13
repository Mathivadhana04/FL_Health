"""
Unit tests for robust aggregation strategies.
"""

import numpy as np
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from server.aggregator import FedAvgAggregator, MedianAggregator, TrimmedMeanAggregator, CosineFilterAggregator


def test_fedavg_basic():
    """Test basic FedAvg correctness."""
    agg = FedAvgAggregator()
    w1 = [np.ones((3, 3)), np.zeros(3)]
    w2 = [np.ones((3, 3)) * 3, np.ones(3) * 2]
    
    result = agg.aggregate([w1, w2], [0, 1])
    
    assert np.allclose(result[0], np.ones((3, 3)) * 2)  # Mean of 1 and 3
    assert np.allclose(result[1], np.ones(3))  # Mean of 0 and 2


def test_median_ignores_outlier():
    """Test that coordinate-wise median ignores extreme outliers."""
    agg = MedianAggregator()
    w1 = [np.ones((3, 3)), np.zeros(3)]
    w2 = [np.ones((3, 3)) * 1.1, np.zeros(3)]
    w3 = [np.ones((3, 3)) * (-100), np.ones(3) * 50]  # Extreme outlier
    
    result = agg.aggregate([w1, w2, w3], [0, 1, 2])
    
    # Median should be close to w1/w2, not the outlier
    assert result[0][0, 0] > 0, "Median should ignore negative outlier"
    assert result[0][0, 0] < 2, "Median should be near 1.0"
    assert result[1][0] < 1, "Median of [0, 0, 50] should be 0"


def test_trimmed_mean_ignores_extremes():
    """Test that trimmed mean removes extreme values."""
    agg = TrimmedMeanAggregator(trim_fraction=0.3)
    w1 = [np.ones((3, 3)), np.zeros(3)]
    w2 = [np.ones((3, 3)) * 1.1, np.zeros(3)]
    w3 = [np.ones((3, 3)) * (-100), np.ones(3) * 50]
    
    result = agg.aggregate([w1, w2, w3], [0, 1, 2])
    
    # Trimmed mean with beta=0.3 removes 1 from each end (3*0.3=0.9->1)
    # So w3 is trimmed, result should be mean of w1 and w2
    assert result[0][0, 0] > 0, "Trimmed mean should ignore outlier"
    assert np.abs(result[0][0, 0] - 1.05) < 0.1, "Should be near mean of w1 and w2"


def test_cosine_filter_excludes_dissimilar():
    """Test that cosine filter excludes dissimilar updates."""
    agg = CosineFilterAggregator(similarity_threshold=0.5, min_clients=2)
    
    # Three similar updates and one completely different
    w1 = [np.ones(10), np.zeros(5)]
    w2 = [np.ones(10) * 1.1, np.zeros(5)]
    w3 = [np.ones(10) * 0.9, np.zeros(5)]
    w4 = [np.ones(10) * (-10), np.ones(5)]  # Opposite direction
    
    result = agg.aggregate([w1, w2, w3, w4], [0, 1, 2, 3])
    
    # Result should be influenced by w1, w2, w3 not w4
    assert result[0][0] > 0, "Filtered mean should not include negative outlier"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])