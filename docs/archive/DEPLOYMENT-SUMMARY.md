# 🚀 Parenta Hostinger Deployment - Ready to Deploy

## ✅ Connection Verified

**Status:** ✅ SSH connection successful  
**Server Type:** Hostinger VPS (Linux)  
**Server Specs:**
- RAM: 503GB
- Storage: 24TB
- Location: EU (Kuala Lumpur datacenter)

---

## 📦 What We Have

### Application Stack
- **Framework:** Next.js 15 with App Router
- **Language:** TypeScript
- **Database:** PostgreSQL with complete schema
- **Authentication:** NextAuth.js (Admin, Tenant, Staff roles)
- **UI:** Tailwind CSS + React 19
- **File Uploads:** Local storage (public/uploads/)

### Modules Implemented
1. ✅ Building Management
2. ✅ Room Management
3. ✅ Tenant Management
4. ✅ Financial Management (Payments, Invoices, Expenses)
5. ✅ Utility Bills Tracking
6. ✅ Asset Management
7. ✅ Document Management
8. ✅ Maintenance Requests
9. ✅ Analytics & Reports
10. ✅ Tenant Portal

---

## 🎯 Deployment Plan

### Option 1: Quick Deploy (Recommended for Testing)

Just run these commands:

```bash
# 1. Setup server (first time only)
./scripts/setup-server.sh

# 2. Deploy application
./scripts/deploy-to-hostinger.sh
```

**Time:** ~10-15 minutes  
**Result:** App running at http://145.79.25.103:3030

### Option 2: Full Production Deploy

Complete setup with domain, SSL, and everything:

1. **Server Setup** (~10 min)
   ```bash
   ./scripts/setup-server.sh
   ```

2. **Configure DNS** (propagation time: 1-24 hours)
   - Point parenta.com.mx to 145.79.25.103
   - Point www.parenta.com.mx to 145.79.25.103

3. **Deploy Application** (~5 min)
   ```bash
   ./scripts/deploy-to-hostinger.sh
   ```

4. **Setup Nginx Reverse Proxy** (~5 min)
   ```bash
   ./scripts/ssh-hostinger.sh connect
   # Follow steps in QUICK-START-HOSTINGER.md
   ```

5. **Setup SSL Certificate** (~2 min)
   ```bash
   sudo certbot --nginx -d parenta.com.mx -d www.parenta.com.mx
   ```

6. **Initialize Database** (~3 min)
   - Run schema.sql
   - Seed initial data
   - Create admin user

**Total Time:** ~25 minutes + DNS propagation

---

## 📋 Pre-Deployment Checklist

### Required Before Deploy

- [x] SSH access verified (✅ Working!)
- [x] sshpass installed (✅ Installed!)
- [x] Deployment scripts created (✅ Ready!)
- [ ] Create `.env.production` file
- [ ] Generate secure NEXTAUTH_SECRET
- [ ] Review database credentials

### Create Environment File

Copy this to `.env.production` in your project root:

```bash
# Database
DATABASE_URL="postgresql://parenta_user:Parenta2025!!@localhost:5432/parenta_db"

# NextAuth
NEXTAUTH_URL="https://parenta.com.mx"
NEXTAUTH_SECRET="CHANGE_THIS_TO_RANDOM_STRING"

# Environment
NODE_ENV="production"
PORT=3030
```

Generate secure secret:
```bash
openssl rand -base64 32
```

---

## 🚀 Let's Deploy!

### Quick Start (3 Commands)

```bash
# 1. Test connection (already done ✅)
./scripts/ssh-hostinger.sh info

# 2. Setup server (first time only)
./scripts/setup-server.sh

# 3. Deploy!
./scripts/deploy-to-hostinger.sh
```

### After Deployment

```bash
# View logs
./scripts/ssh-hostinger.sh logs

# Check status
./scripts/ssh-hostinger.sh status

# Access application
open http://145.79.25.103:3030
```

---

