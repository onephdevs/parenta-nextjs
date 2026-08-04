# Vercel CLI Deployment & Environment Variables Guide

Complete guide for deploying to Vercel and managing environment variables via CLI.

---

## ✅ YES! You Can Manage Everything via CLI

Vercel CLI allows you to:
- ✅ Deploy your app from terminal
- ✅ Add environment variables via CLI
- ✅ Update existing environment variables
- ✅ List all environment variables
- ✅ Remove environment variables
- ✅ Set different values for production/preview/development

---

## 🚀 QUICK START

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login

```bash
vercel login
```

This will open your browser to authenticate with GitHub.

### Step 3: Deploy

```bash
cd /Users/adrianestopace/Documents/oneph/parenta-nextjs
vercel
```

That's it! Your app will deploy.

---

## 🔑 MANAGING ENVIRONMENT VARIABLES VIA CLI

### Method 1: Interactive Add (Easiest)

```bash
# Add a new environment variable interactively
vercel env add
```

You'll be prompted:
1. **What's the name?** → Enter variable name (e.g., `DATABASE_URL`)
2. **What's the value?** → Enter the value
3. **Which environments?** → Choose Production, Preview, Development

**Example Session:**
```bash
$ vercel env add

? What's the name of the variable? DATABASE_URL
? What's its value? postgresql://postgres:password@host:6543/postgres
? Select environments: 
  ◉ Production
  ◉ Preview
  ◉ Development
✅ Added environment variable DATABASE_URL
```

---

### Method 2: Add with Command (Fastest)

Add to **Production only:**
```bash
vercel env add DATABASE_URL production
# Then paste the value when prompted
```

Add to **All environments:**
```bash
vercel env add DATABASE_URL production preview development
# Then paste the value when prompted
```

---

### Method 3: Pipe Value Directly

```bash
# Add with value in one command
echo "postgresql://postgres:password@host:6543/postgres" | vercel env add DATABASE_URL production
```

Or use a file:
```bash
# Create a file with the value
echo "postgresql://postgres:password@host:6543/postgres" > temp_value.txt

# Add from file
cat temp_value.txt | vercel env add DATABASE_URL production

# Clean up
rm temp_value.txt
```

---

### Method 4: Import from .env file

```bash
# Pull current env vars to .env.local
vercel env pull .env.local

# Edit .env.local with your values
nano .env.local

# Push all vars from .env.local
vercel env push .env.local production
```

---

## 📋 ALL VERCEL ENV COMMANDS

### List All Environment Variables
```bash
# List all env vars
vercel env ls

# Output shows:
# name                value            environments
# DATABASE_URL        postgres://...   Production, Preview, Development
# NEXTAUTH_SECRET     (set in Vercel/server env)
```

---

### View a Specific Variable
```bash
vercel env pull
# This creates .env.local with all values
cat .env.local
```

---

### Remove an Environment Variable
```bash
vercel env rm DATABASE_URL production
```

Remove from all environments:
```bash
vercel env rm DATABASE_URL
```

---

### Pull Environment Variables to Local File
```bash
# Pull production env vars
vercel env pull .env.production.local

# Pull development env vars
vercel env pull .env.development.local --environment development

# Pull all environments
vercel env pull .env.local
```

---

## 🎯 COMPLETE DEPLOYMENT WORKFLOW WITH ENV VARS

### First Time Setup

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Navigate to your project
cd /Users/adrianestopace/Documents/oneph/parenta-nextjs

# 4. Deploy (will prompt for project setup)
vercel

# 5. Add all required environment variables
vercel env add DATABASE_URL production preview development
vercel env add NEXTAUTH_SECRET production preview development
vercel env add NEXTAUTH_URL production preview development
vercel env add NODE_ENV production
vercel env add PORT production preview development
vercel env add GMAIL_USER production preview development
vercel env add GMAIL_APP_PASSWORD production preview development
vercel env add EMAIL_FROM production preview development

# 6. Redeploy to apply env vars
vercel --prod
```

---

## 📝 ADD ALL 8 ENVIRONMENT VARIABLES

Here's a script to add all your environment variables at once:

### Option A: Interactive (Recommended)

```bash
#!/bin/bash
# add-all-env-vars.sh

