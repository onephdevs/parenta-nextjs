#!/bin/bash

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/deploy-env.sh"
require_ssh_pass

# 🔧 Manual Node.js Installation on Hostinger Shared Hosting
# This script installs Node.js via NVM when hPanel doesn't have Node.js option

set -e


GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔧 Installing Node.js Manually on Hostinger"
echo "============================================"
echo ""

echo -e "${BLUE}This will install:${NC}"
echo "  • NVM (Node Version Manager)"
echo "  • Node.js 18.x"
echo "  • npm"
echo "  • PM2 (Process Manager)"
echo ""
echo "Press ENTER to continue..."
read

echo ""
echo "🚀 Starting installation on server..."
echo ""

sshpass -p "$SSH_PASS" ssh -p $SSH_PORT ${SSH_USER}@${SSH_HOST} << 'ENDSSH'

echo "=========================================="
echo "STEP 1: Installing NVM"
echo "=========================================="
echo ""

cd ~

# Download and install NVM
echo "📥 Downloading NVM..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo ""
echo "✅ NVM installed!"
echo ""

echo "=========================================="
echo "STEP 2: Installing Node.js 18"
echo "=========================================="
echo ""

# Install Node.js 18 (LTS)
echo "📥 Installing Node.js 18..."
nvm install 18

# Set as default
nvm use 18
nvm alias default 18

echo ""
echo "✅ Node.js installed!"
node --version
npm --version
echo ""

echo "=========================================="
echo "STEP 3: Installing PM2"
echo "=========================================="
echo ""

# Install PM2 globally
echo "📥 Installing PM2..."
npm install -g pm2

echo ""
echo "✅ PM2 installed!"
pm2 --version
echo ""

echo "=========================================="
echo "STEP 4: Setting up environment"
echo "=========================================="
echo ""

# Add NVM to shell startup files
echo "" >> ~/.bashrc
echo "# Load NVM" >> ~/.bashrc
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bashrc
echo '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"' >> ~/.bashrc

echo "" >> ~/.bash_profile
echo "# Load NVM" >> ~/.bash_profile
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bash_profile
echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bash_profile

echo "✅ Shell configuration updated"
echo ""

echo "=========================================="
echo "STEP 5: Creating application directory"
echo "=========================================="
echo ""

mkdir -p ~/domains/parenta.com.mx/nodejs-app
cd ~/domains/parenta.com.mx/nodejs-app

echo "✅ Application directory created"
echo "   Location: ~/domains/parenta.com.mx/nodejs-app"
echo ""

echo "=========================================="
echo "✅ Installation Complete!"
echo "=========================================="
echo ""
echo "Installed versions:"
node --version
npm --version
pm2 --version
echo ""
echo "Next steps:"
echo "1. Deploy your application"
echo "2. Start with PM2"
echo "3. Configure to run on server startup"
echo ""

ENDSSH

echo ""
echo "=========================================="
echo -e "${GREEN}🎉 Node.js Installation Complete!${NC}"
echo "=========================================="
echo ""
echo "Your server now has:"
echo "  ✅ NVM (Node Version Manager)"
echo "  ✅ Node.js 18.x"
echo "  ✅ npm"
echo "  ✅ PM2 (Process Manager)"
echo ""
echo "Next: Deploy your application!"
echo "  Run: ./scripts/deploy-with-manual-nodejs.sh"
echo ""

