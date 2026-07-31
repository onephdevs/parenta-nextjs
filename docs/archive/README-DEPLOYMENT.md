# 🚀 Deploy Parenta to Hostinger - Start Here!

## ✅ Current Status

**✅ Connection Verified:** Successfully connected to your Hostinger VPS!

**Server Details:**
- IP: 145.79.25.103
- RAM: 503GB 
- Storage: 24TB
- Status: Ready for deployment

---

## 🎯 Deploy in 3 Steps (15 minutes)

### Step 1: Create Environment File (2 min)

Create a file named `.env.production` in the project root:

```bash
DATABASE_URL="postgresql://parenta_user:Parenta2025!!@localhost:5432/parenta_db"
NEXTAUTH_URL="https://parenta.com.mx"
NEXTAUTH_SECRET="put-result-of-command-below-here"
NODE_ENV="production"
PORT=3030
```

Generate the NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### Step 2: Setup Server (8 min)

```bash
./scripts/setup-server.sh
```

This installs Node.js, PostgreSQL, PM2, and Nginx on the server.

### Step 3: Deploy Application (5 min)

```bash
./scripts/deploy-to-hostinger.sh
```

This builds your app, uploads it, and starts it with PM2.

---

## 🎉 After Deployment

### Access Your Application
```
http://145.79.25.103:3030
```

### Initialize Database

SSH into the server:
```bash
./scripts/ssh-hostinger.sh connect
```

Then run:
```bash
cd /home/u876334876/apps/parenta-nextjs
node -e "
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ 
  connectionString: 'postgresql://parenta_user:Parenta2025!!@localhost:5432/parenta_db'
});
const schema = fs.readFileSync('src/lib/schema.sql', 'utf8');
pool.query(schema)
  .then(() => { console.log('✅ Database ready!'); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
"
```

### Create Admin Account

Go to: `http://145.79.25.103:3030/auth/signup`

Select "Admin" role and create your account.

---

## 🛠️ Useful Commands

```bash
# View application logs
./scripts/ssh-hostinger.sh logs

# Check application status
./scripts/ssh-hostinger.sh status

# Restart application
./scripts/ssh-hostinger.sh restart

# SSH into server
./scripts/ssh-hostinger.sh connect

# Connect to database
./scripts/ssh-hostinger.sh db

# Show all commands
./scripts/ssh-hostinger.sh help
```

---

## 📚 Documentation

| File | Description |
|------|-------------|
| `DEPLOYMENT-SUMMARY.md` | Complete overview and checklist |
| `QUICK-START-HOSTINGER.md` | Quick reference guide |
| `HOSTINGER-DEPLOYMENT-PLAN.md` | Detailed deployment documentation |
| `SYSTEM-ARCHITECTURE-MAP.md` | Application architecture |

---

## 🌐 Production Setup (After Basic Deploy)

### 1. Configure Domain DNS

Point your domain to the server:
```
A Record: @ → 145.79.25.103
A Record: www → 145.79.25.103
```

### 2. Setup Nginx (Reverse Proxy)

```bash
./scripts/ssh-hostinger.sh connect
sudo nano /etc/nginx/sites-available/parenta
```

Paste the Nginx config from `QUICK-START-HOSTINGER.md`, then:

```bash
sudo ln -s /etc/nginx/sites-available/parenta /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Setup SSL Certificate

```bash
sudo certbot --nginx -d parenta.com.mx -d www.parenta.com.mx
```

Now access via: `https://parenta.com.mx`

---

## 🔍 Testing Checklist

After deployment, verify:

- [ ] Application loads at http://145.79.25.103:3030
- [ ] Can create admin account
- [ ] Can login successfully
- [ ] Dashboard displays correctly
- [ ] Can create building
- [ ] Can create room
- [ ] Can add tenant
- [ ] File uploads work
- [ ] All pages accessible
- [ ] No console errors

---

## 🆘 Need Help?

### Application Not Starting?
```bash
./scripts/ssh-hostinger.sh logs
./scripts/ssh-hostinger.sh restart
```

### Database Issues?
```bash
./scripts/ssh-hostinger.sh connect
sudo systemctl status postgresql
```

### Can't Access Application?
```bash
./scripts/ssh-hostinger.sh status
# Make sure it shows "online"
```

---

## 🚀 Ready to Deploy?

**Run these commands in order:**

```bash
# 1. Create .env.production (see Step 1 above)

# 2. Setup server
./scripts/setup-server.sh

# 3. Deploy application
./scripts/deploy-to-hostinger.sh

# 4. Initialize database (see "After Deployment" section)

# 5. Access application
open http://145.79.25.103:3030
```

---

**That's it! Your Parenta Property Management System will be live! 🎉**

*For detailed instructions, see `DEPLOYMENT-SUMMARY.md`*

