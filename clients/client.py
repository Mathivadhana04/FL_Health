"""
Flower NumPyClient with local DP-SGD training via Opacus.
Supports toggling DP on/off for baseline, DP-only, and ASFA experiments.
"""

import warnings
from typing import Dict, List, Tuple, Optional

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader

try:
    import flwr as fl
except ImportError:
    raise ImportError("flwr not installed. Run: pip install flwr[\"simulation\"]")

try:
    from opacus import PrivacyEngine
except ImportError:
    PrivacyEngine = None  # type: ignore


class FLClient(fl.client.NumPyClient):
    """
    Federated Learning client with optional differential privacy.
    
    Wraps local training with Opacus PrivacyEngine when DP is enabled.
    Reports epsilon (privacy budget) after each training round.
    """
    
    def __init__(
        self,
        client_id: int,
        model: nn.Module,
        train_loader: DataLoader,
        val_loader: DataLoader,
        config: Dict,
    ):
        self.client_id = client_id
        self.model = model
        self.train_loader = train_loader
        self.val_loader = val_loader
        self.config = config
        
        # Training hyperparameters
        self.local_epochs = config.get("local_epochs", 5)
        self.lr = config.get("learning_rate", 0.001)
        self.device = torch.device(config.get("device", "cpu"))
        
        # DP configuration
        self.use_dp = config.get("use_dp", False)
        self.noise_multiplier = float(config.get("noise_multiplier", 1.0))
        self.max_grad_norm = float(config.get("max_grad_norm", 1.0))
        self.delta = float(config.get("delta", 1e-5))
        self.target_epsilon = float(config.get("target_epsilon")) if config.get("target_epsilon") else None
        
        # Attack configuration (if this client is adversarial)
        self.attack_type = config.get("attack_type", None)  # "label_flip", "backdoor", None
        self.attack_config = config.get("attack_config", {})
        
        # Move model to device
        self.model.to(self.device)
        
        # Privacy engine (initialized during first fit)
        self.privacy_engine: Optional[PrivacyEngine] = None
        self.current_epsilon = 0.0
        
    def get_parameters(self, config: Dict = None) -> List[np.ndarray]:
        """Return model parameters as a list of NumPy arrays."""
        return [val.detach().cpu().numpy() for val in self.model.parameters()]
    
    def set_parameters(self, parameters: List[np.ndarray]):
        """Set model parameters from a list of NumPy arrays."""
        for p, val in zip(self.model.parameters(), parameters):
            p.data = torch.tensor(val).to(self.device)
    
    def fit(
        self,
        parameters: List[np.ndarray],
        config: Dict,
    ) -> Tuple[List[np.ndarray], int, Dict]:
        """
        Train the local model for `local_epochs` epochs.
        """
        self.set_parameters(parameters)
        self.model.train()
        
        # Setup optimizer
        optimizer = optim.Adam(self.model.parameters(), lr=self.lr)
        
        train_loader = self.train_loader
        model_to_train = self.model
        privacy_engine = None
        
        # Setup DP if enabled
        if self.use_dp and PrivacyEngine is not None:
            privacy_engine = PrivacyEngine()
            model_to_train, optimizer, train_loader = privacy_engine.make_private_with_epsilon(
                module=self.model,
                optimizer=optimizer,
                data_loader=self.train_loader,
                target_epsilon=self.target_epsilon or 10.0,
                target_delta=self.delta,
                epochs=self.local_epochs,
                max_grad_norm=self.max_grad_norm,
            ) if self.target_epsilon else privacy_engine.make_private(
                module=self.model,
                optimizer=optimizer,
                data_loader=self.train_loader,
                noise_multiplier=self.noise_multiplier,
                max_grad_norm=self.max_grad_norm,
            )
        
        # Loss function
        criterion = nn.CrossEntropyLoss()
        
        # Training loop
        model_to_train.train()
        total_loss = 0.0
        
        for epoch in range(self.local_epochs):
            epoch_loss = 0.0
            
            for batch_idx, (data, target) in enumerate(train_loader):
                data, target = data.to(self.device), target.to(self.device)
                
                # Handle label shape (MedMNIST labels may need squeeze)
                if target.dim() > 1:
                    target = target.squeeze().long()
                else:
                    target = target.long()
                
                optimizer.zero_grad()
                output = model_to_train(data)
                loss = criterion(output, target)
                loss.backward()
                optimizer.step()
                
                epoch_loss += loss.item()
            
            total_loss += epoch_loss
        
        avg_loss = total_loss / (self.local_epochs * len(train_loader)) if len(train_loader) > 0 else 0
        
        # Get epsilon if using DP
        metrics = {
            "client_id": self.client_id,
            "train_loss": avg_loss,
            "local_epochs": self.local_epochs,
        }
        
        if self.use_dp and privacy_engine is not None:
            try:
                self.current_epsilon = privacy_engine.get_epsilon(self.delta)
                metrics["epsilon"] = self.current_epsilon
            except Exception:
                # Fallback: estimate epsilon from noise multiplier
                metrics["epsilon"] = self.noise_multiplier
                metrics["epsilon_note"] = "estimated_from_noise_multiplier"
            
            # Detach Opacus hooks so the model can be safely re-wrapped next round
            if hasattr(model_to_train, "remove_hooks"):
                model_to_train.remove_hooks()
        
        num_examples = len(self.train_loader.dataset)
        
        return self.get_parameters(), num_examples, metrics
    
    def evaluate(
        self,
        parameters: List[np.ndarray],
        config: Dict,
    ) -> Tuple[float, int, Dict]:
        """
        Evaluate the model on local validation data.
        
        Returns:
            (loss, num_examples, metrics_dict)
        """
        self.set_parameters(parameters)
        
        criterion = nn.CrossEntropyLoss()
        self.model.eval()
        
        total_loss = 0.0
        correct = 0
        total = 0
        
        with torch.no_grad():
            for data, target in self.val_loader:
                data, target = data.to(self.device), target.to(self.device)
                
                if target.dim() > 1:
                    target = target.squeeze().long()
                else:
                    target = target.long()
                
                output = self.model(data)
                loss = criterion(output, target)
                total_loss += loss.item() * data.size(0)
                
                pred = output.argmax(dim=1)
                correct += pred.eq(target).sum().item()
                total += target.size(0)
        
        avg_loss = total_loss / total if total > 0 else 0
        accuracy = correct / total if total > 0 else 0
        
        return float(avg_loss), total, {
            "client_id": self.client_id,
            "accuracy": accuracy,
            "loss": avg_loss,
        }
    
    def _apply_attack(self, data: torch.Tensor, target: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """Apply configured attack to the batch."""
        # Attacks are applied at the dataset level in clients/attacks.py
        # This is a hook for model-level attacks if needed
        return data, target


class SimpleClient:
    """
    A simple client wrapper designed for local FL loop simulation.
    """
    def __init__(
        self,
        client_id: int,
        model: nn.Module,
        train_loader: DataLoader,
        val_loader: DataLoader,
        config: Dict,
    ):
        self.client = FLClient(client_id, model, train_loader, val_loader, config)

    def fit(self, parameters: List[np.ndarray]) -> Tuple[List[np.ndarray], int, Dict]:
        return self.client.fit(parameters, {})

    def evaluate(self, parameters: List[np.ndarray]) -> Tuple[float, int, Dict]:
        return self.client.evaluate(parameters, {})


def client_fn(
    client_id: int,
    model: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    config: Dict,
) -> FLClient:
    """Factory function to create an FLClient."""
    return FLClient(
        client_id=client_id,
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        config=config,
    )