#!/usr/bin/env python3
"""
DP FL experiment: FedAvg + Opacus DP-SGD on every client.
Logs epsilon per round. Optional light attackers to show DP alone doesn't defend against poisoning.
"""

import os
import sys
import argparse
import csv
import time
from datetime import datetime
from typing import Dict

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models.cnn_medmnist import get_model
from data.medmnist_utils import ClientDatasetManager
from clients.client import SimpleClient
from clients.attacks import assign_attackers, apply_attack_to_client_data
from server.aggregator import FedAvgAggregator
from eval.metrics import evaluate_model
from eval.plots import generate_all_plots


def load_config(config_path: str) -> Dict:
    import yaml
    with open(config_path, "r") as f:
        return yaml.safe_load(f)


def run_dp(config: Dict) -> str:
    """Run DP-enabled FL experiment."""
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
    attacker_fraction = config.get("attacker_fraction", 0.0)
    attack_type = config.get("attack_type", None)
    
    print("=" * 60)
    print("DP FEDERATED LEARNING EXPERIMENT")
    print("=" * 60)
    print(f"Clients: {num_clients}, Rounds: {num_rounds}")
    print(f"Noise Multiplier: {noise_multiplier}, Max Grad Norm: {max_grad_norm}")
    print(f"Target Epsilon: {target_epsilon}, Delta: {delta}")
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
    
    # Initialize global model
    model_config = {
        "model_type": "cnn",
        "in_channels": data_manager.n_channels,
        "num_classes": data_manager.num_classes,
    }
    global_model = get_model(model_config).to(device)
    
    # Create clients with DP
    clients = []
    for cid in range(num_clients):
        client_model = get_model(model_config).to(device)
        
        train_loader = data_manager.get_train_loader(cid)
        
        # Apply attack if attacker
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
    aggregator = FedAvgAggregator()
    
    # Results
    results = []
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_csv = f"results/dp_{dataset_name}_{timestamp}.csv"
    os.makedirs("results", exist_ok=True)
    
    global_params = [p.cpu().numpy() for p in global_model.parameters()]
    
    for round_num in range(1, num_rounds + 1):
        round_start = time.time()
        
        client_updates = []
        client_metrics = []
        epsilon_values = []
        
        for cid, client in enumerate(clients):
            updated_params, num_ex, metrics = client.fit(global_params)
            client_updates.append(updated_params)
            client_metrics.append(metrics)
            if "epsilon" in metrics:
                epsilon_values.append(metrics["epsilon"])
        
        # Aggregate
        aggregated_params = aggregator.aggregate(client_updates, list(range(num_clients)))
        
        for p, agg_param in zip(global_model.parameters(), aggregated_params):
            p.data = torch.tensor(agg_param).to(device)
        
        global_params = aggregated_params
        
        # Evaluate
        test_loader = data_manager.get_test_loader()
        eval_metrics = evaluate_model(global_model, test_loader, device)
        
        round_time = time.time() - round_start
        avg_epsilon = np.mean(epsilon_values) if epsilon_values else 0.0
        
        result_row = {
            "round": round_num,
            "accuracy": eval_metrics["accuracy"],
            "loss": eval_metrics["loss"],
            "f1": eval_metrics["f1"],
            "asr": 0.0,
            "epsilon": avg_epsilon,
            "num_quarantined": 0,
            "num_rollbacks": 0,
            "round_time_sec": round_time,
        }
        results.append(result_row)
        
        print(f"Round {round_num:3d}/{num_rounds} | "
              f"Acc: {eval_metrics['accuracy']:.4f} | "
              f"Loss: {eval_metrics['loss']:.4f} | "
              f"ε: {avg_epsilon:.2f} | "
              f"Time: {round_time:.1f}s")
    
    # Save results
    with open(results_csv, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)
    
    print(f"\n✅ Results saved to {results_csv}")
    
    # Generate plots
    plots = generate_all_plots(results_csv, None, "results/plots", f"dp_{dataset_name}")
    print(f"✅ Plots saved: {plots}")
    
    return results_csv


def main():
    parser = argparse.ArgumentParser(description="Run DP FL experiment")
    parser.add_argument("--config", type=str, default="configs/dp_pathmnist.yaml")
    args = parser.parse_args()
    
    if os.path.exists(args.config):
        config = load_config(args.config)
    else:
        print(f"Config not found: {args.config}, using defaults")
        config = {}
    
    run_dp(config)


if __name__ == "__main__":
    main()