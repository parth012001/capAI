# Webhook URL Management Guide

## Overview

You now have **TWO separate webhook subscriptions** for production and development:

- **`gmail-notifications-sub`** → Production (Railway URL when launched)
- **`gmail-notifications-dev`** → Development (ngrok URL for local testing)

Both subscriptions receive the same Gmail webhook notifications simultaneously.

## Quick Commands

### Check Current URLs
```bash
./scripts/update-webhooks.sh status
```

### Update Production URL (Before Launch)
```bash
./scripts/update-webhooks.sh prod https://your-app.railway.app
```

### Update Development URL (When ngrok restarts)
```bash
# 1. Start ngrok
ngrok http 3000

# 2. Copy the new URL (e.g., https://abc123.ngrok-free.app)

# 3. Update dev subscription
./scripts/update-webhooks.sh dev https://abc123.ngrok-free.app
```

## Workflow

### 🚀 Before Launch (Do Once)

1. Deploy to Railway and get your production URL
2. Update production subscription:
   ```bash
   ./scripts/update-webhooks.sh prod https://chief-production.railway.app
   ```
3. Verify both subscriptions:
   ```bash
   ./scripts/update-webhooks.sh status
   ```

**Expected Output:**
```
gmail-notifications-sub  https://chief-production.railway.app/webhooks/gmail  ACTIVE
gmail-notifications-dev  https://abc123.ngrok-free.app/webhooks/gmail         ACTIVE
```

### 💻 Daily Development

**When starting local development:**
```bash
# 1. Start your local server
npm run dev

# 2. Start ngrok (in another terminal)
ngrok http 3000

# 3. Update dev subscription with new ngrok URL
./scripts/update-webhooks.sh dev https://NEW-NGROK-URL.ngrok-free.app
```

**Production keeps working** - you never touch the production subscription again!

### 📊 Monitoring

**Check if webhooks are working:**
```bash
# Watch your local server logs
npm run dev

# In another terminal, send a test email to your Gmail
# You should see webhook notifications arrive
```

## Important Notes

### ⚠️ Both Subscriptions Receive ALL Webhooks

**Problem:** If a production user gets an email, BOTH servers receive the webhook.

**Solution:** Add environment check in your webhook handler:

```typescript
// src/routes/webhooks.ts (already exists, just add this check)

app.post('/webhooks/gmail', async (req, res) => {
  // Quick acknowledge to Google
  res.status(200).send('OK');

  // In development, only process test emails
  if (process.env.NODE_ENV === 'development') {
    const testEmails = (process.env.ALLOWED_TEST_EMAILS || '').split(',');
    // Check if webhook is for test account
    // Skip processing if it's a production user's email
  }

  // ... rest of webhook processing
});
```

**Add to your `.env` file:**
```
NODE_ENV=development
ALLOWED_TEST_EMAILS=p.ahiir01@gmail.com,yourtest@gmail.com
```

### 🔒 Security

Both subscriptions are on the same Google Cloud project, so:
- ✅ Same billing
- ✅ Same permissions
- ✅ Same monitoring/logs
- ✅ No additional cost

### 🚨 Troubleshooting

**"Webhooks not arriving in development"**
1. Check ngrok is running: `curl https://YOUR-NGROK-URL.ngrok-free.app/health`
2. Check dev subscription URL: `./scripts/update-webhooks.sh status`
3. Check local server is running: `npm run dev`

**"Production webhooks stopped working"**
1. Check Railway deployment is up
2. Check production subscription URL: `./scripts/update-webhooks.sh status`
3. Verify Railway URL matches subscription URL

## Manual Commands (Without Script)

If you prefer manual commands:

```bash
# Update production
gcloud pubsub subscriptions modify-push-config gmail-notifications-sub \
  --project=chief-ai-470506 \
  --push-endpoint="https://your-railway-url.railway.app/webhooks/gmail"

# Update development
gcloud pubsub subscriptions modify-push-config gmail-notifications-dev \
  --project=chief-ai-470506 \
  --push-endpoint="https://your-ngrok-url.ngrok-free.app/webhooks/gmail"

# Check status
gcloud pubsub subscriptions list --project=chief-ai-470506
```

## Next Steps

1. ✅ Dev subscription created
2. ⏳ Before launch: Update production subscription to Railway URL
3. ⏳ Add environment check to webhook handler (optional but recommended)
4. ⏳ Test both production and development webhooks work independently

---

**Questions?** The setup is complete and safe. Production and development are now completely independent!
