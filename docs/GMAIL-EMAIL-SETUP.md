# Gmail Email Setup Guide

This guide will help you configure Gmail for sending email notifications in the Parenta Property Management System.

## 📧 Overview

The system uses **Gmail SMTP** via `nodemailer` to send:
- Payment reminders
- Overdue payment notices
- Payment confirmation emails
- Invoice delivery emails
- Lease expiration alerts
- Late fee notifications

---

## 🔐 Step 1: Create a Gmail App Password

**Important:** You cannot use your regular Gmail password. You must create an "App Password".

### A. Enable 2-Factor Authentication (if not already enabled)

1. Go to your Google Account: https://myaccount.google.com
2. Click **Security** in the left sidebar
3. Under "Signing in to Google", click **2-Step Verification**
4. Follow the prompts to set it up

### B. Generate an App Password

1. Go to your Google Account: https://myaccount.google.com
2. Click **Security** in the left sidebar
3. Under "Signing in to Google", click **2-Step Verification**
4. Scroll down to the bottom and click **App passwords**
5. You may need to sign in again
6. In the "Select app" dropdown, choose **Mail**
7. In the "Select device" dropdown, choose **Other (Custom name)**
8. Enter a name like "Parenta Property Management"
9. Click **Generate**
10. **Copy the 16-character password** (it will look like: `abcd efgh ijkl mnop`)

⚠️ **Important:** Save this password immediately! You won't be able to see it again.

---

## ⚙️ Step 2: Configure Environment Variables

Add these to your `.env.local` (for development) and `.env.production` (for production):

```bash
# Gmail SMTP Configuration
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="abcd efgh ijkl mnop"  # The 16-character app password
EMAIL_FROM="Parenta Property Management <your-email@gmail.com>"
```

### Example Configuration:

```bash
GMAIL_USER="parenta.notifications@gmail.com"
GMAIL_APP_PASSWORD="abcd efgh ijkl mnop"
EMAIL_FROM="Parenta Property Management <parenta.notifications@gmail.com>"
```

---

## 📝 Step 3: Update Your .env Files

### Development (.env.local)

```bash
# Database
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_URL="http://localhost:3030"
NEXTAUTH_SECRET="your-secret-key"

# Gmail
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-app-password-here"
EMAIL_FROM="Parenta <your-email@gmail.com>"

# Environment
NODE_ENV="development"
PORT=3030
```

### Production (.env.production)

```bash
# Database
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_URL="https://parenta.com.mx"
NEXTAUTH_SECRET="your-secret-key"

# Gmail
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-app-password-here"
EMAIL_FROM="Parenta <your-email@gmail.com>"

# Environment
NODE_ENV="production"
PORT=3030
```

---

## 🧪 Step 4: Test Email Connection

We've created a test API endpoint to verify your Gmail connection:

### Create Test Endpoint (Already Done)

The email service includes a `testEmailConnection()` function.

### Test via Browser Console

1. Start your development server: `npm run dev`
2. Open your browser to http://localhost:3030
3. Open Developer Console (F12)
4. Run this code:

```javascript
// Test email connection
fetch('/api/notifications/test-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include'
}).then(r => r.json()).then(console.log);
```

### Or Test via cURL

```bash
curl -X POST http://localhost:3030/api/notifications/test-email \
  -H "Content-Type: application/json"
```

Expected successful response:
```json
{
  "success": true,
  "message": "Gmail SMTP connection successful"
}
```

---

## 📧 Step 5: Send a Test Email

### Test Sending an Actual Email

Create this test script: `test-email.js`

```javascript
// test-email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password',
  },
});

async function testEmail() {
  try {
    const info = await transporter.sendMail({
      from: '"Parenta Test" <your-email@gmail.com>',
      to: 'recipient@example.com', // Change to your test email
      subject: 'Test Email from Parenta',
      text: 'This is a test email from Parenta Property Management System.',
      html: '<b>This is a test email</b> from Parenta Property Management System.',
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
}

testEmail();
```