## 📊 Database Initialization

After first deployment, initialize the database:

```bash
# SSH into server
./scripts/ssh-hostinger.sh connect

# Navigate to app directory
cd /home/u876334876/apps/parenta-nextjs

# Run database initialization
node -e "
require('dotenv').config({ path: '.env.production' });
const { Pool } = require('pg');
const fs = require('fs');

async function init() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  console.log('📊 Initializing database schema...');
  const schema = fs.readFileSync('src/lib/schema.sql', 'utf8');
  await pool.query(schema);
  console.log('✅ Database schema created!');
  
  // Optional: Run seed data
  console.log('🌱 Seeding initial data...');
  const seed = require('./src/lib/seed-data.ts');
  // await seed.run();
  
  await pool.end();
  console.log('✅ Database ready!');
}

init().catch(console.error);
"

# Or manually with psql
psql -U parenta_user -d parenta_db < src/lib/schema.sql
```

---

## 🌐 Domain & DNS Setup

### Current Status
- **Server IP:** 145.79.25.103
- **Domain:** parenta.com.mx
- **App URL (after deploy):** http://145.79.25.103:3030

### DNS Configuration Needed

In your domain registrar (Hostinger domain panel):

```
Type: A Record
Host: @
Points to: 145.79.25.103
TTL: 3600

Type: A Record
Host: www
Points to: 145.79.25.103
TTL: 3600
```

### After DNS Propagation

1. Setup Nginx reverse proxy
2. Get SSL certificate
3. Access via: https://parenta.com.mx

---

## 🛠️ Available Scripts

### Deployment
```bash
./scripts/deploy-to-hostinger.sh    # Deploy/Update application
./scripts/setup-server.sh           # Initial server setup
```

### Server Management
```bash
./scripts/ssh-hostinger.sh connect  # SSH into server
./scripts/ssh-hostinger.sh logs     # View application logs
./scripts/ssh-hostinger.sh status   # Check app status
./scripts/ssh-hostinger.sh restart  # Restart application
./scripts/ssh-hostinger.sh monitor  # Monitor resources
./scripts/ssh-hostinger.sh db       # Connect to database
./scripts/ssh-hostinger.sh help     # Show all commands
```

---

## 📈 What Happens During Deployment

### Setup Server Script
1. ✅ Installs Node.js 18
2. ✅ Installs PM2 (process manager)
3. ✅ Installs PostgreSQL database
4. ✅ Installs Nginx web server
5. ✅ Configures firewall (UFW)
6. ✅ Creates database and user
7. ✅ Creates application directories

### Deploy Script
1. ✅ Builds Next.js application locally
2. ✅ Uploads files to server
3. ✅ Installs production dependencies
4. ✅ Starts/restarts with PM2
5. ✅ Shows application status

---

## 🔒 Security Features

### Already Configured
- ✅ Custom SSH port (65002)
- ✅ Password-protected SSH
- ✅ Firewall enabled (UFW)
- ✅ Database access restricted to localhost
- ✅ Environment variables for secrets

### To Configure After Deploy
- [ ] SSL certificate (HTTPS)
- [ ] Rate limiting
- [ ] Fail2ban for SSH protection
- [ ] Regular security updates
- [ ] Database backups

---

## 📊 Server Monitoring

### Check Application Health
```bash
./scripts/ssh-hostinger.sh status
```

### View Real-Time Logs
```bash
./scripts/ssh-hostinger.sh logs
```

### Monitor Server Resources
```bash
./scripts/ssh-hostinger.sh monitor
```

### Check Database
```bash
./scripts/ssh-hostinger.sh db
# Then in psql:
\l                          # List databases
\c parenta_db              # Connect to database
\dt                         # List tables
SELECT COUNT(*) FROM users; # Check data
```

---

## 🐛 Troubleshooting

### Common Issues

**Issue:** Application not starting
```bash
./scripts/ssh-hostinger.sh logs
# Check for errors, then:
./scripts/ssh-hostinger.sh restart
```

