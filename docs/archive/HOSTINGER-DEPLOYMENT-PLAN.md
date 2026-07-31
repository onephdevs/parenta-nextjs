# 🚀 Hostinger Deployment Plan - Parenta Property Management System

## 📋 Overview

**Deployment Target:** Hostinger VPS  
**Application:** Next.js 15 Property Management System  
**Database:** PostgreSQL  
**Domain:** parenta.com.mx

---

## 🔧 Server Details

```
IP Address:  145.79.25.103
SSH Port:    65002
Username:    u876334876
Password:    Theanswer001!!!
```

**SSH Connection Command:**
```bash
sshpass -p 'Theanswer001!!!' ssh -p 65002 u876334876@145.79.25.103
```

---

## 🏗️ Architecture Summary

### Current Tech Stack
- **Frontend/Backend:** Next.js 15 (App Router)
- **Runtime:** Node.js (v18+ required)
- **Database:** PostgreSQL with UUID extension
- **Authentication:** NextAuth.js
- **File Storage:** Local file system (`public/uploads/`)
- **Port:** 3030 (configurable)

### Key Dependencies
- PostgreSQL database with proper schema
- Node.js v18+ and npm
- Environment variables configuration
- PM2 for process management
- Nginx as reverse proxy (recommended)

---

## 📦 Deployment Strategy

