# 🎉 DEPLOYMENT SUCCESSFUL - Parenta on Hostinger

## Date: November 13, 2025

Your **Parenta Property Management System** is now **LIVE** on Hostinger shared hosting!

---

## ✅ Deployment Summary

### What Was Installed:
- **NVM** (Node Version Manager) v0.39.7
- **Node.js** v18.20.8 LTS
- **npm** 10.8.2
- **PM2** 6.0.13 (Process Manager for automatic restarts)

### Application Status:
- **Status:** ✅ Running
- **Location:** `~/domains/parenta.com.mx/nodejs-app`
- **Port:** 3030
- **Process:** Managed by PM2 (`parenta-app`)
- **Database:** Supabase PostgreSQL (configured)
- **Environment:** Production

---

## 🌐 Access Your Application

### Direct IP Access (Available Now):
```
http://145.79.25.103:3030
```

### Domain Access (After DNS Setup):
```
https://parenta.com.mx
```

---

## 🔐 Default Admin Account

After running database initialization:

**Email:** `admin@parenta.com`  
**Password:** `admin123`  
**Role:** Admin

> ⚠️ **Security Note:** Change this password immediately after first login!

---

## 📝 Important Next Steps

### 1. Test Your Application
Open in browser: `http://145.79.25.103:3030`
- ✅ Check if homepage loads
- ✅ Test login functionality
- ✅ Verify database connections

### 2. Initialize Database (If Not Already Done)
Visit: `http://145.79.25.103:3030/api/init-db`

This will create all necessary tables in your Supabase database.

### 3. Configure Your Domain DNS

In your domain registrar (GoDaddy, Namecheap, etc.):

**Add these DNS records:**
```
Type: A
Name: @
Value: 145.79.25.103
TTL: 14400
```

```
Type: A
Name: www
Value: 145.79.25.103
TTL: 14400
```

> DNS propagation can take 1-48 hours (usually 1-2 hours)

### 4. Set Up SSL Certificate

Once DNS is working:
1. Go to **hPanel** → **SSL/TLS**
2. Click **Manage SSL**
3. Enable SSL for `parenta.com.mx`
4. Wait for certificate activation (5-15 minutes)

### 5. Configure Port Forwarding (Optional)

To access without `:3030` in the URL:

**Option A: Contact Hostinger Support**
Ask them to set up a reverse proxy from port 80/443 to port 3030.

**Option B: Use .htaccess (if available)**
Create `/home/u876334876/domains/parenta.com.mx/public_html/.htaccess`:
```apache
RewriteEngine On
RewriteCond %{HTTP_HOST} ^(www\.)?parenta\.com\.mx$ [NC]
RewriteRule ^(.*)$ http://145.79.25.103:3030/$1 [P,L]
```

---

## 🔧 Managing Your Application

### SSH Connection
```bash
./scripts/ssh-hostinger.sh connect
```

### View Application Logs
```bash
# SSH into server first
pm2 logs parenta-app

# Or view last 100 lines
pm2 logs parenta-app --lines 100
```

### Check Application Status
```bash
pm2 status
```

### Restart Application
```bash
pm2 restart parenta-app
```

### Stop Application
```bash
pm2 stop parenta-app
```

### Start Application (if stopped)
```bash
cd ~/domains/parenta.com.mx/nodejs-app
pm2 start npm --name "parenta-app" -- start
pm2 save
```

---

## 🚀 Future Deployments

When you make changes to your code and want to deploy updates:

### Method 1: Automatic Script (Recommended)
```bash
cd /Users/adrianestopace/Documents/oneph/parenta-nextjs
./scripts/deploy-with-manual-nodejs.sh
```

This script will:
1. Push your changes to GitHub
2. Pull latest code on the server
3. Install dependencies
4. Build the application
5. Restart PM2

### Method 2: Manual Deployment
```bash
# 1. Build locally
npm run build

# 2. Upload .next folder
sshpass -p 'Theanswer001!!!' rsync -avz -e "ssh -p 65002" .next/ u876334876@145.79.25.103:~/domains/parenta.com.mx/nodejs-app/.next/

# 3. Restart
sshpass -p 'Theanswer001!!!' ssh -p 65002 u876334876@145.79.25.103 'pm2 restart parenta-app'
```

---

## 📊 Application Monitoring

### View Real-Time CPU & Memory Usage
```bash
pm2 monit
```

### View Application Info
```bash
pm2 info parenta-app
```

### View Error Logs
```bash
pm2 logs parenta-app --err
```

---

## 🗂️ Server File Structure

