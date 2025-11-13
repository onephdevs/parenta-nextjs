# 🚀 Parenta Deployment Workflow - Quick Guide

## Production Setup

**Live Application:** https://parenta.com.mx  
**Status:** ✅ LIVE and operational  
**Last Updated:** November 13, 2025

---

## 📋 Standard Development → Deployment Workflow

### 1️⃣ **Develop Locally**
```bash
# Start development server
npm run dev

# Test at http://localhost:3030
# Make your changes, test features
```

### 2️⃣ **Test & Verify**
- ✅ Test all CRUD operations
- ✅ Verify authentication flows
- ✅ Check responsive design
- ✅ Test database connections
- ✅ Ensure no console errors
- ✅ Run any tests

### 3️⃣ **Commit to GitHub**
```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: add new tenant dashboard feature"

# Push to GitHub
git push origin main
```

### 4️⃣ **Deploy to Production**
```bash
# One command deployment
./scripts/deploy-with-manual-nodejs.sh
```

**What this does automatically:**
1. ✅ Pushes latest changes to GitHub
2. ✅ Connects to Hostinger server via SSH
3. ✅ Pulls latest code from GitHub
4. ✅ Installs/updates dependencies
5. ✅ Builds application (locally for speed)
6. ✅ Uploads built files to server
7. ✅ Restarts PM2 process manager
8. ✅ Verifies app is running

### 5️⃣ **Verify Deployment**
```bash
# Check if website is accessible
curl -I https://parenta.com.mx
# Should return: HTTP/2 200

# Check app status on server
./scripts/ssh-hostinger.sh connect
pm2 status
pm2 logs parenta-app --lines 30
```

---

## 🔄 Deployment Methods

### Method 1: Automated Script ⭐ **RECOMMENDED**
```bash
./scripts/deploy-with-manual-nodejs.sh
```
- **Time:** ~2-3 minutes
- **Process:** Build locally, upload, restart
- **Best for:** Regular deployments after development

### Method 2: Git-Based Deployment
```bash
./scripts/deploy-git-auto.sh
```
- **Time:** ~5-7 minutes
- **Process:** Pull from GitHub on server, build on server, restart
- **Best for:** When you want everything done on the server

### Method 3: Manual Deployment
```bash
# Build locally
npm run build

# Upload
sshpass -p 'Theanswer001!!!' rsync -avz -e "ssh -p 65002" \
  .next/ u876334876@145.79.25.103:~/domains/parenta.com.mx/nodejs-app/.next/

# Restart
sshpass -p 'Theanswer001!!!' ssh -p 65002 u876334876@145.79.25.103 \
  'cd ~/domains/parenta.com.mx/nodejs-app && pm2 restart parenta-app'
```
- **Time:** ~3-4 minutes
- **Process:** Step-by-step control
- **Best for:** Debugging deployment issues

---

## 📅 When to Deploy

### ✅ **Deploy Right After:**
- Completing a feature (with all acceptance criteria met)
- Fixing a critical bug that affects production
- Testing locally and confirming everything works
- End of day with significant changes
- Before showing client/stakeholders new features

### ❌ **Don't Deploy:**
- During active development (wait for feature completion)
- With failing tests or linter errors
- Without testing locally first
- With console errors or warnings
- During high-traffic hours (if possible)

---

## 🔍 Post-Deployment Verification Checklist

After every deployment, verify:

```bash
# 1. Check if website is up
curl -I https://parenta.com.mx

# 2. SSH into server
./scripts/ssh-hostinger.sh connect

# 3. Check PM2 status
pm2 status
# Should show: status | online

# 4. Check logs for errors
pm2 logs parenta-app --lines 50
# Should have no errors

# 5. Test in browser
# Open: https://parenta.com.mx
# Test: Login, navigation, recent changes
```

**Complete Checklist:**
- [ ] Application accessible at https://parenta.com.mx
- [ ] PM2 status shows "online"
- [ ] No errors in PM2 logs
- [ ] Login functionality works
- [ ] Database connections working
- [ ] Recent features working as expected
- [ ] No console errors in browser
- [ ] Mobile responsive layout works

---

## 🛠️ Server Management Commands

### Quick SSH Access
```bash
# Connect to server
./scripts/ssh-hostinger.sh connect

# Or manually
ssh -p 65002 u876334876@145.79.25.103
```

### PM2 Process Management
```bash
# View app status
pm2 status

# View real-time logs
pm2 logs parenta-app

# View last 100 lines of logs
pm2 logs parenta-app --lines 100

# Restart application
pm2 restart parenta-app

# Stop application (use with caution!)
pm2 stop parenta-app

# Start application (if stopped)
pm2 start parenta-app

# Monitor CPU & Memory usage
pm2 monit

# View detailed app info
pm2 info parenta-app
```

### Application Paths on Server
```bash
# Application directory
cd ~/domains/parenta.com.mx/nodejs-app

# Environment variables
cat ~/domains/parenta.com.mx/nodejs-app/.env.production

# PM2 logs location
~/.pm2/logs/parenta-app-out.log    # Standard output
~/.pm2/logs/parenta-app-error.log  # Error logs
```

---

## 🚨 Emergency Procedures

### Quick Restart (If App is Down)
```bash
ssh -p 65002 u876334876@145.79.25.103
cd ~/domains/parenta.com.mx/nodejs-app
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
pm2 restart parenta-app
```

### Full Redeployment (If Something is Broken)
```bash
./scripts/deploy-with-manual-nodejs.sh
```

