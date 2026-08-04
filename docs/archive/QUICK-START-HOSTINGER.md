# 🚀 Quick Start: Deploy to Hostinger

## Prerequisites

### 1. Install sshpass (Required)

**macOS:**
```bash
brew install hudochenkov/sshpass/sshpass
```

**Linux:**
```bash
sudo apt-get install sshpass
```

**Windows (WSL required):**
```bash
sudo apt-get install sshpass
```

---

## 🎯 Three-Step Deployment

### Step 1: Setup Server (First Time Only)

This installs all required software on the Hostinger server:

```bash
./scripts/setup-server.sh
```

This will install:
- ✅ Node.js 18
- ✅ PM2 Process Manager
- ✅ PostgreSQL Database
- ✅ Nginx Web Server
- ✅ SSL Certificate Tools
- ✅ Firewall Configuration

**Time:** ~5-10 minutes

---

### Step 2: Configure Environment Variables

Create `.env.production` in your project root:

```bash
# Database Configuration
DATABASE_URL="postgresql://parenta_user:Parenta2025!!@localhost:5432/parenta_db"

# NextAuth Configuration
NEXTAUTH_URL="https://parenta.com.mx"
NEXTAUTH_SECRET="your-super-secret-nextauth-string-change-this-in-production"

# Node Environment
NODE_ENV="production"

# Application Port
PORT=3030
```

**Generate a secure NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

---

### Step 3: Deploy Application

```bash
./scripts/deploy-to-hostinger.sh
```

This will:
- ✅ Build your Next.js app
- ✅ Upload files to server
- ✅ Install dependencies
- ✅ Start application with PM2

**Time:** ~3-5 minutes

---

## 🛠️ Quick Commands

### SSH into Server
```bash
./scripts/ssh-hostinger.sh connect
```

### View Application Logs
```bash
./scripts/ssh-hostinger.sh logs
```

### Check Application Status
```bash
./scripts/ssh-hostinger.sh status
```

### Restart Application
```bash
./scripts/ssh-hostinger.sh restart
```

### Monitor Resources
```bash
./scripts/ssh-hostinger.sh monitor
```

### All Available Commands
```bash
./scripts/ssh-hostinger.sh help
```

---

## 📊 Database Setup

### Initialize Database Schema

After first deployment, SSH into the server and run:

```bash
./scripts/ssh-hostinger.sh connect
```

Then on the server:

```bash
cd /home/u876334876/apps/parenta-nextjs
node -e "
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const schema = fs.readFileSync('src/lib/schema.sql', 'utf8');
pool.query(schema).then(() => {
  console.log('✅ Database initialized');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
"
```

Or manually:

```bash
./scripts/ssh-hostinger.sh db

# In PostgreSQL shell:
\i /home/u876334876/apps/parenta-nextjs/src/lib/schema.sql
\q
```

---

## 🌐 Setup Nginx Reverse Proxy

### Step 1: Create Nginx Configuration

```bash
./scripts/ssh-hostinger.sh connect
```

Then on server:

```bash
sudo nano /etc/nginx/sites-available/parenta
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name parenta.com.mx www.parenta.com.mx;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3030;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 2: Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/parenta /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 3: Setup SSL Certificate

```bash
sudo certbot --nginx -d parenta.com.mx -d www.parenta.com.mx
```

---

## 🔒 DNS Configuration

Point your domain to the server:

```
Type: A Record
Name: @
Value: 145.79.25.103
TTL: 3600

Type: A Record  
Name: www
Value: 145.79.25.103
TTL: 3600
```

**Propagation time:** 1-24 hours

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Application accessible at `http://SERVER_IP:3030`
- [ ] Database connection working
- [ ] Can create admin account
- [ ] Can login as admin
- [ ] All CRUD operations work
- [ ] File uploads work
- [ ] Nginx reverse proxy configured
- [ ] SSL certificate installed
- [ ] Domain resolves to server
- [ ] HTTPS working

---

## 🐛 Common Issues & Solutions

