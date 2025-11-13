#!/bin/bash

# 🚀 Automatic Git-Based Deployment for Parenta
# Uses Git instead of SCP for faster, smarter deployments

set -e

echo "🚀 Git-Based Deployment to Hostinger"
echo "========================================"
echo ""

# SSH Details
SSH_USER="u876334876"
SSH_HOST="145.79.25.103"
SSH_PORT="65002"
SSH_PASS="Theanswer001!!!"
REMOTE_PATH="domains/parenta.com.mx/nodejs-app"
GIT_REPO="git@github.com:onephdevs/parenta-nextjs.git"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📋 Deployment Info:${NC}"
echo "   Repository: $GIT_REPO"
echo "   Server: $SSH_HOST:$SSH_PORT"
echo "   Path: $REMOTE_PATH"
echo ""

# Check if we're in git repo
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Error: Not in a git repository${NC}"
    echo "Please run 'git init' first or run from your git repo"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  Warning: You have uncommitted changes${NC}"
    echo ""
    echo "Uncommitted files:"
    git status --short
    echo ""
    echo "Please commit your changes first:"
    echo "  git add ."
    echo "  git commit -m 'Your commit message'"
    echo "  git push"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "${BLUE}📌 Current branch: $CURRENT_BRANCH${NC}"
echo ""

# Push to GitHub
echo -e "${YELLOW}📤 Pushing to GitHub...${NC}"
git push origin $CURRENT_BRANCH
echo -e "${GREEN}✅ Pushed to GitHub${NC}"
echo ""

# Deploy on server
echo "========================================"
echo -e "${BLUE}🚀 Deploying on Hostinger Server${NC}"
echo "========================================"
echo ""

sshpass -p "$SSH_PASS" ssh -p $SSH_PORT ${SSH_USER}@${SSH_HOST} << ENDSSH
set -e

cd ~/$REMOTE_PATH

echo "📂 Current directory: \$(pwd)"
echo ""

# Check if git repo exists
if [ ! -d ".git" ]; then
    echo "⚠️  Git repository not initialized on server"
    echo "📥 Cloning repository..."
    
    cd ~/domains/parenta.com.mx/
    
    if [ -d "nodejs-app" ]; then
        echo "📦 Backing up existing nodejs-app directory..."
        mv nodejs-app nodejs-app.backup.\$(date +%Y%m%d_%H%M%S)
    fi
    
    echo "🔄 Cloning from GitHub..."
    git clone $GIT_REPO nodejs-app
    cd nodejs-app
    
    echo "✅ Repository cloned"
else
    echo "📦 Git repository found"
    echo "🔄 Pulling latest changes..."
    
    # Stash any local changes (like .env files)
    git stash || true
    
    # Pull latest
    git pull origin $CURRENT_BRANCH
    
    # Restore stashed changes
    git stash pop || true
    
    echo "✅ Latest changes pulled"
fi

echo ""
echo "📊 Current commit:"
git log -1 --oneline
echo ""

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "⚠️  .env.production not found"
    echo "Creating .env.production..."
    
    cat > .env.production << 'ENVFILE'
# Parenta Production Environment Variables
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
npm install --production

if [ \$? -eq 0 ]; then
    echo "✅ Dependencies installed"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "🏗️  Building application..."
npm run build

if [ \$? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Go to hPanel: https://hpanel.hostinger.com/"
echo "2. Navigate to: Node.js section"
echo "3. Click 'Restart' for parenta.com.mx app"
echo "4. Test at: https://parenta.com.mx"
echo ""

ENDSSH

echo ""
echo "=========================================="
echo -e "${GREEN}🎉 DEPLOYMENT SUCCESSFUL!${NC}"
echo "=========================================="
echo ""
echo "Summary:"
echo "  ✅ Code pushed to GitHub"
echo "  ✅ Code pulled on server"
echo "  ✅ Dependencies installed"
echo "  ✅ Application built"
echo ""
echo -e "${YELLOW}⚠️  Don't forget to:${NC}"
echo "  1. Restart application in hPanel"
echo "  2. Test at https://parenta.com.mx"
echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""

