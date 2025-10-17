const fs = require('fs');
const path = require('path');

const CONNECTION_FILE = path.join(__dirname, '../src/database/connection.ts');
const AUTH_FILE = path.join(__dirname, '../src/middleware/auth.ts');

function migrateConnectionFile() {
  let content = fs.readFileSync(CONNECTION_FILE, 'utf8');

  // Replace pool error console.error
  content = content.replace(
    /console\.error\('❌ \[POOL ERROR\] Unexpected database pool error:', \{[^}]+\}\);/s,
    `logger.error({
      code: err.code,
      error: err.message
    }, 'database.pool.error');`
  );

  // Replace retry warnings
  content = content.replace(
    /console\.warn\(`⚠️  \[RETRY\] Database connection error, attempt \$\{attempt\}\/\$\{maxRetries\}:`, \{[^}]+\}\);/g,
    `logger.warn({
        attempt,
        maxRetries,
        code: error.code,
        error: error.message
      }, 'database.query.retry');`
  );

  // Replace connection success logs
  content = content.replace(
    /console\.log\(`🔌 \[DATABASE\] Connection attempt \$\{attempt\}\/\$\{maxRetries\}\.\.\.\`\);/g,
    `logger.debug({ attempt, maxRetries }, 'database.connection.attempt');`
  );

  content = content.replace(
    /console\.log\(`✅ Database connected successfully in \$\{connectionTime\}ms:`, result\.rows\[0\]\.now\);/g,
    `logger.info({ connectionTime }, 'database.connected');`
  );

  // Replace slow connection warning
  content = content.replace(
    /console\.warn\(`⚠️  \[DATABASE\] Slow connection detected \(\$\{connectionTime\}ms\) - NEON cold start likely occurred\`\);/g,
    `logger.warn({ connectionTime }, 'database.connection.slow');`
  );

  // Replace retry warnings in testConnection
  content = content.replace(
    /console\.warn\(`⚠️  \[DATABASE\] Connection attempt \$\{attempt\}\/\$\{maxRetries\} failed \(NEON cold start\?\)\`\);/g,
    `logger.warn({ attempt, maxRetries }, 'database.connection.attempt.failed');`
  );

  content = content.replace(
    /console\.warn\(`   Error: \$\{error\.message\}\`\);/g,
    `logger.warn({ error: error.message }, 'database.connection.error.detail');`
  );

  content = content.replace(
    /console\.warn\(`   Retrying in \$\{waitTime\}ms\.\.\.\`\);/g,
    `logger.warn({ waitTime }, 'database.connection.retry.wait');`
  );

  // Replace connection failure errors
  content = content.replace(
    /console\.error\(`❌ Database connection failed \(attempt \$\{attempt\}\/\$\{maxRetries\}\):`, \{[^}]+\}\);/gs,
    `logger.error({
        attempt,
        maxRetries,
        code: error.code,
        error: error.message
      }, 'database.connection.failed');`
  );

  content = content.replace(
    /console\.error\('❌ All connection attempts exhausted\. Database unavailable\.'\);/g,
    `logger.error({ maxRetries }, 'database.connection.exhausted');`
  );

  content = content.replace(
    /console\.error\('❌ Database connection failed after', maxRetries, 'attempts'\);/g,
    `logger.error({ maxRetries }, 'database.connection.failed.final');`
  );

  // Replace pool close logs
  content = content.replace(
    /console\.log\('✅ Database pool closed successfully'\);/g,
    `logger.info({}, 'database.pool.closed');`
  );

  content = content.replace(
    /console\.error\('❌ Error closing database pool:', error\);/g,
    `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'database.pool.close.failed');`
  );

  // Replace initialization logs
  content = content.replace(
    /console\.log\('📥 Loading complete working schema\.\.\.'\);/g,
    `logger.info({}, 'database.schema.loading');`
  );

  content = content.replace(
    /console\.log\('✅ Database schema initialized \(Complete Working Schema - 39 tables\)'\);/g,
    `logger.info({ tableCount: 39 }, 'database.schema.initialized');`
  );

  content = content.replace(
    /console\.log\('✅ Database schema already initialized'\);/g,
    `logger.info({}, 'database.schema.already.initialized');`
  );

  content = content.replace(
    /console\.log\('🔧 Applying comprehensive constraint fixes for all tables\.\.\.'\);/g,
    `logger.info({}, 'database.constraints.applying');`
  );

  content = content.replace(
    /console\.log\('✅ All table constraints verified\/added \(10 tables fixed\)'\);/g,
    `logger.info({ tablesFixed: 10 }, 'database.constraints.verified');`
  );

  content = content.replace(
    /console\.log\('⚠️  Constraint fix warning:', error\.message\);/g,
    `logger.warn({ error: error.message }, 'database.constraints.warning');`
  );

  content = content.replace(
    /console\.log\('🌍 Applying timezone support migration\.\.\.'\);/g,
    `logger.info({}, 'database.timezone.migration.applying');`
  );

  content = content.replace(
    /console\.log\('✅ Timezone support migration applied successfully'\);/g,
    `logger.info({}, 'database.timezone.migration.applied');`
  );

  content = content.replace(
    /console\.log\('⚠️  Timezone migration warning:', error\.message\);/g,
    `logger.warn({ error: error.message }, 'database.timezone.migration.warning');`
  );

  // Replace other initialization success logs
  content = content.replace(
    /console\.log\('✅ Database schema initialized \(Phase 1-4: Full 24\/7 AI Assistant\)'\);/g,
    `logger.info({ phase: '1-4' }, 'database.schema.initialized.phase');`
  );

  content = content.replace(
    /console\.log\('✅ Database schema initialized \(Phase 1 \+ 2 \+ 2\.2 \+ 2\.3 \+ 2\.4 \+ 3 \+ 3\.3 Auto-Scheduling\)'\);/g,
    `logger.info({ phase: '1-3.3' }, 'database.schema.initialized.phase');`
  );

  content = content.replace(
    /console\.log\('✅ Database schema initialized \(Phase 1 \+ 2 \+ 2\.2 \+ 2\.3 \+ 2\.4 \+ 3 Calendar Intelligence\)'\);/g,
    `logger.info({ phase: '1-3' }, 'database.schema.initialized.phase');`
  );

  content = content.replace(
    /console\.log\('✅ Database schema initialized \(Phase 1 \+ 2 \+ 2\.2 \+ 2\.3 \+ 2\.4 Learning System\)'\);/g,
    `logger.info({ phase: '1-2.4' }, 'database.schema.initialized.phase');`
  );

  content = content.replace(
    /console\.log\('✅ Database schema initialized \(Phase 1 \+ 2 \+ 2\.2 \+ 2\.3 Smart Response\)'\);/g,
    `logger.info({ phase: '1-2.3' }, 'database.schema.initialized.phase');`
  );

  content = content.replace(
    /console\.log\('✅ Database schema initialized \(Phase 1 \+ 2 \+ 2\.2 Context Intelligence\)'\);/g,
    `logger.info({ phase: '1-2.2' }, 'database.schema.initialized.phase');`
  );

  content = content.replace(
    /console\.log\('✅ Database schema initialized \(Phase 1 \+ 2\)'\);/g,
    `logger.info({ phase: '1-2' }, 'database.schema.initialized.phase');`
  );

  // Replace initialization error log
  content = content.replace(
    /console\.error\('❌ Database initialization failed:', error\);/g,
    `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'database.initialization.failed');`
  );

  fs.writeFileSync(CONNECTION_FILE, content, 'utf8');
  console.log('✓ Migrated connection.ts');
}

function migrateAuthFile() {
  let content = fs.readFileSync(AUTH_FILE, 'utf8');

  // Replace JWT_SECRET missing error
  content = content.replace(
    /console\.error\('❌ JWT_SECRET not configured'\);/g,
    `logger.error({}, 'auth.jwt.secret.missing');`
  );

  // Replace token expiration log
  content = content.replace(
    /console\.log\('🕐 JWT token expired'\);/g,
    `logger.debug({}, 'auth.jwt.token.expired');`
  );

  // Replace invalid token log
  content = content.replace(
    /console\.log\('❌ Invalid JWT token'\);/g,
    `logger.debug({}, 'auth.jwt.token.invalid');`
  );

  // Replace authentication success log
  content = content.replace(
    /console\.log\(`🔐 Authenticated user: \$\{payload\.email\} \(\$\{payload\.userId\.substring\(0, 8\)\}\.\.\.\)\`\);/g,
    `logger.debug({
      userId: sanitizeUserId(payload.userId),
      email: payload.email
    }, 'auth.user.authenticated');`
  );

  // Replace authentication middleware error
  content = content.replace(
    /console\.error\('❌ Authentication middleware error:', error\);/g,
    `logger.error({
      error: error instanceof Error ? error.message : String(error)
    }, 'auth.middleware.error');`
  );

  // Replace optional authentication error
  content = content.replace(
    /console\.error\('❌ Optional authentication error:', error\);/g,
    `logger.error({
      error: error instanceof Error ? error.message : String(error)
    }, 'auth.optional.error');`
  );

  fs.writeFileSync(AUTH_FILE, content, 'utf8');
  console.log('✓ Migrated auth.ts');
}

console.log('🔄 Starting final logging migration...\n');

try {
  migrateConnectionFile();
  migrateAuthFile();
  console.log('\n✅ Final logging migration complete!');
  console.log('   Run: npx tsc --noEmit to verify compilation');
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}