```
/home/u876334876/
├── domains/
│   └── parenta.com.mx/
│       ├── public_html/          # Web root (for static files)
│       └── nodejs-app/            # Your Next.js application
│           ├── .next/             # Built application
│           ├── src/               # Source code
│           ├── public/            # Static assets
│           ├── .env.production    # Environment variables
│           ├── package.json
│           └── ...
├── .nvm/                          # Node Version Manager
│   └── versions/
│       └── node/
│           └── v18.20.8/          # Node.js installation
└── .pm2/                          # PM2 process manager
    ├── logs/
    │   ├── parenta-app-out.log
    │   └── parenta-app-error.log
    └── pids/
```

---

## 🔐 Environment Variables

Located at: `~/domains/parenta.com.mx/nodejs-app/.env.production`

```env
DATABASE_URL="postgresql://postgres.lttvkueyiptqzhubaydg:Theanswer001!!!@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.lttvkueyiptqzhubaydg:Theanswer001!!!@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
NEXTAUTH_URL="https://parenta.com.mx"
NEXTAUTH_SECRET="CMgu1S5/GQqa6PXJQBTiSaAD3gaTOzYbtIbV5MZcLKM="
NODE_ENV="production"
PORT=3030
```

> ⚠️ **Security:** Keep these credentials secure. Never commit `.env.production` to version control.

---

## 📞 Server Details

**Server Information:**
- **Host:** 145.79.25.103
- **SSH Port:** 65002
- **SSH User:** u876334876
- **Node.js:** v18.20.8
- **Application Port:** 3030
- **Process Manager:** PM2 6.0.13

**Database (Supabase):**
- **Host:** aws-1-ap-southeast-1.pooler.supabase.com
- **Port:** 6543 (pooled) / 5432 (direct)
- **Database:** postgres
- **Connection Pooling:** Enabled

---

## ⚠️ Troubleshooting

### Application Won't Start
```bash
# Check logs
pm2 logs parenta-app

# Try restarting
pm2 restart parenta-app

# If still failing, rebuild
cd ~/domains/parenta.com.mx/nodejs-app
npm install
npm run build
pm2 restart parenta-app
```

### Can't Access via IP
1. Check if application is running: `pm2 status`
2. Check firewall rules in hPanel
3. Verify port 3030 is not blocked

### Database Connection Issues
1. Check `.env.production` file exists
2. Verify Supabase credentials are correct
3. Test database connection: `npm run seed-db`

### Out of Memory Errors
Shared hosting has memory limits. If you hit them:
1. Restart PM2: `pm2 restart parenta-app`
2. Consider upgrading hosting plan
3. Optimize application memory usage

---

## 📚 Helpful Scripts

All deployment scripts are in `./scripts/`:

- **`install-nodejs-manually.sh`** - Install Node.js via NVM
- **`deploy-with-manual-nodejs.sh`** - Full deployment script
- **`ssh-hostinger.sh`** - SSH connection helper

---

## 🎯 Performance Tips

1. **Enable Gzip Compression** in Next.js config
2. **Use Image Optimization** with Next.js Image component
3. **Monitor Memory Usage** with `pm2 monit`
4. **Set up CDN** for static assets (optional)
5. **Enable Caching** for API routes

---

## ✅ Deployment Checklist

- [x] Node.js installed (v18.20.8)
- [x] Application cloned from GitHub
- [x] Dependencies installed
- [x] Application built successfully
- [x] PM2 process manager configured
- [x] Application running on port 3030
- [x] Environment variables configured
- [x] Database connected (Supabase)
- [ ] DNS configured for parenta.com.mx
- [ ] SSL certificate installed
- [ ] Database initialized (`/api/init-db`)
- [ ] Admin account created and tested
- [ ] All pages tested and working
- [ ] Backup strategy implemented

---

## 🚨 Important Security Reminders

1. ✅ Change default admin password immediately
2. ✅ Keep SSH credentials secure
3. ✅ Never commit `.env.production` to Git
4. ✅ Enable SSL certificate (HTTPS)
5. ✅ Regularly update dependencies
6. ✅ Monitor application logs for errors
7. ✅ Set up database backups in Supabase

---

## 📞 Support

**Hostinger Support:**
- Live Chat: Available 24/7 in hPanel
- Email: support@hostinger.com
- Knowledge Base: https://support.hostinger.com

**GitHub Repository:**
- https://github.com/onephdevs/parenta-nextjs

---

## 🎉 Congratulations!

Your **Parenta Property Management System** is now live on the internet!

**Next Steps:**
1. Open `http://145.79.25.103:3030` in your browser
2. Initialize the database at `/api/init-db`
3. Login with admin credentials
4. Start managing properties!

---

**Deployed:** November 13, 2025  
**Deployment Method:** Manual Node.js Installation + PM2  
**Status:** ✅ LIVE and Running

---

*For questions or issues, refer to this guide or contact support.*

