# 🚀 PARENTA - QUICK REFERENCE CARD

## 🌐 Access URLs

**Current (Direct IP):**
```
http://145.79.25.103:3030
```

**After DNS Setup:**
```
https://parenta.com.mx
```

---

## 🔐 SSH Access

```bash
# Quick connect
./scripts/ssh-hostinger.sh connect

# Or manually
ssh -p 65002 u876334876@145.79.25.103
Password: Theanswer001!!!
```

---

## 🔧 Common PM2 Commands

```bash
# View logs
pm2 logs parenta-app

# Check status
pm2 status

# Restart app
pm2 restart parenta-app

# Stop app
pm2 stop parenta-app

# Monitor CPU/Memory
pm2 monit

# View app info
pm2 info parenta-app
```

---

## 🚀 Deploy Updates

```bash
# Automatic deployment
./scripts/deploy-with-manual-nodejs.sh

# Manual deployment
npm run build
sshpass -p 'Theanswer001!!!' rsync -avz -e "ssh -p 65002" .next/ u876334876@145.79.25.103:~/domains/parenta.com.mx/nodejs-app/.next/
sshpass -p 'Theanswer001!!!' ssh -p 65002 u876334876@145.79.25.103 'pm2 restart parenta-app'
```

---

## 📂 Server Paths

```
Application: ~/domains/parenta.com.mx/nodejs-app
Environment: ~/domains/parenta.com.mx/nodejs-app/.env.production
Logs: ~/.pm2/logs/parenta-app-*.log
Node.js: ~/.nvm/versions/node/v18.20.8
```

---

## 🗃️ Database

**Initialize Database:**
```
http://145.79.25.103:3030/api/init-db
```

**Connection:**
- Host: aws-1-ap-southeast-1.pooler.supabase.com
- Port: 6543 (pooled)
- Database: postgres

---

## 👤 Default Admin

**Email:** admin@parenta.com  
**Password:** admin123  
⚠️ Change immediately after first login!

---

## 📊 Server Info

- **IP:** 145.79.25.103
- **Port:** 3030
- **Node:** v18.20.8
- **PM2:** 6.0.13
- **Domain:** parenta.com.mx

---

## 🆘 Emergency Restart

```bash
ssh -p 65002 u876334876@145.79.25.103
cd ~/domains/parenta.com.mx/nodejs-app
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
pm2 restart parenta-app
```

---

## 📞 Support

- **Hostinger:** Live chat in hPanel
- **GitHub:** github.com/onephdevs/parenta-nextjs
- **Deployment Guide:** DEPLOYMENT-SUCCESS.md

---

**Status:** ✅ LIVE  
**Last Updated:** Nov 13, 2025

