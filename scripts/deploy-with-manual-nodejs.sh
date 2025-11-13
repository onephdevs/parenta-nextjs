#!/bin/bash

# 🚀 Deploy Parenta with Manual Node.js Installation
# For Hostinger servers with manually installed Node.js via NVM

set -e

SSH_USER="u876334876"
SSH_HOST="145.79.25.103"
SSH_PORT="65002"
SSH_PASS="Theanswer001!!!"
GIT_REPO="git@github.com:onephdevs/parenta-nextjs.git"
APP_DIR="domains/parenta.com.mx/nodejs-app"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 Deploying Parenta to Hostinger"
echo "===================================="
echo ""

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  Warning: Uncommitted changes detected${NC}"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Push to GitHub
echo -e "${BLUE}📤 Pushing to GitHub...${NC}"
git push origin main
echo -e "${GREEN}✅ Pushed to GitHub${NC}"
echo ""

echo "=========================================="
echo -e "${BLUE}🚀 Deploying on Hostinger Server${NC}"
echo "=========================================="
echo ""

sshpass -p "$SSH_PASS" ssh -p $SSH_PORT ${SSH_USER}@${SSH_HOST} << 'ENDSSH'
set -e

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "📊 Using Node.js: $(node --version)"
echo "📊 Using npm: $(npm --version)"
echo ""

cd ~/domains/parenta.com.mx/nodejs-app

# Check if git repo exists
if [ ! -d ".git" ]; then
    echo "📥 Cloning repository from GitHub..."
    cd ~/domains/parenta.com.mx/
    
    if [ -d "nodejs-app" ]; then
        echo "📦 Backing up existing directory..."
        mv nodejs-app nodejs-app.backup.$(date +%Y%m%d_%H%M%S)
    fi
    
    git clone git@github.com:onephdevs/parenta-nextjs.git nodejs-app
    cd nodejs-app
    
    echo "✅ Repository cloned"
else
    echo "🔄 Pulling latest changes from GitHub..."
    git stash || true
    git pull origin main
    git stash pop || true
    echo "✅ Latest changes pulled"
fi

echo ""
echo "📊 Current commit:"
git log -1 --oneline
echo ""

# Check/Create .env.production
if [ ! -f ".env.production" ]; then
    echo "⚠️  .env.production not found, creating..."
    
    cat > .env.production << 'ENVFILE'
DATABASE_URL="postgresql://postgres.lttvkueyiptqzhubaydg:Theanswer001!!!@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.lttvkueyiptqzhubaydg:Theanswer001!!!@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
NEXTAUTH_URL="https://parenta.com.mx"
NEXTAUTH_SECRET="CMgu1S5/GQqa6PXJQBTiSaAD3gaTOzYbtIbV5MZcLKM="
NODE_ENV="production"
PORT=3030
ENVFILE
    
    echo "✅ .env.production created"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🏗️  Building application..."
npm run build

echo ""
echo "🔄 Managing PM2 process..."

# Stop existing process if running
pm2 stop parenta-app || true
pm2 delete parenta-app || true

# Start new process
pm2 start npm --name "parenta-app" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to run on startup
pm2 startup | grep 'sudo' | bash || echo "PM2 startup command noted (requires manual sudo)"

echo ""
echo "✅ Application deployed and running!"
echo ""
echo "PM2 Status:"
pm2 status

echo ""
echo "To view logs: pm2 logs parenta-app"
echo "To stop: pm2 stop parenta-app"
echo "To restart: pm2 restart parenta-app"
echo ""

ENDSSH

echo ""
echo "=========================================="
echo -e "${GREEN}🎉 DEPLOYMENT SUCCESSFUL!${NC}"
echo "=========================================="
echo ""
echo "Your application is now running!"
echo ""
echo "Access it at:"
echo "  https://parenta.com.mx (after DNS is configured)"
echo "  or"
echo "  http://145.79.25.103:3030 (direct IP access)"
echo ""
echo "Useful commands:"
echo "  View logs: ./scripts/ssh-hostinger.sh connect"
echo "             Then: pm2 logs parenta-app"
echo ""
echo "  Check status: pm2 status"
echo "  Restart: pm2 restart parenta-app"
echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""