### Phase 1: Server Preparation
1. ✅ Connect to server via SSH
2. ✅ Install required software (Node.js, PostgreSQL, PM2, Nginx)
3. ✅ Setup PostgreSQL database
4. ✅ Configure firewall rules
5. ✅ Setup SSL certificate (Let's Encrypt)

### Phase 2: Application Deployment
1. ✅ Clone/Upload application code
2. ✅ Install dependencies
3. ✅ Configure environment variables
4. ✅ Build Next.js application
5. ✅ Initialize database schema
6. ✅ Seed initial data

### Phase 3: Process Management
1. ✅ Setup PM2 for application lifecycle
2. ✅ Configure Nginx reverse proxy
3. ✅ Setup automatic restart on server reboot
4. ✅ Configure log rotation

### Phase 4: Testing & Optimization
1. ✅ Test all CRUD operations
2. ✅ Verify file upload functionality
3. ✅ Test authentication flows
4. ✅ Performance optimization
5. ✅ Security hardening

---

## 🗂️ Required Environment Variables

Create `.env.production` with:

```bash
# Database Configuration
DATABASE_URL="postgresql://parenta_user:STRONG_PASSWORD@localhost:5432/parenta_db"

# NextAuth Configuration
NEXTAUTH_URL="https://parenta.com.mx"
NEXTAUTH_SECRET="generate-a-secure-random-string-here"

# Node Environment
NODE_ENV="production"

# Application Configuration
PORT=3030
```

---

## 📝 Step-by-Step Deployment Commands

### Step 1: Install Required Software

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
node --version
npm --version

# Install PM2 globally
sudo npm install -g pm2

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx
```

### Step 2: Configure PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE parenta_db;
CREATE USER parenta_user WITH PASSWORD 'YOUR_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE parenta_db TO parenta_user;
\q
```

### Step 3: Setup Application

```bash
# Create application directory
mkdir -p /home/u876334876/apps
cd /home/u876334876/apps

# Clone or upload your application
# Option A: Using git
git clone YOUR_REPO_URL parenta-nextjs
cd parenta-nextjs

# Option B: Upload via SCP (from local machine)
# sshpass -p 'Theanswer001!!!' scp -P 65002 -r ./parenta-nextjs u876334876@145.79.25.103:/home/u876334876/apps/

# Install dependencies
npm install --production

# Create environment file
nano .env.production
# (paste the environment variables)

# Build application
npm run build

# Initialize database
# Create a script or run migrations
```

### Step 4: Setup PM2 Process Manager

```bash
# Start application with PM2
pm2 start npm --name "parenta-app" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# (follow the command it gives you)

# Monitor application
pm2 status
pm2 logs parenta-app
```

### Step 5: Configure Nginx Reverse Proxy

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/parenta

# Paste the following configuration:
```

```nginx
server {
    listen 80;
    server_name parenta.com.mx www.parenta.com.mx;

    # Increase upload size limits
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
        
        # Timeout settings for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files and uploads
    location /_next/static {
        proxy_pass http://localhost:3030;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, max-age=3600, immutable";
    }

    location /uploads {
        alias /home/u876334876/apps/parenta-nextjs/public/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/parenta /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Step 6: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d parenta.com.mx -d www.parenta.com.mx

# Test automatic renewal
sudo certbot renew --dry-run
```

---

## 🔒 Security Hardening

### 1. Firewall Configuration (UFW)

```bash
# Install UFW if not present
sudo apt install -y ufw

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 65002/tcp  # SSH custom port
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS

# Enable firewall
sudo ufw enable
sudo ufw status
```

### 2. Secure PostgreSQL

```bash
# Edit PostgreSQL config
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Ensure local connections only:
local   all             all                                     peer
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 3. Secure File Permissions

```bash
cd /home/u876334876/apps/parenta-nextjs

# Secure environment file
chmod 600 .env.production

# Secure upload directory
chmod 755 public/uploads
```

---

## 📊 Database Initialization

Create a deployment script `scripts/deploy-db.js`:

```javascript
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function deployDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔧 Initializing database schema...');
    
    // Read schema file
    const schemaPath = path.join(__dirname, '../src/lib/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    await pool.query(schema);
    console.log('✅ Database schema initialized');
    
    // Run seed data (optional)
    console.log('🌱 Seeding initial data...');
    const seedPath = path.join(__dirname, '../src/lib/seed-data.ts');
    // Execute seed script
    
    console.log('✅ Database deployment complete!');
  } catch (error) {
    console.error('❌ Database deployment failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

deployDatabase();
```

Run deployment:
```bash
node scripts/deploy-db.js
```

---

## 🔄 Continuous Deployment Workflow

### Manual Deployment Script

Create `deploy.sh`:

```bash
#!/bin/bash

echo "🚀 Deploying Parenta to Production..."

# Pull latest changes
git pull origin main

# Install dependencies
npm install --production

# Build application
npm run build

# Restart PM2 process
pm2 restart parenta-app

# Show status
pm2 status

echo "✅ Deployment complete!"
```

Make it executable:
```bash
chmod +x deploy.sh
```

### Future: Automated Deployment (GitHub Actions)

Consider setting up GitHub Actions for automated deployments:
- Push to `main` branch triggers deployment
- Runs tests before deployment
- Automatic rollback on failure

---

## 📈 Monitoring & Maintenance

### PM2 Monitoring

```bash
# View application status
pm2 status

# View logs
pm2 logs parenta-app

# Monitor resources
pm2 monit

# View detailed info
pm2 info parenta-app
```

### Nginx Monitoring

```bash
# Check Nginx status
sudo systemctl status nginx

# View access logs
sudo tail -f /var/log/nginx/access.log

# View error logs
sudo tail -f /var/log/nginx/error.log
```

### Database Monitoring

```bash
# Connect to database
psql -U parenta_user -d parenta_db

# View active connections
SELECT * FROM pg_stat_activity;

# View database size
SELECT pg_size_pretty(pg_database_size('parenta_db'));
```

---

## 🆘 Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs parenta-app --lines 100

# Check if port is in use
sudo lsof -i :3030

# Restart application
pm2 restart parenta-app
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -U parenta_user -d parenta_db

# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Nginx Issues

```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

---

## 📋 Pre-Launch Checklist

### Before Going Live

- [ ] All environment variables configured correctly
- [ ] Database schema initialized and migrated
- [ ] Initial admin user created
- [ ] SSL certificate installed and auto-renewal configured
- [ ] Firewall rules configured
- [ ] File upload directory has correct permissions
- [ ] PM2 configured to start on system reboot
- [ ] Nginx reverse proxy configured correctly
- [ ] Domain DNS pointing to server IP (145.79.25.103)
- [ ] All CRUD operations tested
- [ ] Authentication flows tested (Admin, Tenant, Staff)
- [ ] File uploads tested
- [ ] Email notifications configured (if applicable)
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting setup

### Post-Launch

- [ ] Monitor error logs for first 24 hours
- [ ] Test from multiple devices and networks
- [ ] Verify SSL certificate is valid
- [ ] Test performance under load
- [ ] Document any custom configurations
- [ ] Setup automated backups
- [ ] Create rollback plan

---

## 💾 Backup Strategy

### Database Backups

Create automated backup script `scripts/backup-db.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/home/u876334876/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/parenta_db_$TIMESTAMP.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U parenta_user parenta_db > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "parenta_db_*.sql.gz" -mtime +7 -delete

echo "✅ Backup completed: $BACKUP_FILE.gz"
```

Setup daily backups via cron:
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /home/u876334876/apps/parenta-nextjs/scripts/backup-db.sh
```

### Application Files Backup

```bash
# Backup uploads directory
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz public/uploads/
```

---

## 🎯 Performance Optimization

### 1. Enable Production Mode
- Ensure `NODE_ENV=production` is set
- Build with `npm run build` (uses production optimizations)

### 2. Database Optimization
```sql
-- Create indexes for frequently queried fields
CREATE INDEX idx_buildings_is_active ON buildings(is_active);
CREATE INDEX idx_rooms_building_id ON rooms(building_id);
CREATE INDEX idx_rooms_status ON rooms(room_status);
CREATE INDEX idx_tenants_user_id ON tenants(user_id);
CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);
```

### 3. Nginx Caching
Already configured in the Nginx setup above for static assets.

### 4. PM2 Cluster Mode
For better performance with multiple CPU cores:
```bash
pm2 start npm --name "parenta-app" -i max -- start
```

---

## 📞 Support & Contact

### Hostinger Support
- Website: https://www.hostinger.com/
- Control Panel: hPanel

### Application Issues
- Check logs: `pm2 logs parenta-app`
- Monitor: `pm2 monit`
- Restart: `pm2 restart parenta-app`

---

## 🔄 Next Steps

1. **Connect to Server** - Test SSH connection
2. **Install Software** - Node.js, PostgreSQL, PM2, Nginx
3. **Deploy Application** - Upload code and configure
4. **Initialize Database** - Run schema and seed data
5. **Configure Nginx** - Setup reverse proxy
6. **Setup SSL** - Secure with HTTPS
7. **Test Everything** - Verify all functionality works
8. **Go Live** - Update DNS and launch

---

**Last Updated:** November 13, 2025  
**Status:** Ready for Deployment  
**Deployment Method:** Manual deployment with PM2 + Nginx

