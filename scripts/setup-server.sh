#!/bin/bash

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/deploy-env.sh"
require_ssh_pass

SERVER_IP="${SSH_HOST}"
SERVER_PORT="${SSH_PORT}"
SERVER_USER="${SSH_USER}"
SERVER_PASS="${SSH_PASS}"

# Initial Server Setup Script for Hostinger
# This script prepares the server for first-time deployment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Server configuration

print_step() {
    echo -e "${BLUE}==>${NC} ${GREEN}$1${NC}"
}

print_error() {
    echo -e "${RED}ERROR:${NC} $1"
}

# Check sshpass
if ! command -v sshpass &> /dev/null; then
    print_error "sshpass is not installed"
    exit 1
fi

# Execute remote command
remote_exec() {
    sshpass -p "$SERVER_PASS" ssh -p $SERVER_PORT -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "$1"
}

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Hostinger Server Initial Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

print_step "Testing connection..."
if remote_exec "echo 'Connected'" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Connection successful${NC}"
else
    print_error "Failed to connect"
    exit 1
fi

print_step "Updating system packages..."
remote_exec "sudo apt update && sudo apt upgrade -y"

print_step "Installing Node.js 18..."
remote_exec "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install -y nodejs"

print_step "Installing PM2..."
remote_exec "sudo npm install -g pm2"

print_step "Installing PostgreSQL..."
remote_exec "sudo apt install -y postgresql postgresql-contrib"

print_step "Installing Nginx..."
remote_exec "sudo apt install -y nginx"

print_step "Installing other utilities..."
remote_exec "sudo apt install -y git curl wget ufw certbot python3-certbot-nginx"

print_step "Configuring firewall..."
remote_exec "sudo ufw --force enable"
remote_exec "sudo ufw allow $SERVER_PORT/tcp"  # SSH
remote_exec "sudo ufw allow 80/tcp"             # HTTP
remote_exec "sudo ufw allow 443/tcp"            # HTTPS

print_step "Setting up PostgreSQL database..."
# Note: This will prompt for database password - you'll need to set it manually
remote_exec "sudo -u postgres psql -c \"CREATE DATABASE parenta_db;\" || echo 'Database may already exist'"
remote_exec "sudo -u postgres psql -c \"CREATE USER parenta_user WITH PASSWORD 'Parenta2025!!';\" || echo 'User may already exist'"
remote_exec "sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE parenta_db TO parenta_user;\""

print_step "Creating application directory..."
remote_exec "mkdir -p /home/u876334876/apps"
remote_exec "mkdir -p /home/u876334876/backups"

print_step "Checking installed versions..."
echo ""
echo "Node.js version:"
remote_exec "node --version"
echo ""
echo "npm version:"
remote_exec "npm --version"
echo ""
echo "PM2 version:"
remote_exec "pm2 --version"
echo ""
echo "PostgreSQL version:"
remote_exec "psql --version"
echo ""
echo "Nginx version:"
remote_exec "nginx -v"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Server Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Create .env.production file with proper credentials"
echo "2. Run: ./scripts/deploy-to-hostinger.sh"
echo "3. Setup Nginx reverse proxy"
echo "4. Setup SSL certificate"
echo ""
echo "Important credentials:"
echo "  Database: parenta_db"
echo "  DB User: parenta_user"
echo "  DB Password: Parenta2025!!"
echo ""
echo "Update your .env.production with:"
echo "  DATABASE_URL=\"postgresql://parenta_user:Parenta2025!!@localhost:5432/parenta_db\""
echo ""

