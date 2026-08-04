# 🚨 Troubleshooting: 503 Service Unavailable

## Quick Fix (If App is Down)

### Symptoms
- Website shows "503 Service Unavailable"
- Application not responding
- PM2 shows no processes

### Quick Restart Command
```bash
# SSH into server
ssh -p 65002 u876334876@145.79.25.103

# Load NVM
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"

# Start the application
cd ~/domains/parenta.com.mx/nodejs-app
pm2 start npm --name "parenta-app" -- start
pm2 save
```

### Even Faster (One-liner from your Mac)
```bash
cd /Users/adrianestopace/Documents/oneph/parenta-nextjs && \
sshpass -p "$SSH_PASS" ssh -p 65002 u876334876@145.79.25.103 \
'export NVM_DIR="$HOME/.nvm" && \
 source "$NVM_DIR/nvm.sh" && \
 cd ~/domains/parenta.com.mx/nodejs-app && \
 pm2 start npm --name "parenta-app" -- start && \
 pm2 save'
```

---

## Why This Happens

### Common Causes
1. **Server Reboot** - PM2 doesn't auto-start on shared hosting (no systemd)
2. **Out of Memory** - Shared hosting has memory limits
3. **Process Killed** - Hosting provider may kill processes during maintenance
4. **PM2 Daemon Restart** - PM2 daemon restarted without saved processes

### Shared Hosting Limitations
- ❌ No systemd access (can't set PM2 to auto-start on boot)
- ❌ Limited memory (~512MB-1GB)
- ❌ No root access for system-level configuration
- ✅ PM2 can still manage the process during uptime
- ✅ PM2 auto-restarts on crashes

---

## Diagnostic Steps

### 1. Check if PM2 is Running
```bash
pm2 status
```

**If empty:** Application is not running (503 error expected)

### 2. Check Logs
```bash
pm2 logs parenta-app --lines 50
```

Look for:
- Memory errors (out of memory)
- Database connection errors
- Port already in use
- Application crashes

### 3. Check Process Memory
```bash
pm2 monit
```

Monitor CPU and memory usage.

---

## Solutions

### Solution 1: Restart Application (Most Common)
```bash
pm2 restart parenta-app
```

If process doesn't exist:
```bash
cd ~/domains/parenta.com.mx/nodejs-app
pm2 start npm --name "parenta-app" -- start
pm2 save
```

### Solution 2: Clear Cache and Restart
If app keeps crashing:
```bash
cd ~/domains/parenta.com.mx/nodejs-app
rm -rf .next/cache
pm2 restart parenta-app
```

### Solution 3: Full Rebuild
If nothing works:
```bash
cd ~/domains/parenta.com.mx/nodejs-app
rm -rf .next
npm run build
pm2 restart parenta-app
```

### Solution 4: Redeploy from Local
If server files are corrupted:
```bash
# From your Mac
cd /Users/adrianestopace/Documents/oneph/parenta-nextjs
./scripts/deploy-with-manual-nodejs.sh
```

---

## Prevention Strategies

### 1. Monitor Application
Set up monitoring:
```bash
pm2 monit
```

### 2. Check Logs Regularly
```bash
pm2 logs parenta-app --lines 100
```

### 3. Deploy During Low Traffic
- Deploy during off-peak hours
- Warn users before deployment

### 4. Keep PM2 Configuration Saved
After any PM2 changes:
```bash
pm2 save
```

### 5. Optimize Memory Usage
- Monitor memory with `pm2 monit`
- Consider upgrading hosting if consistently hitting limits
- Optimize application code for memory efficiency

---

## Escalation

### If Problem Persists

1. **Check Hostinger Status**
   - Go to hPanel
   - Check for maintenance notifications
   - Contact support if server issues

2. **Check Database Connection**
   ```bash
   cd ~/domains/parenta.com.mx/nodejs-app
   node -e "require('pg').Pool({connectionString: process.env.DATABASE_URL}).query('SELECT NOW()')"
   ```

3. **Verify Environment Variables**
   ```bash
   cat ~/domains/parenta.com.mx/nodejs-app/.env.production
   ```

4. **Check Port Availability**
   ```bash
   netstat -tuln | grep 3030
   ```

5. **Review Application Code**
   - Check recent commits for breaking changes
   - Test locally first
   - Rollback if needed

---

## Emergency Contacts

**Hostinger Support:**
- Live Chat: Available 24/7 in hPanel
- Email: support@hostinger.com

**Supabase (Database):**
- Dashboard: https://app.supabase.com
- Status: https://status.supabase.com

---

## Quick Reference Commands

```bash
# SSH Access
ssh -p 65002 u876334876@145.79.25.103

# Load Node.js
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"

# PM2 Commands
pm2 status                    # Check status
pm2 logs parenta-app         # View logs
pm2 restart parenta-app      # Restart
pm2 stop parenta-app         # Stop
pm2 start parenta-app        # Start
pm2 monit                    # Monitor resources
pm2 save                     # Save configuration

# Application
cd ~/domains/parenta.com.mx/nodejs-app

# Start Application
pm2 start npm --name "parenta-app" -- start

# Check Website
curl -I https://parenta.com.mx
```

---

## Notes

- **Shared hosting limitations** prevent automatic startup on server reboot
- **Manual restart required** after server maintenance/reboot
- **Consider VPS** if frequent reboots become an issue
- **PM2 auto-restarts** the app if it crashes during normal operation

---

**Last Updated:** November 13, 2025  
**Status:** Active monitoring recommended  
**Prevention:** Regular checks and monitoring

