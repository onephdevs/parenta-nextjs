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

# Parenta Deployment Script to Hostinger
# This script automates the deployment process to Hostinger VPS

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Server configuration
APP_DIR="/home/u876334876/apps/parenta-nextjs"

# Functions
print_step() {
    echo -e "${BLUE}==>${NC} ${GREEN}$1${NC}"
}

print_error() {
    echo -e "${RED}ERROR:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}WARNING:${NC} $1"
}

# Check if sshpass is installed
check_sshpass() {
    if ! command -v sshpass &> /dev/null; then
        print_error "sshpass is not installed"
        echo "Please install it:"
        echo "  - macOS: brew install hudochenkov/sshpass/sshpass"
        echo "  - Linux: sudo apt-get install sshpass"
        exit 1
    fi
}

# Test SSH connection
test_connection() {
    print_step "Testing SSH connection..."
    if sshpass -p "$SERVER_PASS" ssh -p $SERVER_PORT -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "echo 'Connection successful!'" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Connection successful${NC}"
    else
        print_error "Failed to connect to server"
        exit 1
    fi
}

# Execute remote command
remote_exec() {
    sshpass -p "$SERVER_PASS" ssh -p $SERVER_PORT -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "$1"
}

# Upload file/directory
upload_files() {
    local source=$1
    local dest=$2
    print_step "Uploading $source to $dest..."
    sshpass -p "$SERVER_PASS" scp -P $SERVER_PORT -r -o StrictHostKeyChecking=no "$source" "$SERVER_USER@$SERVER_IP:$dest"
}

# Main deployment function
deploy() {
    print_step "Starting deployment to Hostinger..."
    
    # Check prerequisites
    check_sshpass
    test_connection
    
    # Build application locally
    print_step "Building application locally..."
    npm run build
    
    # Create application directory on server
    print_step "Creating application directory on server..."
    remote_exec "mkdir -p $APP_DIR"
    
    # Upload necessary files
    print_step "Uploading application files..."
    
    # Create a temporary directory with only production files
    TMP_DIR=$(mktemp -d)
    
    # Copy necessary files to temp directory
    cp -r .next "$TMP_DIR/"
    cp -r public "$TMP_DIR/"
    cp -r src "$TMP_DIR/"
    cp package.json "$TMP_DIR/"
    cp package-lock.json "$TMP_DIR/"
    cp next.config.ts "$TMP_DIR/"
    cp tsconfig.json "$TMP_DIR/"
    
    # Upload the temp directory
    upload_files "$TMP_DIR/*" "$APP_DIR/"
    
    # Clean up temp directory
    rm -rf "$TMP_DIR"
    
    # Install dependencies on server
    print_step "Installing dependencies on server..."
    remote_exec "cd $APP_DIR && npm install --production"
    
    # Check if PM2 is installed
    print_step "Checking PM2 installation..."
    if ! remote_exec "command -v pm2" > /dev/null 2>&1; then
        print_step "Installing PM2..."
        remote_exec "npm install -g pm2"
    fi
    
    # Restart or start application with PM2
    print_step "Starting/Restarting application..."
    if remote_exec "pm2 list | grep parenta-app" > /dev/null 2>&1; then
        remote_exec "cd $APP_DIR && pm2 restart parenta-app"
    else
        remote_exec "cd $APP_DIR && pm2 start npm --name 'parenta-app' -- start"
        remote_exec "pm2 save"
    fi
    
    # Show PM2 status
    print_step "Application status:"
    remote_exec "pm2 status"
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}   Deployment completed successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Application should be running at:"
    echo "  http://$SERVER_IP:3030"
    echo ""
    echo "To view logs:"
    echo "  ./scripts/ssh-hostinger.sh logs"
    echo ""
}

# Show help
show_help() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  deploy    - Deploy application to Hostinger"
    echo "  test      - Test SSH connection"
    echo "  help      - Show this help message"
    echo ""
}

# Main script
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    test)
        check_sshpass
        test_connection
        ;;
    help)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac

