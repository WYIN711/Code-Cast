#!/bin/bash
set -euo pipefail

# Install Docker
apt-get update
apt-get install -y docker.io docker-compose-v2 git
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu

# Create app directory
mkdir -p /home/ubuntu/codecast
chown ubuntu:ubuntu /home/ubuntu/codecast
