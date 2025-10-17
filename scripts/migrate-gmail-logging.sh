#!/bin/bash

# Script to migrate Gmail service from console.log to Pino structured logging
# This removes high-frequency noise logs while preserving critical error context

FILE="src/services/gmail.ts"

echo "Migrating $FILE to structured logging..."

# Refresh access token logs
sed -i '' 's/console\.log(`🔄 Refreshing access token for user: \${userId}`);/logger.info({ userId: sanitizeUserId(userId) }, '\''gmail.token.refreshing'\'');/g' "$FILE"
sed -i '' 's/console\.log(`✅ Access token refreshed for user: \${userId}`);/logger.info({ userId: sanitizeUserId(userId) }, '\''gmail.token.refreshed'\'');/g' "$FILE"
sed -i '' 's/console\.error(`❌ Failed to refresh access token for user \${userId}:`, error);/logger.error({ userId: sanitizeUserId(userId), error: error instanceof Error ? error.message : String(error) }, '\''gmail.token.refresh.failed'\'');/g' "$FILE"

# Email fetching logs (remove noise, keep errors)
sed -i '' '/console\.log(`📧 Found \${response\.data\.messages\.length} emails`);/d' "$FILE"
sed -i '' '/console\.log('\''No messages found'\'');/d' "$FILE"
sed -i '' '/console\.log(`📤 Fetching up to \${maxResults} sent emails for tone analysis\.\.\.`);/d' "$FILE"
sed -i '' '/console\.log('\''No sent messages found'\'');/d' "$FILE"
sed -i '' '/console\.log(`📤 Found \${response\.data\.messages\.length} sent emails`);/d' "$FILE"

# Email fetching errors
sed -i '' 's/console\.error(`❌ Error fetching email \${messageId}:`, error);/logger.error({ messageId, error: error instanceof Error ? error.message : String(error) }, '\''gmail.email.fetch.failed'\'');/g' "$FILE"
sed -i '' 's/console\.error(`Error fetching email \${message\.id}:`, error);/logger.error({ messageId: message.id, error: error instanceof Error ? error.message : String(error) }, '\''gmail.email.fetch.failed'\'');/g' "$FILE"
sed -i '' 's/console\.error('\''❌ Error fetching emails:'\'', error);/logger.error({ error: error instanceof Error ? error.message : String(error) }, '\''gmail.emails.fetch.failed'\'');/g' "$FILE"
sed -i '' 's/console\.error('\''❌ Error fetching sent emails:'\'', error);/logger.error({ error: error instanceof Error ? error.message : String(error) }, '\''gmail.sent.fetch.failed'\'');/g' "$FILE"

# Cross-user access warnings (remove - expected behavior)
sed -i '' '/console\.log(`⚠️ Email \${message\.id} not accessible - skipping (cross-user access blocked)`);/d' "$FILE"

# Sender relationship logs (remove verbose ones, keep summary)
sed -i '' '/console\.log(`🔍 Discovering relationship history with \${senderEmail}\.\.\.`);/d' "$FILE"
sed -i '' 's/console\.log(`✅ Sender relationship: \${classification} (\${totalEmails} total emails)`);/logger.debug({ senderEmail, classification, totalEmails }, '\''gmail.sender.relationship.discovered'\'');/g' "$FILE"
sed -i '' 's/console\.error('\''❌ Error discovering sender relationship:'\'', error);/logger.error({ error: error instanceof Error ? error.message : String(error) }, '\''gmail.sender.relationship.failed'\'');/g' "$FILE"

# Recent sender emails logs
sed -i '' '/console\.log(`📧 Fetching \${maxResults} recent emails with \${senderEmail}\.\.\.`);/d' "$FILE"
sed -i '' '/console\.log(`✅ Retrieved \${emails\.length} recent emails with \${senderEmail}`);/d' "$FILE"
sed -i '' 's/console\.error('\''❌ Error fetching recent sender emails:'\'', error);/logger.error({ error: error instanceof Error ? error.message : String(error) }, '\''gmail.sender.emails.failed'\'');/g' "$FILE"
sed -i '' 's/console\.warn(`⚠️ Could not parse email \${message\.id}:`, error);/logger.warn({ messageId: message.id }, '\''gmail.email.parse.failed'\'');/g' "$FILE"

# Thread emails logs
sed -i '' '/console\.log(`🧵 Fetching thread emails for \${threadId}\.\.\.`);/d' "$FILE"
sed -i '' '/console\.log(`✅ Retrieved \${emails\.length} emails from thread \${threadId}`);/d' "$FILE"
sed -i '' 's/console\.error('\''❌ Error fetching thread emails:'\'', error);/logger.error({ error: error instanceof Error ? error.message : String(error) }, '\''gmail.thread.fetch.failed'\'');/g' "$FILE"
sed -i '' 's/console\.warn(`⚠️ Could not parse thread message:`, error);/logger.warn({ error: error instanceof Error ? error.message : String(error) }, '\''gmail.thread.parse.failed'\'');/g' "$FILE"

