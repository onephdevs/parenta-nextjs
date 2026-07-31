# 🚀 Automatic Git-Based Deployment Setup

## ✅ Why Git Deployment is Better

### Current SCP Method:
- ❌ Uploads entire app every time (~50MB+)
- ❌ Takes 5+ minutes per deployment
- ❌ No version history on server
- ❌ Can't rollback easily

### New Git Method:
- ✅ Only transfers changed files
- ✅ Takes 1-2 minutes per deployment
- ✅ Full Git history on server
- ✅ Easy rollback with `git checkout`
- ✅ One command deployment!

---

## 🎯 Setup Steps (One-Time, 5 minutes)

### Step 1: Add Server SSH Key to GitHub (2 minutes)

Your server's SSH public key:
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDf6YAaBZYfP4DxlyhrqrJtXKrc4AaBZ8nKRwQiPQjRe3vMHeiSLuJsskn11ZKYkVgWWjgBDJ93VniwhBzAECDgHqNLbgFcFKUK+hnp2nUiS5w2SFh8MuDA8IPhfJwo2UUXFbU0ENb8Z5jASB3yaZhR0CoS806Ug/6oCmLV0pVM3XEI4Z9X9TjvJ5+G7rNRWQdwPYpp69JnkB30e0FObIJ6eJWq3RsKdmnNXtp7ysptWQVOAHzKln4DI3axs7XCwVF3S1l2F685lLrBaoe4WwR6yEb3Ib17mnOkWbwIA0f2e9lMX7+CdRyKifypOUiWjt9w9hrBPnbFCv/7AZQOaUg7HpQW/WV189mjIYxnYp1m016TLhHXlOIe6om4e0R2wL8myYZ2n2a8vy0vLtMw5z19caeCf7EdTqLIljhXbeAX2ITnnAxjPtHWO+OGT6X+wIrR302SPDUvx3ZADFX8xjDLtKbQwMPdfWnTlKMaQ3TQ9vnrdthPo37HeOjZ2F0Tk30= u876334876@my-kul-web2088.main-hosting.eu
```

**Add to GitHub:**

1. Go to: **https://github.com/settings/keys**
2. Click: **"New SSH key"** (green button, top right)
3. Fill in:
   ```
   Title: Hostinger Server - parenta.com.mx
   Key type: Authentication Key
   Key: (paste the SSH key above)
   ```
4. Click: **"Add SSH key"**
5. Confirm with your GitHub password if prompted

✅ Done! Your server can now clone/pull from GitHub automatically.

---

### Step 2: Push Your Code to GitHub (2 minutes)

If not already on GitHub:

```bash
cd /Users/adrianestopace/Documents/oneph/parenta-nextjs

# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit for Parenta app"

# Create repo on GitHub
# Go to: https://github.com/new
# Name: parenta-nextjs
# Don't initialize with README (you already have code)

# Add remote (replace YOUR_USERNAME)
git remote add origin git@github.com:YOUR_USERNAME/parenta-nextjs.git

# Push
git branch -M main
git push -u origin main
```

If already on GitHub:
```bash
# Just make sure everything is pushed
git push
```

---

### Step 3: Update Deployment Script (1 minute)

Edit: `scripts/deploy-git-auto.sh`

Change line 17:
```bash
GIT_REPO="git@github.com:YOUR_USERNAME/parenta-nextjs.git"
```

To your actual GitHub repo URL:
```bash
GIT_REPO="git@github.com:yourusername/parenta-nextjs.git"
```

Save the file.

---

### Step 4: First Deployment (2 minutes)

Enable Node.js in hPanel first (if not done):
- See: `ENABLE-NODEJS-HPANEL.md`

Then run:
```bash
./scripts/deploy-git-auto.sh
```

This will:
1. ✅ Push your code to GitHub
2. ✅ SSH into Hostinger
3. ✅ Clone repo to server
4. ✅ Install dependencies
5. ✅ Build application
6. ✅ Ready to run!

Then:
1. Go to hPanel → Node.js
2. Click "Restart"
3. Open https://parenta.com.mx

---

## 🔄 Future Deployments (1 Command!)

After setup, deploying updates is super easy:

```bash
# Make your changes
# Edit some files...

# Commit changes
git add .
git commit -m "Updated feature X"

