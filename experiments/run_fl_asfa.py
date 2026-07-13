#!/usr/bin/env python3
"""
ASFA FL experiment: Full stack with DP + robust aggregation + self-healing.
Flagship experiment demonstrating Adaptive Self-Healing Federated Aggregation.
"""

import os
import sys
import argparse
import csv
import time
from datetime import datetime
from typing import Dict, List, Set

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models.cnn_medmnist import get_model
from data.medmnist_utils import ClientDatasetManager
from clients.client import SimpleClient
from clients.attacks import assign_attackers, apply_attack_to_client_data
from server.aggregator import get_aggregator
from server.similarity import flatten_update
from server.reputation import ReputationTracker
from server.anomaly import flag_anomalies
from server.healing import HealingController
from eval.metrics import evaluate_model
from eval.plots import generate_all_plots
from reporting.metrics_reporter import MetricsReporter


def load_config(config_path: str) -> Dict:
    import yaml
    with open(config_path, "r") as f:
        return yaml.safe_load(f)


def run_asfa(config: Dict) -> str:
    """Run ASFA-enabled FL experiment."""
    reporter = MetricsReporter()
    reporter.send_run_start(config)
    
    num_clients = config.get("num_clients", 10)

    num_rounds = config.get("num_rounds", 20)
    local_epochs = config.get("local_epochs", 5)
    batch_size = config.get("batch_size", 32)
    lr = config.get("learning_rate", 0.001)
    device = torch.device(config.get("device", "cpu"))
    dataset_name = config.get("dataset", "pathmnist")
    non_iid = config.get("non_iid", True)
    alpha = config.get("non_iid_alpha", 0.5)
    
    # DP config
    noise_multiplier = config.get("noise_multiplier", 1.0)
    max_grad_norm = config.get("max_grad_norm", 1.0)
    target_epsilon = config.get("target_epsilon", None)
    delta = config.get("delta", 1e-5)
    
    # Attack config
    attacker_fraction = config.get("attacker_fraction", 0.3)
    attack_type = config.get("attack_type", "label_flip")
    
    # ASFA config
    aggregation_method = config.get("aggregation_method", "median")
    quarantine_rounds = config.get("quarantine_rounds", 3)
    rollback_drop_threshold = config.get("rollback_drop_threshold", 0.15)
    anomaly_percentile = config.get("anomaly_percentile", 80.0)
    z_score_threshold = config.get("z_score_threshold", 2.5)
    
    print("=" * 60)
    print("ASFA FEDERATED LEARNING EXPERIMENT")
    print("=" * 60)
    print(f"Clients: {num_clients}, Rounds: {num_rounds}")
    print(f"Aggregation: {aggregation_method}")
    print(f"Attackers: {attacker_fraction * 100:.0f}% ({attack_type})")
    print(f"Quarantine: {quarantine_rounds} rounds, Rollback threshold: {rollback_drop_threshold}")
    print("=" * 60)
    
    # Load data
    data_manager = ClientDatasetManager(
        dataset_name=dataset_name,
        num_clients=num_clients,
        non_iid=non_iid,
        alpha=alpha,
        batch_size=batch_size,
    )
    
    # Assign attackers
    attacker_assignments = assign_attackers(num_clients, attacker_fraction, seed=42)
    print(f"Attacker assignments: {attacker_assignments}")
    
    # Initialize ASFA components
    reputation_tracker = ReputationTracker(
        num_clients=num_clients,
        decay_factor=0.7,
        recovery_rate=0.05,
        log_path="results/reputation_log.csv",
    )
    
    healing_controller = HealingController(
        checkpoint_dir="checkpoints",
        results_dir="results",
        quarantine_rounds=quarantine_rounds,
        rollback_drop_threshold=rollback_drop_threshold,
    )
    
    # Initialize global model
    model_config = {
        "model_type": "cnn",
        "in_channels": data_manager.n_channels,
        "num_classes": data_manager.num_classes,
    }
    global_model = get_model(model_config).to(device)
    
    # Create clients
    clients = []
    client_sizes = config.get("client_sizes", [])
    for cid in range(num_clients):
        if cid < len(client_sizes):
            data_manager.set_client_size(cid, client_sizes[cid])
            
        client_model = get_model(model_config).to(device)
        train_loader = data_manager.get_train_loader(cid)

        
        # Apply attack if this client is an attacker
        if attacker_assignments[cid] is not None and attack_type:
            attack_config = {
                "flip_fraction": 0.5,
                "source_label": 0,
                "target_label": 1,
                "seed": 42 + cid,
            }
            if attacker_assignments[cid] == "backdoor":
                attack_config = {
                    "target_label": 0,
                    "poison_fraction": 0.3,
                    "seed": 42 + cid,
                }
            from data.medmnist_utils import get_client_dataloader
            poisoned_dataset = apply_attack_to_client_data(
                data_manager.client_datasets[cid],
                attacker_assignments[cid],
                attack_config,
            )
            train_loader = get_client_dataloader(poisoned_dataset, batch_size=batch_size)
        
        client = SimpleClient(
            client_id=cid,
            model=client_model,
            train_loader=train_loader,
            val_loader=data_manager.get_test_loader(),
            config={
                "local_epochs": local_epochs,
                "learning_rate": lr,
                "device": str(device),
                "use_dp": True,
                "noise_multiplier": noise_multiplier,
                "max_grad_norm": max_grad_norm,
                "target_epsilon": target_epsilon,
                "delta": delta,
            },
        )
        clients.append(client)
    
    # Aggregator
    aggregator = get_aggregator(
        aggregation_method,
        trim_fraction=config.get("trim_fraction", 0.2),
        similarity_threshold=config.get("similarity_threshold", 0.5),
        min_clients=2,
    )
    
    # Results
    results = []
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_csv = f"results/asfa_{dataset_name}_{timestamp}.csv"
    os.makedirs("results", exist_ok=True)
    
    global_params = [p.detach().cpu().numpy() for p in global_model.parameters()]
    prev_val_acc = None
    
    for round_num in range(1, num_rounds + 1):
        round_start = time.time()
        
        # Decay quarantine counters
        healing_controller.decay_quarantine()
        
        # Get active quarantined clients
        quarantined = healing_controller.get_active_quarantine()
        
        # Client training (skip quarantined)
        client_updates = {}
        client_metrics = []
        epsilon_values = []
        participating_clients = []
        
        for cid, client in enumerate(clients):
            if cid in quarantined:
                continue
            
            updated_params, num_ex, metrics = client.fit(global_params)
            client_updates[cid] = updated_params
            client_metrics.append(metrics)
            participating_clients.append(cid)
            
            if "epsilon" in metrics:
                epsilon_values.append(metrics["epsilon"])
        
        # Cache updates for potential replay
        healing_controller.cache_updates(round_num, client_updates)
        
        # Anomaly detection
        if len(client_updates) > 0:
            # Flatten updates for anomaly detection
            flattened = {}
            for cid, update in client_updates.items():
                flat = flatten_update({"layer_" + str(i): w for i, w in enumerate(update)})
                flattened[cid] = flat
            
            # Compute aggregate direction
            aggregate_flat = np.mean(list(flattened.values()), axis=0)
            
            # Flag anomalies
            suspicious = flag_anomalies(
                flattened,
                aggregate_flat,
                reputation_tracker,
                percentile=anomaly_percentile,
                z_score_threshold=z_score_threshold,
            )
            
            # Quarantine suspicious clients
            for cid in suspicious:
                healing_controller.quarantine(cid, rounds=quarantine_rounds)
                healing_controller.log_event(round_num, "anomaly_flag", {"client_id": cid})
            
            # Update reputation
            reputation_tracker.update_after_round(round_num, list(suspicious), participating_clients)
        else:
            suspicious = set()
        
        # Filter out quarantined + suspicious for aggregation
        clean_updates = []
        clean_ids = []
        for cid, update in client_updates.items():
            if cid not in quarantined and cid not in suspicious:
                clean_updates.append(update)
                clean_ids.append(cid)
        
        # Ensure minimum clients for aggregation
        if len(clean_updates) < 2 and len(client_updates) >= 2:
            # Fall back to including suspicious if too few clean
            clean_updates = list(client_updates.values())
            clean_ids = list(client_updates.keys())
        
        # Aggregate
        if len(clean_updates) > 0:
            aggregated_params = aggregator.aggregate(clean_updates, clean_ids)
        else:
            aggregated_params = global_params  # Keep previous if no updates
        
        # Update global model
        for p, agg_param in zip(global_model.parameters(), aggregated_params):
            p.data = torch.tensor(agg_param).to(device)
        
        global_params = aggregated_params
        
        # Evaluate
        test_loader = data_manager.get_test_loader()
        eval_metrics = evaluate_model(global_model, test_loader, device)
        current_val_acc = eval_metrics["accuracy"]
        
        # Checkpoint
        healing_controller.checkpoint(round_num, global_model, current_val_acc)
        
        # Detect rollback condition
        should_rollback = healing_controller.detect_and_trigger_rollback(
            current_val_acc, prev_val_acc
        )
        
        if should_rollback:
            # Rollback to best checkpoint
            success, restored_round, restored_acc = healing_controller.rollback(global_model)
            if success:
                # Re-aggregate without quarantined/suspicious clients using cached updates
                cached = healing_controller.get_cached_updates(round_num)
                if cached:
                    replay_updates = []
                    replay_ids = []
                    for cid, update in cached.items():
                        if cid not in quarantined and cid not in suspicious:
                            replay_updates.append(update)
                            replay_ids.append(cid)
                    
                    if len(replay_updates) > 0:
                        replayed_params = aggregator.aggregate(replay_updates, replay_ids)
                        for p, rp in zip(global_model.parameters(), replayed_params):
                            p.data = torch.tensor(rp).to(device)
                        global_params = replayed_params
                
                # Re-evaluate after rollback
                eval_metrics = evaluate_model(global_model, test_loader, device)
                current_val_acc = eval_metrics["accuracy"]
                healing_controller.log_event(round_num, "replay_completed", {
                    "restored_round": restored_round,
                    "new_accuracy": current_val_acc,
                })
        
        prev_val_acc = current_val_acc
        
        round_time = time.time() - round_start
        avg_epsilon = np.mean(epsilon_values) if epsilon_values else 0.0
        
        result_row = {
            "round": round_num,
            "accuracy": eval_metrics["accuracy"],
            "loss": eval_metrics["loss"],
            "f1": eval_metrics["f1"],
            "asr": 0.0,
            "epsilon": avg_epsilon,
            "num_quarantined": len(quarantined) + len(suspicious),
            "num_rollbacks": healing_controller.num_rollbacks,
            "round_time_sec": round_time,
        }
        results.append(result_row)
        
        # Print summary
        print(f"Round {round_num:3d}/{num_rounds} | "
              f"Acc: {eval_metrics['accuracy']:.4f} | "
              f"Loss: {eval_metrics['loss']:.4f} | "
              f"eps: {avg_epsilon:.2f} | "
              f"Q: {len(quarantined) + len(suspicious)} | "
              f"RB: {healing_controller.num_rollbacks} | "
              f"Time: {round_time:.1f}s")
        
        # Collect client metrics for reporting
        formatted_client_metrics = []
        for cid in range(num_clients):
            status = "ACTIVE"
            local_acc = 0.0
            local_loss = 0.0
            
            if cid in quarantined:
                status = "FAILED"
            elif cid in suspicious:
                status = "FAILED"
            
            # evaluate client locally to get local hospital accuracy and loss
            try:
                cl_loss, cl_total, cl_eval = clients[cid].evaluate(global_params)
                local_acc = cl_eval["accuracy"]
                local_loss = cl_eval["loss"]
            except Exception:
                local_acc = 0.0
                local_loss = 0.0
                
            formatted_client_metrics.append({
                "clientId": cid,
                "localAccuracy": local_acc,
                "localLoss": local_loss,
                "status": status
            })

        # Collect self-healing events
        formatted_events = []
        for event in healing_controller.events:
            event_round = event.round_num
            if event_round == -1 or event_round == round_num:
                formatted_events.append({
                    "eventType": event.event_type,
                    "clientId": event.details.get("client_id", None),
                    "details": str(event.details)
                })
        
        # Clear in-memory events for next round
        healing_controller.events = []
        
        # Report round metrics
        reporter.send_round_metrics(
            round_num=round_num,
            global_accuracy=eval_metrics["accuracy"],
            global_loss=eval_metrics["loss"],
            epsilon=avg_epsilon,
            client_metrics=formatted_client_metrics,
            self_healing_events=formatted_events
        )
    
    # Save results
    with open(results_csv, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)
    
    print(f"\n[SUCCESS] Results saved to {results_csv}")
    
    # Report run completion
    reporter.send_run_complete(
        final_accuracy=eval_metrics["accuracy"],
        final_loss=eval_metrics["loss"],
        final_epsilon=avg_epsilon
    )

    
    # Generate plots
    events_csv = "results/healing_events.csv"
    plots = generate_all_plots(results_csv, events_csv, "results/plots", f"asfa_{dataset_name}")
    print(f"[SUCCESS] Plots saved: {plots}")
    
    # Print summary
    summary = healing_controller.get_summary()
    print(f"\nASFA Summary: {summary}")
    
    return results_csv


def main():
    parser = argparse.ArgumentParser(description="Run ASFA FL experiment")
    parser.add_argument("--config", type=str, default="configs/asfa_pathmnist.yaml")
    args = parser.parse_args()
    
    if os.path.exists(args.config):
        config = load_config(args.config)
    else:
        print(f"Config not found: {args.config}, using defaults")
        config = {}
    
    run_asfa(config)


if __name__ == "__main__":
    main()