### Issue: "sshpass: command not found"
**Solution:** Install sshpass (see Prerequisites above)

### Issue: "Connection refused"
**Solution:** 
```bash
# Check if app is running
./scripts/ssh-hostinger.sh status

# Restart if needed
./scripts/ssh-hostinger.sh restart
```

### Issue: "Database connection failed"
**Solution:**
```bash
# Test database connection
./scripts/ssh-hostinger.sh db

# If connection fails, check PostgreSQL status
./scripts/ssh-hostinger.sh connect
sudo systemctl status postgresql
sudo systemctl restart postgresql
```

### Issue: "Port 3030 already in use"
**Solution:**
```bash
./scripts/ssh-hostinger.sh connect
sudo lsof -i :3030
pm2 restart parenta-app
```

### Issue: "Permission denied for uploads"
**Solution:**
```bash
./scripts/ssh-hostinger.sh connect
chmod -R 755 /home/u876334876/apps/parenta-nextjs/public/uploads
```

---

## 📈 Monitoring

### View Real-Time Logs
```bash
./scripts/ssh-hostinger.sh logs
```

### Check Server Resources
```bash
./scripts/ssh-hostinger.sh info
```

### Monitor Application
```bash
./scripts/ssh-hostinger.sh monitor
```

### View Nginx Logs
```bash
./scripts/ssh-hostinger.sh nginx
```

---

## 🔄 Update/Redeploy

To deploy updates after making changes:

```bash
# Commit your changes
git add .
git commit -m "Your changes"

# Deploy
./scripts/deploy-to-hostinger.sh
```

The script will:
1. Build locally
2. Upload new files
3. Restart application
4. Show status

---

## 💾 Backup

### Manual Database Backup

```bash
./scripts/ssh-hostinger.sh connect

# Create backup
pg_dump -U parenta_user parenta_db > backup_$(date +%Y%m%d).sql

# Download backup to local machine
# (Run from local machine)
sshpass -p "$SSH_PASS" scp -P 65002 u876334876@145.79.25.103:~/backup_*.sql ./backups/
```

### Automated Daily Backups

Create cron job on server:

```bash
./scripts/ssh-hostinger.sh connect

# Edit crontab
crontab -e

# Add this line (backup daily at 2 AM)
0 2 * * * pg_dump -U parenta_user parenta_db | gzip > ~/backups/parenta_db_$(date +\%Y\%m\%d).sql.gz
```

---

## 🆘 Emergency Commands

### Application Down - Quick Fix
```bash
./scripts/ssh-hostinger.sh restart
```

### Server Restart
```bash
./scripts/ssh-hostinger.sh connect
sudo reboot
```

### View All PM2 Processes
```bash
./scripts/ssh-hostinger.sh connect
pm2 list
```

### Kill and Restart Everything
```bash
./scripts/ssh-hostinger.sh connect
pm2 kill
cd /home/u876334876/apps/parenta-nextjs
pm2 start npm --name "parenta-app" -- start
pm2 save
```

---

## 📞 Server Access Details

```
IP Address:  145.79.25.103
SSH Port:    65002
Username:    u876334876
Password:    (scripts/.deploy-secrets → SSH_PASS)

App Directory: /home/u876334876/apps/parenta-nextjs
Logs: pm2 logs parenta-app
```

---

## 🎯 Next Steps After Deployment

1. **Test Everything**
   - Login as admin
   - Create test data
   - Test all CRUD operations
   - Upload test files

2. **Setup Monitoring**
   - Configure uptime monitoring
   - Setup error alerting
   - Monitor disk space

3. **Security Hardening**
   - Change default passwords
   - Configure fail2ban
   - Regular security updates

4. **Performance Optimization**
   - Enable PM2 cluster mode
   - Configure caching
   - Optimize database queries

5. **Backup Strategy**
   - Setup automated backups
   - Test restore procedures
   - Off-site backup storage

---

**Need Help?** Check the full deployment plan: `HOSTINGER-DEPLOYMENT-PLAN.md`