echo "Adding all environment variables to Vercel..."

# Required variables
echo "1/8 - Adding DATABASE_URL..."
vercel env add DATABASE_URL production preview development

echo "2/8 - Adding NEXTAUTH_SECRET..."
vercel env add NEXTAUTH_SECRET production preview development

echo "3/8 - Adding NEXTAUTH_URL..."
vercel env add NEXTAUTH_URL production preview development

echo "4/8 - Adding NODE_ENV..."
vercel env add NODE_ENV production

echo "5/8 - Adding PORT..."
vercel env add PORT production preview development

# Optional - Gmail variables
echo "6/8 - Adding GMAIL_USER..."
vercel env add GMAIL_USER production preview development

echo "7/8 - Adding GMAIL_APP_PASSWORD..."
vercel env add GMAIL_APP_PASSWORD production preview development

echo "8/8 - Adding EMAIL_FROM..."
vercel env add EMAIL_FROM production preview development

echo "✅ All environment variables added!"
echo "Run 'vercel --prod' to redeploy with new variables"
```

Save as `add-all-env-vars.sh`, make executable, and run:
```bash
chmod +x add-all-env-vars.sh
./add-all-env-vars.sh
```

---

### Option B: From .env.local File

```bash
# 1. Create .env.local with all your values
cat > .env.local << 'EOF'
DATABASE_URL="postgresql://postgres:password@host:6543/database"
NEXTAUTH_SECRET="your-generated-secret"
NEXTAUTH_URL="https://parenta-nextjs.vercel.app"
NODE_ENV="production"
PORT=3030
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="abcd efgh ijkl mnop"
EMAIL_FROM="Parenta <your-email@gmail.com>"
EOF

