"""
CNN Model for MedMNIST / PathMNIST image classification.
Supports 28x28 images with arbitrary input channels and output classes.
Uses GroupNorm instead of BatchNorm for compatibility with Opacus Differential Privacy.
"""

import torch
import torch.nn as nn


class MedMNISTCNN(nn.Module):
    """
    Lightweight 2-layer CNN for 28x28 medical images.
    Using GroupNorm for Differential Privacy compatibility.
    """
    def __init__(self, in_channels: int = 3, num_classes: int = 9):
        super().__init__()
        
        self.features = nn.Sequential(
            nn.Conv2d(in_channels, 16, kernel_size=3, padding=1),
            nn.GroupNorm(num_groups=2, num_channels=16),
            nn.ReLU(),
            nn.MaxPool2d(kernel_size=2, stride=2),  # 28x28 -> 14x14
            
            nn.Conv2d(16, 32, kernel_size=3, padding=1),
            nn.GroupNorm(num_groups=4, num_channels=32),
            nn.ReLU(),
            nn.MaxPool2d(kernel_size=2, stride=2),  # 14x14 -> 7x7
        )
        
        self.classifier = nn.Sequential(
            nn.Linear(32 * 7 * 7, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, num_classes)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.features(x)
        x = torch.flatten(x, 1)
        x = self.classifier(x)
        return x


def get_model(config: dict) -> nn.Module:
    """
    Factory function to retrieve model from configuration.
    """
    in_channels = config.get("in_channels", 3)
    num_classes = config.get("num_classes", 9)
    return MedMNISTCNN(in_channels=in_channels, num_classes=num_classes)


if __name__ == "__main__":
    print("=" * 60)
    print("SMOKE TEST: cnn_medmnist.py")
    print("=" * 60)
    
    config = {"in_channels": 3, "num_classes": 9}
    model = get_model(config)
    print(model)
    
    dummy_input = torch.randn(4, 3, 28, 28)
    dummy_output = model(dummy_input)
    print(f"Input shape: {dummy_input.shape}")
    print(f"Output shape: {dummy_output.shape}")
    assert dummy_output.shape == (4, 9)
    
    print("\n✅ CNN smoke test passed!")
