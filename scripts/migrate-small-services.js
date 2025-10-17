/**
 * Batch migrate small services to structured logging
 * Files: database/connection.ts, webhookRenewal.ts, auth.ts
 */

const fs = require('fs');
const path = require('path');

const files = [
  {
    path: path.join(__dirname, '../src/database/connection.ts'),
    name: 'Database Connection'
  },
  {
    path: path.join(__dirname, '../src/services/webhookRenewal.ts'),
    name: 'Webhook Renewal'
  },
  {
    path: path.join(__dirname, '../src/middleware/auth.ts'),
    name: 'Auth Middleware'
  }
];

function migrateFile(filePath, fileName) {
  console.log(`\n📝 Migrating ${fileName}...`);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return 0;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;

  // Add import if not already present
  if (!content.includes("from '../utils/pino-logger'") && !content.includes("from './utils/pino-logger'")) {
    // Find the last import statement
    const importRegex = /^import .* from .*;\s*$/gm;
    const imports = content.match(importRegex);
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const importPath = filePath.includes('middleware') ? '../utils/pino-logger' :
                         filePath.includes('database') ? '../utils/pino-logger' : '../utils/pino-logger';
      content = content.replace(
        lastImport,
        `${lastImport}\nimport { logger, sanitizeUserId } from '${importPath}';`
      );
      changes++;
      console.log('  ✓ Added logger import');
    }
  }

  const originalContent = content;

  // DATABASE CONNECTION MIGRATIONS
  if (fileName === 'Database Connection') {
    // Pool error logs
    content = content.replace(
      /console\.error\('❌ \[POOL\] Database connection error:', err\);/g,
      `logger.error({ error: err.message, code: (err as any).code }, 'db.pool.connection.error');`
    );

    // Keep pool initialization log but make it structured
    content = content.replace(
      /console\.log\('✅ \[POOL\] Database connection pool initialized successfully'\);/g,
      `logger.info({ max: poolConfig.max, min: poolConfig.min }, 'db.pool.initialized');`
    );

    // Query retry logs
    content = content.replace(
      /console\.warn\(`⚠️ Database query failed, retrying \(\${retries}\/\${maxRetries}\)\.\.\. Error: \${error\.message}\`\);/g,
      `logger.warn({ attempt: retries, maxRetries, error: error.message }, 'db.query.retry');`
    );

    content = content.replace(
      /console\.error\('❌ Database query failed after retries:', error\);/g,
      `logger.error({ maxRetries, error: error.message, query: query.substring(0, 100) }, 'db.query.failed');`
    );
  }

  // WEBHOOK RENEWAL MIGRATIONS
  if (fileName === 'Webhook Renewal') {
    // Remove noise logs
    content = content.replace(/console\.log\('🔄 Starting webhook renewal service\.\.\.'\);?\n?/g, '');
    content = content.replace(/console\.log\('✅ Webhook renewal service started \(checks every 6 hours\)'\);?\n?/g, '');
    content = content.replace(/console\.log\('🛑 Webhook renewal service stopped'\);?\n?/g, '');

    // Service start/stop (keep as info)
    content = content.replace(
      /\/\/ Run immediately on startup\s+this\.checkAndRenewWebhooks\(\);/,
      `logger.info({ intervalHours: 6 }, 'webhook.renewal.service.started');\n    // Run immediately on startup\n    this.checkAndRenewWebhooks();`
    );

    // Checking logs (remove noise)
    content = content.replace(/console\.log\('🔍 Checking for expiring webhooks\.\.\.'\);?\n?/g, '');
    content = content.replace(/console\.log\('✅ No webhooks need renewal at this time'\);?\n?/g, '');

    // Expiring webhooks found (keep as warning)
    content = content.replace(
      /console\.log\(`⚠️ Found \$\{expiringUsers\.length\} webhook\(s\) expiring within 24 hours`\);/g,
      `logger.warn({ count: expiringUsers.length }, 'webhook.renewal.required');`
    );

    // Error in renewal check
    content = content.replace(
      /console\.error\('❌ Error in webhook renewal check:', error\);/g,
      `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'webhook.renewal.check.failed');`
    );

    // User renewal logs (remove noise, keep result)
    content = content.replace(/console\.log\(`🔄 Renewing webhook for user: \$\{gmailAddress\}`\);?\n?/g, '');

    content = content.replace(
      /console\.log\(`✅ Webhook renewed successfully for \$\{gmailAddress\}:`\);\s+console\.log\(`   - New expiration: \$\{new Date\(parseInt\(watchResponse\.expiration\)\)\}`\);\s+console\.log\(`   - History ID: \$\{watchResponse\.historyId\}`\);/g,
      `logger.info({ gmailAddress, expiresAt: new Date(parseInt(watchResponse.expiration)).toISOString(), historyId: watchResponse.historyId }, 'webhook.renewed');`
    );

    // Renewal failure
    content = content.replace(
      /console\.error\(`❌ Failed to renew webhook for \$\{gmailAddress\}:`, error\);/g,
      `logger.error({ gmailAddress, error: error instanceof Error ? error.message : String(error) }, 'webhook.renewal.failed');`
    );

    content = content.replace(
      /console\.warn\(`🚨 Disabling webhook for \$\{gmailAddress\} due to invalid credentials`\);/g,
      `logger.warn({ gmailAddress, reason: 'invalid_credentials' }, 'webhook.disabled');`
    );

    // Manual trigger
    content = content.replace(/console\.log\('🔧 Manual webhook renewal check triggered'\);?\n?/g, '');

    // Error getting status
    content = content.replace(
      /console\.error\('❌ Error getting webhook status:', error\);/g,
      `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'webhook.status.failed');`
    );
  }

  // AUTH MIDDLEWARE MIGRATIONS
  if (fileName === 'Auth Middleware') {
    // Token validation errors
    content = content.replace(
      /console\.error\('❌ JWT verification failed:', error\);/g,
      `logger.error({ error: error instanceof Error ? error.message : String(error), errorName: (error as any).name }, 'auth.jwt.verification.failed');`
    );

    // Specific JWT errors
    content = content.replace(
      /console\.error\('❌ JWT token expired'\);/g,
      `logger.warn({ reason: 'token_expired' }, 'auth.jwt.expired');`
    );

    content = content.replace(
      /console\.error\('❌ Invalid JWT token'\);/g,
      `logger.warn({ reason: 'invalid_token' }, 'auth.jwt.invalid');`
    );

    // No token provided
    content = content.replace(
      /console\.error\('❌ No token provided'\);/g,
      `logger.warn({ reason: 'no_token' }, 'auth.token.missing');`
    );

    // User not found
    content = content.replace(
      /console\.error\(`❌ User not found: \$\{userId\}`\);/g,
      `logger.warn({ userId: sanitizeUserId(userId) }, 'auth.user.not_found');`
    );

    // General auth error
    content = content.replace(
      /console\.error\('❌ Authentication error:', error\);/g,
      `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'auth.error');`
    );
  }

  // Count actual changes
  if (content !== originalContent) {
    const diff = content.length - originalContent.length;
    changes = Math.abs(diff) > 100 ? 10 : 5; // Rough estimate
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✓ Migration complete (${changes} changes)`);
  } else {
    console.log(`  ℹ️  No changes needed`);
  }

  return changes;
}

// Run migrations
console.log('╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║              BATCH 1: Small Services Migration                            ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝');

let totalChanges = 0;

files.forEach(file => {
  const changes = migrateFile(file.path, file.name);
  totalChanges += changes;
});

console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║                         BATCH 1 COMPLETE                                   ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝');
console.log(`\n✅ Total changes: ${totalChanges}`);
console.log('⚠️  NEXT STEP: Run TypeScript compilation to verify');
