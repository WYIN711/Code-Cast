#!/bin/bash
# CodeCast EC2 Setup Script
# Run this on a fresh Amazon Linux 2023 or Ubuntu instance

set -euo pipefail

echo "=== CodeCast EC2 Setup ==="

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "Cannot detect OS"
    exit 1
fi

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    if [ "$OS" = "amzn" ]; then
        sudo yum update -y
        sudo yum install -y docker git
        sudo systemctl enable docker
        sudo systemctl start docker
    else
        sudo apt-get update
        sudo apt-get install -y docker.io git
        sudo systemctl enable docker
        sudo systemctl start docker
    fi
    sudo usermod -aG docker $USER
    echo "Docker installed. You may need to log out and back in for group changes."
fi

# Install Docker Compose plugin
if ! docker compose version &> /dev/null; then
    echo "Installing Docker Compose plugin..."
    sudo mkdir -p /usr/local/lib/docker/cli-plugins
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep tag_name | cut -d '"' -f 4)
    sudo curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" \
        -o /usr/local/lib/docker/cli-plugins/docker-compose
    sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
    echo "Docker Compose installed: $(docker compose version)"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Clone the repo:  git clone https://github.com/williamydh/codecast.git"
echo "2. cd codecast/deploy"
echo "3. cp .env.example .env && nano .env  (fill in secrets)"
echo "4. docker compose up -d --build"
echo "5. Check logs: docker compose logs -f"
