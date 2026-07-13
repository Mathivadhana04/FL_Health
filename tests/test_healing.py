"""
Unit tests for ASFA healing controller.
"""

import pytest
import sys
import os
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import torch
import torch.nn as nn
from server.healing import HealingController


def test_checkpoint_save_load():
    """Checkpoint should save and restore model state."""
    with tempfile.TemporaryDirectory() as tmpdir:
        cp_dir = os.path.join(tmpdir, "checkpoints")
        res_dir = os.path.join(tmpdir, "results")
        
        hc = HealingController(checkpoint_dir=cp_dir, results_dir=res_dir)
        
        model = nn.Linear(10, 2)
        model.weight.data.fill_(1.0)
        
        hc.checkpoint(1, model, 0.85)
        
        # Modify model
        model.weight.data.fill_(2.0)
        
        # Rollback
        success, rnd, acc = hc.rollback(model)
        
        assert success, "Rollback should succeed"
        assert rnd == 1, "Should restore round 1"
        assert model.weight.data[0, 0].item() == 1.0, "Model should be restored"


def test_quarantine_exclusion():
    """Quarantined clients should be excluded for correct duration."""
    with tempfile.TemporaryDirectory() as tmpdir:
        hc = HealingController(
            checkpoint_dir=os.path.join(tmpdir, "cp"),
            results_dir=os.path.join(tmpdir, "res"),
            quarantine_rounds=3,
        )
        
        hc.quarantine(5)
        assert hc.is_quarantined(5), "Should be quarantined immediately"
        
        hc.decay_quarantine()
        assert hc.is_quarantined(5), "Should still be quarantined after 1 round"
        
        hc.decay_quarantine()
        hc.decay_quarantine()
        assert not hc.is_quarantined(5), "Should be free after 3 rounds"


def test_rollback_detection():
    """Rollback should trigger on sharp accuracy drop."""
    with tempfile.TemporaryDirectory() as tmpdir:
        hc = HealingController(
            checkpoint_dir=os.path.join(tmpdir, "cp"),
            results_dir=os.path.join(tmpdir, "res"),
            rollback_drop_threshold=0.1,
        )
        
        hc.val_acc_history = [0.85]
        
        # Small drop - no rollback
        assert not hc.detect_and_trigger_rollback(0.80)
        
        # Large drop - rollback
        assert hc.detect_and_trigger_rollback(0.70)
        assert hc.rollback_triggered


def test_rollback_restores_correct_checkpoint():
    """Rollback should restore the best checkpoint, not just the latest."""
    with tempfile.TemporaryDirectory() as tmpdir:
        cp_dir = os.path.join(tmpdir, "cp")
        res_dir = os.path.join(tmpdir, "res")
        
        hc = HealingController(checkpoint_dir=cp_dir, results_dir=res_dir)
        
        model1 = nn.Linear(10, 2)
        model1.weight.data.fill_(1.0)
        hc.checkpoint(1, model1, 0.80)
        
        model2 = nn.Linear(10, 2)
        model2.weight.data.fill_(2.0)
        hc.checkpoint(2, model2, 0.90)  # Better checkpoint
        
        model3 = nn.Linear(10, 2)
        model3.weight.data.fill_(3.0)
        hc.checkpoint(3, model3, 0.85)
        
        # Rollback should restore model2 (best accuracy 0.90)
        model_test = nn.Linear(10, 2)
        model_test.weight.data.fill_(0.0)
        
        success, rnd, acc = hc.rollback(model_test)
        
        assert success
        assert acc == 0.90, "Should restore best checkpoint"
        assert rnd == 2, "Should restore round 2"
        assert model_test.weight.data[0, 0].item() == 2.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])