# Gmail Email Setup - Quick Start Guide

## ⚡ Quick Setup (5 Minutes)

### Step 1: Get Your Gmail App Password

1. Go to: https://myaccount.google.com/security
2. Enable **2-Step Verification** (if not enabled)
3. Click **App passwords** (at the bottom)
4. Select app: **Mail** → Device: **Other (Custom name)**
5. Enter name: "Parenta Property Management"
6. Click **Generate**
7. **Copy the 16-character password** (you won't see it again!)

---

### Step 2: Add to Environment Variables

**For Local Development** (`.env.local`):
```bash
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="abcd efgh ijkl mnop"
EMAIL_FROM="Parenta <your-email@gmail.com>"
```

**For Production** (`.env.production` on server):
```bash
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="abcd efgh ijkl mnop"
EMAIL_FROM="Parenta <your-email@gmail.com>"
```

---

### Step 3: Test Your Configuration

#### Option A: Via Browser Console

1. Start dev server: `npm run dev`
2. Open http://localhost:3030
3. Open Console (F12), paste:

```javascript
// Test connection only
fetch('/api/notifications/test-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
  credentials: 'include'
}).then(r => r.json()).then(console.log);
```

```javascript
// Test connection AND send test email
fetch('/api/notifications/test-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sendTestEmail: true,
    testRecipient: 'your-test-email@gmail.com'
  }),
  credentials: 'include'
}).then(r => r.json()).then(console.log);
```

#### Option B: Via cURL

```bash
# Test connection
curl -X POST http://localhost:3030/api/notifications/test-email \
  -H "Content-Type: application/json" \
  -d '{}'

# Send test email
curl -X POST http://localhost:3030/api/notifications/test-email \
  -H "Content-Type: application/json" \
  -d '{"sendTestEmail": true, "testRecipient": "your-email@gmail.com"}'
```

#### Option C: Check Configuration Status

```bash
curl http://localhost:3030/api/notifications/test-email
```

---

## ✅ Success Response

If everything is configured correctly, you should see:

```json
{
  "success": true,
  "connectionTest": {
    "success": true,
    "message": "Gmail SMTP connection successful"
  },
  "configuration": {
    "gmailUser": "your-email@gmail.com",
    "hasAppPassword": true,
    "emailFrom": "Parenta <your-email@gmail.com>"
  },
  "message": "Gmail SMTP is configured and working!"
}
```

---

## 🚀 What Emails Will Be Sent?

Once configured, your system automatically sends:

| Email Type | When Sent | Recipient |
|------------|-----------|-----------|
| 📧 **Payment Reminders** | 3 days before due date | Tenants |
| ⚠️ **Overdue Notices** | 1 day after due date | Tenants |
| ✅ **Payment Confirmations** | Immediately after payment | Tenants |
| 📄 **Invoice Delivery** | When invoice generated | Tenants |
| 📅 **Lease Expiring Soon** | 30/60/90 days before | Tenants |
| 💰 **Late Fee Applied** | When late fee charged | Tenants |

---

## 📊 Gmail Sending Limits

| Account Type | Daily Limit | Best For |
|--------------|-------------|----------|
| **Free Gmail** | 500 emails/day | Small properties (< 50 units) |
| **Google Workspace** | 2,000 emails/day | Large properties (> 50 units) |

---

## ❌ Common Errors & Quick Fixes

### Error: "Invalid login"
**Fix:** You're using your regular password instead of App Password
- Generate an App Password (Step 1 above)

### Error: "Connection timeout"
**Fix:** Firewall blocking port 587
- Check your network/firewall settings
- Try port 465 instead (change in `email-service.ts`)

### Error: "Gmail credentials not configured"
**Fix:** Environment variables not loaded
- Restart your dev server: `npm run dev`
- Check `.env.local` file exists and has correct values

---

## 📝 Complete Documentation

For detailed setup instructions, troubleshooting, and best practices:
📖 **See `GMAIL-EMAIL-SETUP.md`**

---

## 🆘 Quick Help

**Test Endpoint:**  
`POST /api/notifications/test-email`

**Configuration Check:**  
`GET /api/notifications/test-email`

**Environment Variables:**
- `GMAIL_USER` - Your Gmail address
- `GMAIL_APP_PASSWORD` - 16-character app password
- `EMAIL_FROM` - Display name for emails

**Need App Password?**  
https://myaccount.google.com/apppasswords

---

## ✨ You're All Set!

Once you see ✅ success responses, your email notifications are ready to go!

**Next Steps:**
1. Deploy to production with same environment variables
2. Customize email templates in admin panel
3. Monitor notification logs for delivery status

🎉 **Professional automated tenant communication!**