# Deploy!
./scripts/deploy-git-auto.sh
```

That's it! The script will:
1. Push to GitHub
2. Pull on server
3. Install dependencies
4. Build app
5. Ready for restart!

**Then just restart in hPanel and you're live!**

---

## 📊 Comparison

### SCP Method (Current)
```bash
./scripts/deploy-to-hostinger-shared.sh

# Uploads: ~50MB
# Time: ~5 minutes
# Transfers: Everything
```

### Git Method (New)
```bash
./scripts/deploy-git-auto.sh

# Uploads: Only changes (~1-5MB typically)
# Time: ~1-2 minutes
# Transfers: Only modified files
```

**5x faster for updates!** 🚀

---

## 🛠️ Advanced: Automatic Deployment with Webhooks

Want deployments to happen automatically when you push to GitHub?

### Setup GitHub Webhook:

1. In your GitHub repo: Settings → Webhooks → Add webhook
2. Payload URL: `https://parenta.com.mx/api/deploy` (you'd create this)
3. Content type: application/json
4. Secret: (generate a secure token)
5. Events: Just the push event

### Create API endpoint:

Create `src/app/api/deploy/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const signature = request.headers.get('x-hub-signature-256');
  // Verify signature here...

  try {
    // Pull latest code
    await execAsync('cd /home/u876334876/domains/parenta.com.mx/nodejs-app && git pull origin main');
    
    // Install dependencies
    await execAsync('cd /home/u876334876/domains/parenta.com.mx/nodejs-app && npm install --production');
    
    // Build
    await execAsync('cd /home/u876334876/domains/parenta.com.mx/nodejs-app && npm run build');
    
    // Restart (via PM2 or similar)
    await execAsync('pm2 restart parenta-app');

    return NextResponse.json({ success: true, message: 'Deployed successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

**Now push to GitHub = automatic deployment!** 🎉

---

## 🆘 Troubleshooting

### "Permission denied (publickey)"
**Solution:** SSH key not added to GitHub correctly
- Go to https://github.com/settings/keys
- Make sure the key is added
- Test: `ssh -T git@github.com` on server

### "Repository not found"
**Solution:** Check the GIT_REPO URL in script
- Make sure it's the SSH URL (git@github.com:...)
- Not HTTPS URL (https://github.com/...)

### "fatal: could not read Username"
**Solution:** Using HTTPS URL instead of SSH
- Update script to use: `git@github.com:username/repo.git`

### Build fails on server
**Solution:** Check Node.js version
- Run on server: `node --version`
- Should be 18+
- Enable in hPanel if needed

---

## ✅ Benefits Recap

**Git Deployment Gives You:**

1. **Faster Updates** - Only transfers changed files
2. **Version Control** - Full Git history on server
3. **Easy Rollback** - `git checkout` any commit
4. **Professional** - Industry standard deployment
5. **Automatic** - Can set up webhooks
6. **Safer** - Can test before going live
7. **Collaborative** - Team members can deploy too

---

## 🎯 Quick Reference

### Setup (One-Time):
```bash
# 1. Add SSH key to GitHub (see Step 1)
# 2. Push code to GitHub
git push

# 3. Update GIT_REPO in scripts/deploy-git-auto.sh
# 4. Deploy
./scripts/deploy-git-auto.sh
```

### Daily Use:
```bash
# Make changes, commit, and deploy
git add .
git commit -m "Your changes"
./scripts/deploy-git-auto.sh

# Restart in hPanel
# Done!
```

### Rollback:
```bash
# SSH into server
./scripts/ssh-hostinger.sh connect

# Go to app directory
cd domains/parenta.com.mx/nodejs-app

# See commit history
git log --oneline

# Rollback to previous commit
git checkout COMMIT_HASH

# Rebuild
npm install
npm run build

# Restart in hPanel
```

---

## 📞 Next Steps

1. **Add SSH key to GitHub** (Step 1 above)
2. **Push code to GitHub** (if not already)
3. **Update GIT_REPO** in deploy script
4. **Run first deployment**: `./scripts/deploy-git-auto.sh`
5. **Restart in hPanel**
6. **Test**: https://parenta.com.mx

**After that, deploying is just:**
```bash
./scripts/deploy-git-auto.sh
```

---

**Ready to set up Git deployment? Start with Step 1! 🚀**

