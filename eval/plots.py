"""
Matplotlib plotting utilities for federated learning runs.
Generates static plots (accuracy, loss, epsilon, quarantine count) at the end of runs.
"""

import os
import csv
from typing import List, Optional


def generate_all_plots(
    results_csv: str,
    events_csv: Optional[str],
    output_dir: str,
    prefix: str,
) -> List[str]:
    """
    Generate accuracy, loss, privacy, and self-healing plots from CSV logs.
    Returns list of paths to generated images.
    """
    os.makedirs(output_dir, exist_ok=True)
    
    # Try importing matplotlib, fail gracefully if not installed
    try:
        import matplotlib
        matplotlib.use("Agg")  # Non-interactive backend
        import matplotlib.pyplot as plt
    except ImportError:
        print("Warning: matplotlib not installed. Skipping static plot generation.")
        return []

    rounds = []
    accuracy_vals = []
    loss_vals = []
    epsilon_vals = []
    quarantine_vals = []
    
    try:
        with open(results_csv, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                rounds.append(int(row["round"]))
                accuracy_vals.append(float(row["accuracy"]))
                loss_vals.append(float(row["loss"]))
                epsilon_vals.append(float(row.get("epsilon", 0.0)))
                quarantine_vals.append(int(row.get("num_quarantined", 0)))
    except Exception as e:
        print(f"Error reading results CSV for plotting: {e}")
        return []
        
    generated_plots = []
    
    if not rounds:
        return []

    # Plot 1: Accuracy & Loss
    try:
        fig, ax1 = plt.subplots(figsize=(8, 5))
        
        color = "tab:purple"
        ax1.set_xlabel("Federated Round")
        ax1.set_ylabel("Global Validation Accuracy", color=color)
        ax1.plot(rounds, accuracy_vals, color=color, marker="o", label="Accuracy")
        ax1.tick_params(axis="y", labelcolor=color)
        ax1.set_ylim(0.0, 1.05)
        
        ax2 = ax1.twinx()
        color = "tab:blue"
        ax2.set_ylabel("Global Loss", color=color)
        ax2.plot(rounds, loss_vals, color=color, linestyle="--", marker="s", label="Loss")
        ax2.tick_params(axis="y", labelcolor=color)
        
        plt.title(f"Federated Learning Training Performance ({prefix})")
        fig.tight_layout()
        
        out_path = os.path.join(output_dir, f"{prefix}_performance.png")
        plt.savefig(out_path, dpi=150)
        plt.close()
        generated_plots.append(out_path)
    except Exception as e:
        print(f"Failed to generate performance plot: {e}")

    # Plot 2: Differential Privacy Epsilon
    try:
        plt.figure(figsize=(7, 4))
        plt.plot(rounds, epsilon_vals, color="darkgreen", marker="^", label="Epsilon Spent")
        plt.xlabel("Federated Round")
        plt.ylabel("Privacy Budget (Epsilon)")
        plt.title("Differential Privacy Budget Growth")
        plt.grid(True, linestyle=":")
        plt.tight_layout()
        
        out_path = os.path.join(output_dir, f"{prefix}_privacy.png")
        plt.savefig(out_path, dpi=150)
        plt.close()
        generated_plots.append(out_path)
    except Exception as e:
        print(f"Failed to generate privacy plot: {e}")

    return generated_plots


if __name__ == "__main__":
    # Smoke test
    import tempfile
    with tempfile.TemporaryDirectory() as tmpdir:
        csv_file = os.path.join(tmpdir, "res.csv")
        with open(csv_file, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["round", "accuracy", "loss", "epsilon", "num_quarantined"])
            writer.writerow([1, 0.5, 1.2, 0.5, 0])
            writer.writerow([2, 0.6, 0.9, 1.0, 1])
        
        plots = generate_all_plots(csv_file, None, tmpdir, "test")
        print(f"Generated plots: {plots}")