# Credentials check
sed -i '' '/console\.log('\''✅ Gmail credentials are valid'\'');/d' "$FILE"
sed -i '' 's/console\.error('\''❌ Invalid Gmail credentials:'\'', error);/logger.error({ error: error instanceof Error ? error.message : String(error) }, '\''gmail.credentials.invalid'\'');/g' "$FILE"

# Webhook logs (keep important ones)
sed -i '' '/console\.log('\''📡 Setting up Gmail push notifications with Pub\/Sub\.\.\.'\'')/d' "$FILE"
sed -i '' '/console\.log(`📡 Using Pub\/Sub topic: \${pubsubTopic}`);/d' "$FILE"
sed -i '' '/console\.log(`📡 Webhook endpoint: \${webhookDomain}\/webhooks\/gmail`);/d' "$FILE"
sed -i '' 's/console\.log(`📅 Webhook expiration saved: \${expirationDate}`);/logger.info({ expirationDate: expirationDate.toISOString() }, '\''gmail.webhook.expiration.saved'\'');/g' "$FILE"
sed -i '' 's/console\.warn('\''⚠️ Failed to save webhook expiration:'\'', expError);/logger.warn({ error: expError instanceof Error ? expError.message : String(expError) }, '\''gmail.webhook.expiration.save.failed'\'');/g' "$FILE"
sed -i '' '/console\.log('\''✅ Gmail webhook setup successful with real Pub\/Sub integration!'\'');/d' "$FILE"
sed -i '' '/console\.log('\''📊 Watch details:'\'', {/,/});/d' "$FILE"
sed -i '' 's/console\.error('\''❌ Error setting up Gmail webhook:'\'', error);/logger.error({ error: error instanceof Error ? error.message : String(error) }, '\''gmail.webhook.setup.failed'\'');/g' "$FILE"

# Webhook status
sed -i '' '/console\.log('\''🔍 Checking Gmail webhook status\.\.\.'\'')/d' "$FILE"
sed -i '' 's/console\.error('\''❌ Error checking webhook status:'\'', error);/logger.error({ error: error instanceof Error ? error.message : String(error) }, '\''gmail.webhook.status.failed'\'');/g' "$FILE"

# Stop webhook
sed -i '' '/console\.log('\''🛑 Stopping Gmail webhook\.\.\.'\'')/d' "$FILE"
sed -i '' '/console\.log('\''✅ Gmail webhook stopped successfully'\'')/d' "$FILE"
sed -i '' 's/console\.error('\''❌ Error stopping Gmail webhook:'\'', error);/logger.error({ error: error instanceof Error ? error.message : String(error) }, '\''gmail.webhook.stop.failed'\'');/g' "$FILE"

# Email changes logs
sed -i '' '/console\.log(`📊 Fetching email changes since history ID: \${startHistoryId}`);/d' "$FILE"
sed -i '' '/console\.log(`✅ Found \${changes\.length} changes since \${startHistoryId}`);/d' "$FILE"
sed -i '' 's/console\.error('\''❌ Error fetching email changes:'\'', error);/logger.error({ error: error instanceof Error ? error.message : String(error) }, '\''gmail.changes.fetch.failed'\'');/g' "$FILE"

# Send email logs
sed -i '' '/console\.log(`📤 Sending email to: \${to}`);/d' "$FILE"
sed -i '' '/console\.log(`📝 Subject: \${subject}`);/d' "$FILE"
sed -i '' '/console\.log(`🧵 \[THREADING DEBUG\] ThreadId received: \${threadId \? threadId : '\''NULL\/UNDEFINED'\''}`);/d' "$FILE"
sed -i '' '/console\.log(`🧵 \[THREADING DEBUG\] Sending to Gmail API with threadId: \${threadId \? threadId : '\''undefined'\''}`);/d' "$FILE"
sed -i '' '/console\.log(`✅ Email sent successfully!`);/d' "$FILE"
sed -i '' '/console\.log(`📧 Message ID: \${messageId}`);/d' "$FILE"
sed -i '' '/console\.log(`🧵 Thread ID: \${responseThreadId}`);/d' "$FILE"
sed -i '' '/console\.log(`🧵 \[THREADING DEBUG\] Original threadId: \${threadId \? threadId : '\''undefined'\''} → Response threadId: \${responseThreadId}`);/d' "$FILE"

# Send email structured logging (add at the successful send point)
# We'll handle this manually since it needs proper placement

echo "✅ Migration script applied to $FILE"
echo "⚠️  Manual review needed for:"
echo "    - Email parsing failure logs (lines 497-502)"
echo "    - Email sending success logs (needs structured replacement)"
echo "    - Filter email logs (lines with REJECTED)"