Run it:
```bash
node test-email.js
```

---

## 🔧 Troubleshooting

### Error: "Invalid login: 535-5.7.8 Username and Password not accepted"

**Solution:** You're using your regular Gmail password instead of an App Password.
- Generate an App Password (see Step 1)
- Make sure 2FA is enabled

### Error: "Connection timeout"

**Solution:** Check your firewall or network settings.
- Ensure port 587 is not blocked
- Try using port 465 with `secure: true`:

```javascript
{
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // use SSL
  auth: { ... }
}
```

### Error: "Daily sending quota exceeded"

**Solution:** Gmail has sending limits:
- **Free Gmail accounts:** 500 emails/day
- **Google Workspace:** 2,000 emails/day

Consider:
- Using a Google Workspace account for higher limits
- Implementing rate limiting in your notification queue
- Batching notifications

### Error: "Less secure app access"

**Solution:** This is outdated. Use App Passwords (not "less secure apps").
- Google deprecated "Allow less secure apps" in May 2022
- Always use App Passwords with 2FA enabled

---

## 📊 Gmail Sending Limits

### Free Gmail Account
- **Limit:** 500 emails per day
- **Recipients per email:** 500
- **Best for:** Small properties (< 50 units)

### Google Workspace Account
- **Limit:** 2,000 emails per day
- **Recipients per email:** 2,000
- **Cost:** Starting at $6/user/month
- **Best for:** Larger properties (> 50 units)

---

## ✅ Best Practices

### 1. Use a Dedicated Email Account
Create a dedicated Gmail account for notifications:
- `parenta.notifications@gmail.com`
- `noreply@yourdomain.com` (with Google Workspace)

### 2. Set Up Email Monitoring
- Check the Gmail account regularly for bounce-backs
- Monitor the notification history in the admin panel

### 3. Configure Rate Limiting
The system includes built-in rate limiting:
- 100ms delay between batch emails
- Notification queue processing every 5 minutes

### 4. Customize Email Templates
Email templates are in the notification system:
- Admin panel → Notifications → Templates
- Customize subject lines and content

### 5. Test Before Production
Always test email configuration in development first:
```bash
npm run dev
# Test email sending
# Verify templates
# Check notification queue
```

---

## 🎯 Next Steps

After Gmail is configured:

1. ✅ **Test Connection:** Verify Gmail SMTP works
2. ✅ **Send Test Email:** Send a real test email
3. ✅ **Configure Templates:** Customize notification templates
4. ✅ **Set Up Cron Jobs:** Automate notification processing
5. ✅ **Monitor Logs:** Check email delivery logs

---

## 📝 Summary

### What You Need:
- ✅ Gmail account with 2FA enabled
- ✅ Gmail App Password (16 characters)
- ✅ Environment variables configured

### Environment Variables:
```bash
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="abcd efgh ijkl mnop"
EMAIL_FROM="Parenta <your-email@gmail.com>"
```

### Quick Test:
```bash
# Test connection
curl -X POST http://localhost:3030/api/notifications/test-email
```

---

## 🆘 Need Help?

### Common Questions:

**Q: Can I use a custom domain email?**  
A: Yes! Use Google Workspace and configure your custom domain.

**Q: How do I increase sending limits?**  
A: Upgrade to Google Workspace for 2,000 emails/day.

**Q: Can I use multiple Gmail accounts?**  
A: Not currently supported. Use one account for all notifications.

**Q: What about email deliverability?**  
A: Gmail has good deliverability. For better rates, use Google Workspace with SPF/DKIM configured.

---

## 🚀 You're Ready!

Once configured, your system will automatically send:
- 📧 Payment reminders (3 days before due)
- ⚠️ Overdue notices (1 day after due)
- ✅ Payment confirmations (immediately after payment)
- 📄 Invoice deliveries (when generated)
- 📅 Lease expiration alerts (30/60/90 days before)
- 💰 Late fee notifications (when applied)

**Automated, professional tenant communication!** 🎊

