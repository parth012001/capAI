/**
 * Batch migrate console.log/error/warn to Pino structured logging
 * Applies targeted replacements based on the migration plan
 */

const fs = require('fs');
const path = require('path');

const GMAIL_FILE = path.join(__dirname, '../src/services/gmail.ts');

function migrateGmailService() {
  let content = fs.readFileSync(GMAIL_FILE, 'utf8');
  let changes = 0;

  // Remove high-frequency noise logs (getSentEmails method)
  const noiseLogs = [
    /console\.log\(`📤 Fetching up to \$\{maxResults\} sent emails for tone analysis\.\.\.\`\);?\n?/g,
    /console\.log\('No sent messages found'\);?\n?/g,
    /console\.log\(`📤 Found \$\{response\.data\.messages\.length\} sent emails`\);?\n?/g,
    /console\.log\(`⚠️ Email \$\{message\.id\} not accessible - skipping \(cross-user access blocked\)`\);?\n?/g,
  ];

  noiseLogs.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      changes += matches.length;
      content = content.replace(pattern, '');
    }
  });

  // Replace error logs with structured versions
  const errorReplacements = [
    {
      from: /console\.error\(`❌ Error fetching sent email \$\{message\.id\}:`,\s*error instanceof Error \? error\.message : 'Unknown error'\);/g,
      to: `logger.warn({ messageId: message.id }, 'gmail.sent.fetch.skipped');`
    },
    {
      from: /console\.error\('❌ Error fetching sent emails:', error\);/g,
      to: `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'gmail.sent.fetch.failed');`
    }
  ];

  errorReplacements.forEach(({ from, to }) => {
    if (content.match(from)) {
      changes++;
      content = content.replace(from, to);
    }
  });

  // Remove filter/rejection logs (too verbose)
  const filterLogs = [
    /console\.log\(`❌ REJECTED: "\$\{parsed\.subject\.substring\(0, 50\)\}" - Reason: \$\{validationResult\.reason\}`\);?\n?/g,
    /console\.log\(`🔍 Filtered \$\{filtered\.length\} emails from \$\{emails\.length\} sent emails`\);?\n?/g,
    /console\.log\(`📊 Rejection Breakdown:`, rejectedReasons\);?\n?/g,
  ];

  filterLogs.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      changes += matches.length;
      content = content.replace(pattern, '');
    }
  });

  // Remove parsing error dumps (keep errors but remove verbose dumps)
  content = content.replace(
    /console\.error\(`🚨 EMAIL PARSING FAILED for \$\{emailData\.id\}:`\);[\s\S]*?console\.error\(`Gmail snippet: \$\{emailData\.snippet\}`\);/g,
    `logger.error({
        emailId: emailData.id,
        subject: getHeader('Subject'),
        from: getHeader('From'),
        bodyLength: body.length,
        hasSnippet: !!emailData.snippet
      }, 'gmail.email.parse.failed');`
  );
  changes++;

  // Remove sender relationship discovery logs
  const senderLogs = [
    /console\.log\(`🔍 Discovering relationship history with \$\{senderEmail\}\.\.\.\`\);?\n?/g,
    /console\.log\(`✅ Sender relationship: \$\{classification\} \(\$\{totalEmails\} total emails\)`\);?/g,
    /console\.warn\('⚠️ Could not get message details for dates:', error\);?/g,
  ];

  senderLogs.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      changes += matches.length;
      content = content.replace(pattern, '');
    }
  });

  // Replace sender relationship error
  content = content.replace(
    /console\.error\('❌ Error discovering sender relationship:', error\);/g,
    `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'gmail.sender.relationship.failed');`
  );

  // Remove recent sender emails logs
  const recentSenderLogs = [
    /console\.log\(`📧 Fetching \$\{maxResults\} recent emails with \$\{senderEmail\}\.\.\.\`\);?\n?/g,
    /console\.log\(`✅ Retrieved \$\{emails\.length\} recent emails with \$\{senderEmail\}`\);?\n?/g,
    /console\.warn\(`⚠️ Could not parse email \$\{message\.id\}:`, error\);?\n?/g,
  ];

  recentSenderLogs.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      changes += matches.length;
      content = content.replace(pattern, '');
    }
  });

  content = content.replace(
    /console\.error\('❌ Error fetching recent sender emails:', error\);/g,
    `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'gmail.sender.emails.failed');`
  );

  // Remove thread email logs
  const threadLogs = [
    /console\.log\(`🧵 Fetching thread emails for \$\{threadId\}\.\.\.\`\);?\n?/g,
    /console\.log\(`✅ Retrieved \$\{emails\.length\} emails from thread \$\{threadId\}`\);?\n?/g,
    /console\.warn\(`⚠️ Could not parse thread message:`, error\);?\n?/g,
  ];

  threadLogs.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      changes += matches.length;
      content = content.replace(pattern, '');
    }
  });

  content = content.replace(
    /console\.error\('❌ Error fetching thread emails:', error\);/g,
    `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'gmail.thread.fetch.failed');`
  );

  // Credentials check
  content = content.replace(/console\.log\('✅ Gmail credentials are valid'\);?\n?/g, '');
  content = content.replace(
    /console\.error\('❌ Invalid Gmail credentials:', error\);/g,
    `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'gmail.credentials.invalid');`
  );

  // Webhook logs
  const webhookNoiseLogs = [
    /console\.log\('📡 Setting up Gmail push notifications with Pub\/Sub\.\.\.'\);?\n?/g,
    /console\.log\(`📡 Using Pub\/Sub topic: \$\{pubsubTopic\}`\);?\n?/g,
    /console\.log\(`📡 Webhook endpoint: \$\{webhookDomain\}\/webhooks\/gmail`\);?\n?/g,
    /console\.log\('✅ Gmail webhook setup successful with real Pub\/Sub integration!'\);?\n?/g,
    /console\.log\('📊 Watch details:',[\s\S]*?\}\);?\n?/g,
    /console\.log\('🔍 Checking Gmail webhook status\.\.\.'\);?\n?/g,
    /console\.log\('🛑 Stopping Gmail webhook\.\.\.'\);?\n?/g,
    /console\.log\('✅ Gmail webhook stopped successfully'\);?\n?/g,
  ];

  webhookNoiseLogs.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      changes += matches.length;
      content = content.replace(pattern, '');
    }
  });

  // Webhook errors
  const webhookErrors = [
    {
      from: /console\.warn\('⚠️ Failed to save webhook expiration:', expError\);/g,
      to: `logger.warn({ error: expError instanceof Error ? expError.message : String(expError) }, 'gmail.webhook.expiration.save.failed');`
    },
    {
      from: /console\.error\('❌ Error setting up Gmail webhook:', error\);/g,
      to: `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'gmail.webhook.setup.failed');`
    },
    {
      from: /console\.error\('❌ Error checking webhook status:', error\);/g,
      to: `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'gmail.webhook.status.failed');`
    },
    {
      from: /console\.error\('❌ Error stopping Gmail webhook:', error\);/g,
      to: `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'gmail.webhook.stop.failed');`
    }
  ];

  webhookErrors.forEach(({ from, to }) => {
    if (content.match(from)) {
      changes++;
      content = content.replace(from, to);
    }
  });

  // Webhook expiration saved (keep this one)
  content = content.replace(
    /console\.log\(`📅 Webhook expiration saved: \$\{expirationDate\}`\);/g,
    `logger.info({ expirationDate: expirationDate.toISOString(), userId: sanitizeUserId(this.currentUserId || 'unknown') }, 'gmail.webhook.expiration.saved');`
  );

  // Email changes logs
  const changesLogs = [
    /console\.log\(`📊 Fetching email changes since history ID: \$\{startHistoryId\}`\);?\n?/g,
    /console\.log\(`✅ Found \$\{changes\.length\} changes since \$\{startHistoryId\}`\);?\n?/g,
  ];

  changesLogs.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      changes += matches.length;
      content = content.replace(pattern, '');
    }
  });

  content = content.replace(
    /console\.error\('❌ Error fetching email changes:', error\);/g,
    `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'gmail.changes.fetch.failed');`
  );

  // Send email logs (remove all debug logs, add structured success log)
  const sendEmailNoiseLogs = [
    /console\.log\(`📤 Sending email to: \$\{to\}`\);?\n?/g,
    /console\.log\(`📝 Subject: \$\{subject\}`\);?\n?/g,
    /console\.log\(`🧵 \[THREADING DEBUG\][\s\S]*?\);?\n?/g,
    /console\.log\(`✅ Email sent successfully!`\);?\n?/g,
    /console\.log\(`📧 Message ID: \$\{messageId\}`\);?\n?/g,
    /console\.log\(`🧵 Thread ID: \$\{responseThreadId\}`\);?\n?/g,
  ];

  sendEmailNoiseLogs.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      changes += matches.length;
      content = content.replace(pattern, '');
    }
  });

  // Add structured success log for email sending
  content = content.replace(
    /(const messageId = response\.data\.id;\s+const responseThreadId = response\.data\.threadId;)/,
    `$1

      logger.info({
        userId: sanitizeUserId(this.currentUserId || 'unknown'),
        to,
        messageId,
        threadId: responseThreadId,
        hasThread: !!threadId
      }, 'gmail.email.sent');`
  );

  // Send email errors
  const sendErrorPattern = /console\.error\('❌ Send failed: ([^']+)', error\);/g;
  content = content.replace(sendErrorPattern, (match, p1) => {
    return `logger.error({ reason: '${p1}', error: error instanceof Error ? error.message : String(error) }, 'gmail.email.send.failed');`;
  });

  content = content.replace(
    /const message = error instanceof Error \? error\.message : String\(error\);\s+console\.error\('❌ Error sending email:', message\);/g,
    `const message = error instanceof Error ? error.message : String(error);
      logger.error({ error: message }, 'gmail.email.send.failed');`
  );

  // Write back the file
  fs.writeFileSync(GMAIL_FILE, content, 'utf8');

  console.log(`✅ Gmail service migration complete: ${changes} changes applied`);
}

// Run migration
try {
  migrateGmailService();
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}
