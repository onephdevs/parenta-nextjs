#!/bin/bash

# 🔄 Parenta Keep-Alive Script
# Checks if application is running and restarts if needed
# Use this with cron to run every 5 minutes

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Application directory
APP_DIR="$HOME/domains/parenta.com.mx/nodejs-app"
APP_NAME="parenta-app"
LOG_FILE="$HOME/parenta-keepalive.log"

# Function to log with timestamp
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Check if PM2 process exists
PM2_STATUS=$(pm2 list | grep "$APP_NAME" | grep "online" | wc -l)

if [ "$PM2_STATUS" -eq 0 ]; then
    log_message "⚠️  Application is DOWN - Restarting..."
    
    cd "$APP_DIR"
    
    # Try to delete old process if exists but not online
    pm2 delete "$APP_NAME" 2>/dev/null
    
    # Start application
    pm2 start npm --name "$APP_NAME" -- start
    pm2 save
    
    if [ $? -eq 0 ]; then
        log_message "✅ Application restarted successfully"
    else
        log_message "❌ Failed to restart application"
    fi
else
    log_message "✓ Application is running normally"
fi

# Keep log file under 1000 lines
tail -n 1000 "$LOG_FILE" > "${LOG_FILE}.tmp" 2>/dev/null && mv "${LOG_FILE}.tmp" "$LOG_FILE"