# 2. Push to Vercel (one by one)
while IFS='=' read -r key value; do
  if [[ ! $key =~ ^# ]] && [[ -n $key ]]; then
    echo "$value" | vercel env add "$key" production preview development
  fi
done < .env.local

# 3. Clean up
rm .env.local
```

---

## 🔄 UPDATE EXISTING ENVIRONMENT VARIABLES

### Update a Single Variable

```bash
# Remove the old value
vercel env rm DATABASE_URL production

# Add the new value
vercel env add DATABASE_URL production
# Paste new value when prompted
```

### Update All Variables

```bash
# Pull current values
vercel env pull .env.local

# Edit the file
nano .env.local

# Remove all current values
vercel env rm DATABASE_URL production preview development
vercel env rm NEXTAUTH_SECRET production preview development
# ... etc

# Add updated values
vercel env add DATABASE_URL production preview development
# ... etc
```

---

## 🚀 DEPLOYMENT COMMANDS

### Deploy to Preview (Test)
```bash
vercel
```
This creates a preview deployment with a unique URL.

### Deploy to Production
```bash
vercel --prod
```
This deploys to your production domain.

### Deploy with Build Logs
```bash
vercel --prod --debug
```

### Deploy and Open in Browser
```bash
vercel --prod --open
```

---

## 📊 CHECK DEPLOYMENT STATUS

### List All Deployments
```bash
vercel ls
```

### Get Deployment Info
```bash
vercel inspect <deployment-url>
```

### View Deployment Logs
```bash
vercel logs <deployment-url>
```

### View Production Logs (Live)
```bash
vercel logs --prod --follow
```

---

## 🎯 RECOMMENDED WORKFLOW

### For Development

```bash
# Pull production env vars to local
vercel env pull .env.local

# Start local dev with Vercel's environment
npm run dev
```

### For Production Deployment

```bash
# 1. Make your code changes
# 2. Commit to Git
git add .
git commit -m "feat: your changes"
git push origin main

# 3. Deploy to production via CLI
vercel --prod

# 4. Test the deployment
vercel inspect --prod
```

---

## 🔍 VERIFY YOUR ENVIRONMENT VARIABLES

### Check What's Set
```bash
# List all env vars
vercel env ls

# Pull to see actual values (creates .env.local)
vercel env pull .env.local
cat .env.local
```

### Test in Deployment
```bash
# Deploy and check logs
vercel --prod
vercel logs --prod

# Look for environment-related errors
```

---

## 📝 COMPLETE EXAMPLE: FIRST TIME SETUP

```bash
# Step 1: Install and login
npm install -g vercel
vercel login

# Step 2: Navigate to project
cd /Users/adrianestopace/Documents/oneph/parenta-nextjs

# Step 3: Initial deploy (creates project)
vercel

# Step 4: Add all environment variables
echo "postgresql://postgres:password@host:6543/postgres" | \
  vercel env add DATABASE_URL production preview development

echo "your-generated-nextauth-secret" | \
  vercel env add NEXTAUTH_SECRET production preview development

echo "https://parenta-nextjs.vercel.app" | \
  vercel env add NEXTAUTH_URL production

echo "production" | \
  vercel env add NODE_ENV production

echo "3030" | \
  vercel env add PORT production preview development

echo "your-email@gmail.com" | \
  vercel env add GMAIL_USER production preview development

echo "your-app-password" | \
  vercel env add GMAIL_APP_PASSWORD production preview development

echo "Parenta <your-email@gmail.com>" | \
  vercel env add EMAIL_FROM production preview development

# Step 5: Deploy to production with env vars
vercel --prod

# Step 6: Verify
vercel env ls
```

---

## 🔐 SECURITY TIPS

### DO ✅
- Use `vercel env add` to securely add secrets
- Use different secrets for preview and production
- Pull env vars with `vercel env pull` for local development
- Remove temporary env files after deployment

### DON'T ❌
- Don't commit `.env.local` to Git (it's in `.gitignore`)
- Don't share environment values in chat/email
- Don't use the same secrets across all environments
- Don't hardcode secrets in your code

---

## 🆘 TROUBLESHOOTING

### Error: "No existing credentials found"
```bash
# Re-login
vercel logout
vercel login
```

### Error: "No project linked"
```bash
# Link to existing project
vercel link

# Or create new project
vercel
```

### Environment Variables Not Applied
```bash
# Redeploy after adding env vars
vercel --prod

# Check if they're set
vercel env ls
```

### Can't See Environment Variable Values
```bash
# Pull to local file to see values
vercel env pull .env.local
cat .env.local

# Then delete the file
rm .env.local
```

---

## 📚 USEFUL COMMANDS REFERENCE

| Command | Description |
|---------|-------------|
| `vercel` | Deploy to preview |
| `vercel --prod` | Deploy to production |
| `vercel env add KEY ENV` | Add environment variable |
| `vercel env ls` | List all env variables |
| `vercel env pull` | Download env vars to .env.local |
| `vercel env rm KEY ENV` | Remove environment variable |
| `vercel ls` | List all deployments |
| `vercel logs --prod` | View production logs |
| `vercel inspect URL` | Get deployment details |
| `vercel domains ls` | List custom domains |
| `vercel alias` | Manage domain aliases |

---

## ✨ SUMMARY

**YES! You can do everything via CLI:**

✅ **Deploy:** `vercel --prod`  
✅ **Add env vars:** `vercel env add KEY ENV`  
✅ **Update env vars:** Remove old, add new  
✅ **List env vars:** `vercel env ls`  
✅ **Pull env vars:** `vercel env pull`  
✅ **View logs:** `vercel logs --prod`  

**It's actually EASIER than the web UI!**

---

## 🎯 YOUR NEXT STEPS

1. **Install CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   cd /Users/adrianestopace/Documents/oneph/parenta-nextjs
   vercel
   ```

4. **Add env vars:**
   ```bash
   vercel env add DATABASE_URL production preview development
   # (repeat for all 8 variables)
   ```

5. **Deploy to production:**
   ```bash
   vercel --prod
   ```

**Done! 🚀**

---

## 📖 DOCUMENTATION LINKS

- **Vercel CLI Docs:** https://vercel.com/docs/cli
- **Environment Variables:** https://vercel.com/docs/projects/environment-variables
- **Deployments:** https://vercel.com/docs/deployments

**You have full control via CLI!** 🎊

