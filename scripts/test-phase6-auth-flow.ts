/**
 * Phase 6 Auth Flow Test Script
 *
 * Tests the new mandatory Composio integration flow for new users.
 *
 * New Flow (Phase 6):
 * 1. User signs up via Google OAuth
 * 2. Backend creates user with JWT
 * 3. Frontend redirects to /onboarding/integrations (NEW)
 * 4. User must connect Gmail via Composio
 * 5. User proceeds to /profile-setup
 * 6. User proceeds to /dashboard
 *
 * Usage:
 *   npx tsx scripts/test-phase6-auth-flow.ts <userId>
 */

import { queryWithRetry, closePool } from '../src/database/connection';
import { logger } from '../src/utils/pino-logger';

interface UserAuthStatus {
  userId: string;
  email: string;
  authMethod: string;
  migrationStatus: string;
  composioEntityId: string | null;
  composioConnectedAccountId: string | null;
  composioConnectedAt: Date | null;
  onboardingCompleted: boolean;
  createdAt: Date;
}

async function getUserAuthStatus(userId: string): Promise<UserAuthStatus | null> {
  try {
    const result = await queryWithRetry(
      `SELECT
        user_id,
        gmail_address as email,
        auth_method,
        migration_status,
        composio_entity_id,
        composio_connected_account_id,
        composio_connected_at,
        onboarding_completed,
        created_at
       FROM user_gmail_tokens
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      userId: result.rows[0].user_id,
      email: result.rows[0].email,
      authMethod: result.rows[0].auth_method,
      migrationStatus: result.rows[0].migration_status,
      composioEntityId: result.rows[0].composio_entity_id,
      composioConnectedAccountId: result.rows[0].composio_connected_account_id,
      composioConnectedAt: result.rows[0].composio_connected_at,
      onboardingCompleted: result.rows[0].onboarding_completed,
      createdAt: result.rows[0].created_at
    };
  } catch (error: any) {
    console.error('❌ Error fetching user status:', error.message);
    return null;
  }
}

function printHeader(title: string) {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log(`║  ${title.padEnd(60)} ║`);
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
}

function printSection(title: string) {
  console.log(`\n${'─'.repeat(64)}`);
  console.log(`  ${title}`);
  console.log(`${'─'.repeat(64)}\n`);
}

async function testAuthFlow(userId: string) {
  printHeader('Phase 6: Auth Flow Test');

  console.log(`📋 Testing user: ${userId}\n`);

  // Step 1: Get user status
  printSection('Step 1: Check User Status');
  const status = await getUserAuthStatus(userId);

  if (!status) {
    console.log('❌ User not found in database');
    console.log('\n💡 To test Phase 6:');
    console.log('   1. Sign up a new user via Google OAuth');
    console.log('   2. Note the user_id from backend logs');
    console.log('   3. Run this script with that user_id');
    return;
  }

  console.log('👤 User Details:');
  console.log(`   Email: ${status.email}`);
  console.log(`   User ID: ${status.userId}`);
  console.log(`   Created: ${status.createdAt.toISOString()}`);
  console.log(`   Onboarding Complete: ${status.onboardingCompleted}`);

  // Step 2: Check auth method
  printSection('Step 2: Auth Method Check');
  console.log(`   Auth Method: ${status.authMethod}`);
  console.log(`   Migration Status: ${status.migrationStatus}`);

  if (status.authMethod === 'google_oauth' && !status.composioConnectedAccountId) {
    console.log('\n⚠️  User Status: Legacy User (Google OAuth only)');
    console.log('   This user was created before Phase 6 migration');
    console.log('   Expected behavior:');
    console.log('   - Can still use system via Google OAuth');
    console.log('   - Should see "Connect via Composio" option in /integrations');
    console.log('   - Not required to connect until ready');
  } else if (status.authMethod === 'composio' && status.composioConnectedAccountId) {
    console.log('\n✅ User Status: Fully Migrated (Composio)');
    console.log('   This user has completed Composio connection');
  } else {
    console.log('\n🔄 User Status: In Migration');
    console.log('   Auth method indicates pending Composio connection');
  }

  // Step 3: Check Composio connection
  printSection('Step 3: Composio Connection Status');
  const hasComposioEntity = status.composioEntityId !== null;
  const hasComposioConnection = status.composioConnectedAccountId !== null;

  console.log(`   Composio Entity ID: ${status.composioEntityId || '❌ Not created'}`);
  console.log(`   Connected Account ID: ${status.composioConnectedAccountId || '❌ Not connected'}`);
  console.log(`   Connected At: ${status.composioConnectedAt?.toISOString() || 'N/A'}`);

  if (!hasComposioEntity) {
    console.log('\n⚠️  Composio Entity Missing');
    console.log('   User has not initiated Composio connection');
    console.log('   Expected frontend flow:');
    console.log('   1. After Google OAuth → Redirect to /onboarding/integrations');
    console.log('   2. Click "Connect Gmail" button');
    console.log('   3. Complete Composio OAuth in popup');
    console.log('   4. Entity and connection created automatically');
  } else if (!hasComposioConnection) {
    console.log('\n⚠️  Composio Connection Incomplete');
    console.log('   Entity exists but connection not completed');
    console.log('   User may have started but not finished OAuth');
  } else {
    console.log('\n✅ Composio Connection Complete');
    console.log('   User can access all provider-based features');
  }

  // Step 4: Test expected frontend flow
  printSection('Step 4: Frontend Flow Validation');

  const isNewUser = !status.onboardingCompleted;
  console.log(`   Is New User: ${isNewUser}`);
  console.log(`   Has Composio: ${hasComposioConnection}`);

  console.log('\n📍 Expected Frontend Route:');
  if (isNewUser && !hasComposioConnection) {
    console.log('   ✅ Should redirect to: /onboarding/integrations');
    console.log('   User must connect Gmail before proceeding');
  } else if (isNewUser && hasComposioConnection) {
    console.log('   ✅ Should redirect to: /profile-setup');
    console.log('   Composio connected, continue onboarding');
  } else if (!isNewUser && !hasComposioConnection) {
    console.log('   ✅ Should allow: /dashboard access');
    console.log('   Legacy user, optional Composio connection via /integrations');
  } else {
    console.log('   ✅ Should redirect to: /dashboard');
    console.log('   Fully onboarded user');
  }

  // Step 5: API Access Test
  printSection('Step 5: API Access Validation');

  console.log('📊 Provider-based API Routes:');
  console.log('   Route: GET /emails/fetch');
  console.log(`   Access: ${hasComposioConnection ? '✅ Allowed' : '❌ Blocked (needs Composio)'}`);
  console.log('   Route: POST /auto-drafts/:id/send');
  console.log(`   Access: ${hasComposioConnection ? '✅ Allowed' : '❌ Blocked (needs Composio)'}`);

  if (!hasComposioConnection) {
    console.log('\n⚠️  Provider routes will fail with:');
    console.log('   Error: "User has not connected via Composio"');
    console.log('   Solution: Connect via /onboarding/integrations page');
  }

  // Summary
  printSection('Summary');

  const canUseSystem = hasComposioConnection || status.authMethod === 'google_oauth';
  console.log(`   Overall Status: ${canUseSystem ? '✅ Can use system' : '⚠️  Needs Composio connection'}`);
  console.log(`   Auth Method: ${status.authMethod}`);
  console.log(`   Migration Complete: ${hasComposioConnection ? 'Yes' : 'No'}`);
  console.log(`   Next Step: ${
    !hasComposioConnection
      ? 'Connect Gmail via /onboarding/integrations'
      : isNewUser
      ? 'Complete profile setup'
      : 'Use dashboard normally'
  }`);

  console.log('\n');
}

async function main() {
  const userId = process.argv[2];

  if (!userId) {
    console.error('Usage: npx tsx scripts/test-phase6-auth-flow.ts <userId>');
    console.error('\nExample:');
    console.error('  npx tsx scripts/test-phase6-auth-flow.ts user_abc123xyz');
    process.exit(1);
  }

  try {
    await testAuthFlow(userId);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

main();
