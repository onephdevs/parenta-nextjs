#!/bin/bash

# SSH Helper Script for Hostinger
# Quick access to common server operations
# Secrets: copy scripts/.deploy-secrets.example → scripts/.deploy-secrets

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/deploy-env.sh"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVER_IP="$SSH_HOST"
SERVER_PORT="$SSH_PORT"
SERVER_USER="$SSH_USER"
SERVER_PASS="$SSH_PASS"
APP_DIR="${SERVER_APP_DIR}"

check_sshpass() {
    if ! command -v sshpass &> /dev/null; then
        echo -e "${RED}ERROR:${NC} sshpass is not installed"
        echo "Install it with:"
        echo "  - macOS: brew install hudochenkov/sshpass/sshpass"
        echo "  - Linux: sudo apt-get install sshpass"
        exit 1
    fi
}

remote_exec() {
    require_ssh_pass
    sshpass -p "$SERVER_PASS" ssh -p "$SERVER_PORT" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "$1"
}

connect() {
    require_ssh_pass
    echo -e "${BLUE}Connecting to Hostinger...${NC}"
    sshpass -p "$SERVER_PASS" ssh -p "$SERVER_PORT" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP"
}

logs() {
    echo -e "${BLUE}Viewing application logs...${NC}"
    remote_exec "pm2 logs parenta-app"
}

status() {
    echo -e "${BLUE}Application Status:${NC}"
    remote_exec "pm2 status"
}

restart() {
    echo -e "${BLUE}Restarting application...${NC}"
    remote_exec "pm2 restart parenta-app"
    echo -e "${GREEN}✓ Application restarted${NC}"
}

stop() {
    echo -e "${BLUE}Stopping application...${NC}"
    remote_exec "pm2 stop parenta-app"
    echo -e "${GREEN}✓ Application stopped${NC}"
}

start() {
    echo -e "${BLUE}Starting application...${NC}"
    remote_exec "cd $APP_DIR && pm2 start parenta-app"
    echo -e "${GREEN}✓ Application started${NC}"
}

monitor() {
    echo -e "${BLUE}Monitoring application (press Ctrl+C to exit)...${NC}"
    remote_exec "pm2 monit"
}

info() {
    echo -e "${BLUE}Server Information:${NC}"
    echo "======================================"
    echo "IP: $SERVER_IP"
    echo "Port: $SERVER_PORT"
    echo "User: $SERVER_USER"
    echo "App Directory: $APP_DIR"
    echo "Password: (from SSH_PASS / scripts/.deploy-secrets)"
    echo "======================================"
    echo ""
    echo -e "${BLUE}System Info:${NC}"
    remote_exec "uname -a && echo '' && free -h && echo '' && df -h /"
}

db() {
    echo -e "${BLUE}Connecting to PostgreSQL...${NC}"
    remote_exec "psql -U parenta_user -d parenta_db"
}

nginx_logs() {
    echo -e "${BLUE}Nginx Error Logs:${NC}"
    remote_exec "sudo tail -100 /var/log/nginx/error.log"
}

show_help() {
    echo "Hostinger SSH Helper Commands"
    echo "======================================"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  connect       - SSH into the server"
    echo "  logs          - View application logs"
    echo "  status        - Check application status"
    echo "  restart       - Restart application"
    echo "  stop          - Stop application"
    echo "  start         - Start application"
    echo "  monitor       - Monitor application resources"
    echo "  info          - Show server information"
    echo "  db            - Connect to PostgreSQL database"
    echo "  nginx         - View Nginx error logs"
    echo "  help          - Show this help message"
    echo ""
    echo "Secrets: cp scripts/.deploy-secrets.example scripts/.deploy-secrets"
    echo ""
}

check_sshpass

case "${1:-help}" in
    connect) connect ;;
    logs) logs ;;
    status) status ;;
    restart) restart ;;
    stop) stop ;;
    start) start ;;
    monitor) monitor ;;
    info) info ;;
    db) db ;;
    nginx) nginx_logs ;;
    help) show_help ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