### Rollback (If New Deployment Has Issues)
```bash
# 1. Revert Git commit locally
git revert HEAD
git push origin main

# 2. Redeploy
./scripts/deploy-with-manual-nodejs.sh
```

### Check If Server is Responding
```bash
# Test HTTPS endpoint
curl -I https://parenta.com.mx

# Test if Node.js is running
ssh -p 65002 u876334876@145.79.25.103 'curl -I http://localhost:3030'
```

---

## 🔧 Troubleshooting

### Issue: Changes Not Appearing After Deployment

**Solution:**
```bash
# 1. Clear browser cache (Hard refresh: Cmd+Shift+R / Ctrl+Shift+R)

# 2. Check if PM2 restarted
./scripts/ssh-hostinger.sh connect
pm2 logs parenta-app --lines 30

# 3. Force rebuild on server
ssh -p 65002 u876334876@145.79.25.103
cd ~/domains/parenta.com.mx/nodejs-app
rm -rf .next
npm run build
pm2 restart parenta-app
```

### Issue: Application Won't Start

**Solution:**
```bash
# 1. Check logs for errors
./scripts/ssh-hostinger.sh connect
pm2 logs parenta-app --lines 100

# 2. Check environment variables
cat ~/domains/parenta.com.mx/nodejs-app/.env.production

# 3. Try restarting
pm2 restart parenta-app
```

### Issue: Database Connection Failed

**Solution:**
```bash
# 1. Verify environment variables
ssh -p 65002 u876334876@145.79.25.103
grep DATABASE_URL ~/domains/parenta.com.mx/nodejs-app/.env.production

# 2. Test database connection
cd ~/domains/parenta.com.mx/nodejs-app
node -e "require('pg').Pool({connectionString: process.env.DATABASE_URL}).query('SELECT NOW()')"
```

### Issue: 500 Server Error

**Solution:**
```bash
# 1. Check PM2 error logs
./scripts/ssh-hostinger.sh connect
pm2 logs parenta-app --err

# 2. Check recent code changes for syntax errors

# 3. Revert to previous working version
git revert HEAD
git push origin main
./scripts/deploy-with-manual-nodejs.sh
```

---

## 📚 Documentation References

### Main Documentation
- **[.cursorrules](./.cursorrules)** - Complete deployment workflow (lines 143-394)
- **[README.md](./README.md)** - Deployment section (lines 740-865)
- **[DEPLOYMENT-CONFIRMED.md](./DEPLOYMENT-CONFIRMED.md)** - Deployment verification
- **[DEPLOYMENT-SUCCESS.md](./DEPLOYMENT-SUCCESS.md)** - Complete setup guide
- **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** - Command quick reference

### Scripts
- **`scripts/deploy-with-manual-nodejs.sh`** - Main deployment script
- **`scripts/deploy-git-auto.sh`** - Git-based deployment
- **`scripts/ssh-hostinger.sh`** - SSH helper script

---

## 🎯 Quick Command Reference

```bash
# Development
npm run dev                                    # Start dev server
npm run build                                  # Build for production

# Deployment
./scripts/deploy-with-manual-nodejs.sh        # Deploy to production

# Server Access
./scripts/ssh-hostinger.sh connect            # Connect to server

# PM2 Management
pm2 status                                     # Check app status
pm2 logs parenta-app                          # View logs
pm2 restart parenta-app                       # Restart app
pm2 monit                                     # Monitor resources

# Verification
curl -I https://parenta.com.mx                # Check if app is up
```

---

## 🌐 Production Environment

**Application URL:** https://parenta.com.mx  
**Server:** 145.79.25.103 (Hostinger)  
**SSH Port:** 65002  
**Node.js:** v18.20.8  
**PM2:** v6.0.13  
**Database:** Supabase PostgreSQL  
**SSL:** Automatic HTTPS (LiteSpeed)

**Application Location:** `~/domains/parenta.com.mx/nodejs-app`  
**Environment File:** `~/domains/parenta.com.mx/nodejs-app/.env.production`  
**PM2 Logs:** `~/.pm2/logs/parenta-app-*.log`

---

## ✅ Deployment Workflow Summary

**In Simple Terms:**

1. **Code** → Write your features locally
2. **Test** → Make sure everything works
3. **Commit** → Push to GitHub
4. **Deploy** → Run one script: `./scripts/deploy-with-manual-nodejs.sh`
5. **Verify** → Check https://parenta.com.mx and PM2 logs

**That's it!** The script handles everything automatically.

---

## 🎓 Best Practices

### Do's ✅
- ✅ Always test locally before deploying
- ✅ Use descriptive commit messages
- ✅ Deploy after completing features
- ✅ Check PM2 logs after deployment
- ✅ Verify application in browser after deploy
- ✅ Deploy during low-traffic hours
- ✅ Keep deployment documentation updated

### Don'ts ❌
- ❌ Don't deploy untested code
- ❌ Don't deploy with linter errors
- ❌ Don't skip the verification step
- ❌ Don't deploy during active development
- ❌ Don't forget to commit before deploying
- ❌ Don't ignore PM2 error logs
- ❌ Don't deploy without a rollback plan

---

## 📞 Support

**Need Help?**
- Check documentation files listed above
- Review PM2 logs: `pm2 logs parenta-app`
- Test locally first: `npm run dev`
- Verify environment variables on server
- Contact server admin if persistent issues

---

**Last Updated:** November 13, 2025  
**Status:** ✅ Production Ready  
**Deployment Method:** Hybrid (Git + SSH + PM2)

---

*This workflow is integrated into `.cursorrules` and will be automatically suggested by Cursor AI when appropriate.*