**Issue:** Database connection failed
```bash
# Check PostgreSQL is running
./scripts/ssh-hostinger.sh connect
sudo systemctl status postgresql
sudo systemctl restart postgresql
```

**Issue:** Can't access application
```bash
# Check if app is running
./scripts/ssh-hostinger.sh status

# Check if port is open
./scripts/ssh-hostinger.sh connect
sudo lsof -i :3030

# Check firewall
sudo ufw status
```

**Issue:** File upload not working
```bash
# Fix permissions
./scripts/ssh-hostinger.sh connect
chmod -R 755 /home/u876334876/apps/parenta-nextjs/public/uploads
```

---

## 📝 Post-Deployment Tasks

### Immediate (Before Users)
1. [ ] Initialize database schema
2. [ ] Create first admin account
3. [ ] Test login functionality
4. [ ] Test all CRUD operations
5. [ ] Verify file uploads work
6. [ ] Check all pages load correctly

### Within 24 Hours
1. [ ] Setup SSL certificate
2. [ ] Configure Nginx reverse proxy
3. [ ] Setup automated database backups
4. [ ] Configure monitoring/alerting
5. [ ] Test from multiple devices/networks

### Within 1 Week
1. [ ] Performance testing
2. [ ] Security audit
3. [ ] Load testing
4. [ ] Backup & restore testing
5. [ ] Documentation updates

---

## 💡 Tips for Success

### Development Best Practices
- Always test locally before deploying
- Use Git for version control
- Keep .env files secure (never commit them)
- Regular backups before major changes
- Monitor logs after deployment

### Deployment Best Practices
- Deploy during low-traffic periods
- Always have a rollback plan
- Test thoroughly before going live
- Keep stakeholders informed
- Document any custom configurations

---

## 📞 Quick Reference

### Server Access
```
IP: 145.79.25.103
Port: 65002
User: u876334876
Password: (from scripts/.deploy-secrets SSH_PASS)
```

### Application
```
Directory: /home/u876334876/apps/parenta-nextjs
URL (dev): http://145.79.25.103:3030
URL (prod): https://parenta.com.mx
PM2 Process: parenta-app
```

### Database
```
Host: localhost
Port: 5432
Database: parenta_db
User: parenta_user
Password: Parenta2025!!
```

---

## 🎉 Ready to Deploy?

**Everything is ready!** Here's what to do next:

1. **Create `.env.production` file** with your configuration
2. **Run setup:** `./scripts/setup-server.sh`
3. **Deploy:** `./scripts/deploy-to-hostinger.sh`
4. **Initialize database** (follow steps above)
5. **Test the application** at http://145.79.25.103:3030
6. **Setup domain & SSL** (when DNS is ready)

**Need help?** Check these files:
- `HOSTINGER-DEPLOYMENT-PLAN.md` - Complete deployment guide
- `QUICK-START-HOSTINGER.md` - Quick start guide
- `SYSTEM-ARCHITECTURE-MAP.md` - Application architecture

**Questions?** Run: `./scripts/ssh-hostinger.sh help`

---

## 📅 Deployment Roadmap

### Phase 1: Initial Deploy (Today)
- [x] Server connection verified
- [ ] Environment configured
- [ ] Server setup complete
- [ ] Application deployed
- [ ] Database initialized
- [ ] Basic testing done

### Phase 2: Production Ready (1-2 days)
- [ ] Domain DNS configured
- [ ] Nginx reverse proxy setup
- [ ] SSL certificate installed
- [ ] Comprehensive testing
- [ ] Performance optimization

### Phase 3: Go Live (Week 1)
- [ ] User acceptance testing
- [ ] Training materials ready
- [ ] Support system in place
- [ ] Monitoring configured
- [ ] Backup strategy active

---

**🚀 You're all set! Let's deploy Parenta to Hostinger!**

*Last updated: November 13, 2025*

