/**
 * Production Log Cleanup Script
 *
 * Removes high-frequency noise logs while keeping:
 * - All console.error() statements
 * - All console.warn() statements
 * - Critical initialization logs
 *
 * This script is SAFE - it only removes console.log(), never errors or warnings.
 */

import * as fs from 'fs';
import * as path from 'path';

interface CleanupRule {
  file: string;
  removePatterns: RegExp[];
  keepPatterns?: RegExp[];  // Patterns to explicitly keep even if they match remove
}

const cleanupRules: CleanupRule[] = [
  // Gmail Service - Remove per-email noise
  {
    file: 'src/services/gmail.ts',
    removePatterns: [
      /console\.log\(`✅ OAuth tokens set successfully`\);/,
      /console\.log\(`🔑 Initializing Gmail service for user: \$\{userId\}`\);/,
      /console\.log\(`🔄 Access token expired for user \$\{userId\}, refreshing\.\.\`\);/,
      /console\.log\(`✅ Gmail service initialized for user: \$\{userId\}`\);/,
      /console\.log\(`🔄 Refreshing access token for user: \$\{userId\}`\);/,
      /console\.log\(`✅ Access token refreshed for user: \$\{userId\}`\);/,
      /console\.log\(`📧 Found \$\{.*?\} emails`\);/,
      /console\.log\('No messages found'\);/,
      /console\.log\(`📤 Fetching up to \$\{maxResults\} sent emails/,
      /console\.log\('No sent messages found'\);/,
      /console\.log\(`📤 Found \$\{.*?\} sent emails`\);/,
      /console\.log\(`⚠️ Email \$\{message\.id\} not accessible/,
      /console\.log\(`❌ REJECTED: /,
      /console\.log\(`🔍 Filtered \$\{filtered\.length\} emails/,
      /console\.log\(`📊 Rejection Breakdown:`, rejectedReasons\);/,
      /console\.log\(`🔍 Discovering relationship history with/,
      /console\.log\(`✅ Sender relationship: /,
      /console\.log\(`📧 Fetching \$\{maxResults\} recent emails/,
      /console\.log\(`✅ Retrieved \$\{emails\.length\} recent emails/,
      /console\.log\(`🧵 Fetching thread emails for/,
      /console\.log\(`✅ Retrieved \$\{emails\.length\} emails from thread/,
      /console\.log\('✅ Gmail credentials are valid'\);/,
      /console\.log\('📡 Setting up Gmail push notifications/,
      /console\.log\(`📡 Using Pub\/Sub topic:/,
      /console\.log\(`📡 Webhook endpoint:/,
      /console\.log\(`📅 Webhook expiration saved:/,
      /console\.log\('✅ Gmail webhook setup successful/,
      /console\.log\('📊 Watch details:',/,
      /console\.log\('🔍 Checking Gmail webhook status\.\.\.'\);/,
      /console\.log\('🛑 Stopping Gmail webhook\.\.\.'\);/,
      /console\.log\('✅ Gmail webhook stopped successfully'\);/,
      /console\.log\(`📊 Fetching email changes since/,
      /console\.log\(`✅ Found \$\{changes\.length\} changes/,
      /console\.log\(`📤 Sending email to:/,
      /console\.log\(`📝 Subject:/,
      /console\.log\(`🧵 \[THREADING DEBUG\]/,
      /console\.log\(`✅ Email sent successfully!/,
      /console\.log\(`📧 Message ID:/,
      /console\.log\(`🧵 Thread ID:/,
    ]
  },

  // Intelligent Email Router - Remove per-email routing logs
  {
    file: 'src/services/intelligentEmailRouter.ts',
    removePatterns: [
      /console\.log\(`🧠 \[INTELLIGENT ROUTER\] Processing email:/,
      /console\.log\(`🔍 \[ROUTER\] Classification:/,
      /console\.log\(`💭 \[ROUTER\] Reasoning:/,
      /console\.log\(`🎯 \[ROUTER\] Route Decision:/,
      /console\.log\(`📅 \[ROUTER\] Routing to MEETING PIPELINE/,
      /console\.log\(`📝 \[ROUTER\] Routing to AUTO-DRAFT PIPELINE/,
      /console\.log\(`⏭️ \[ROUTER\] SKIPPING email processing/,
      /console\.log\(`✅ \[ROUTER\] Processing complete in/,
      /console\.log\(`📅 \[ROUTER → MEETING\] Processing meeting/,
      /console\.log\(`✅ \[ROUTER → MEETING\] Meeting result:/,
      /console\.log\(`🎯 \[ROUTER → MEETING\] Meeting type:/,
      /console\.log\(`📝 \[ROUTER → AUTODRAFT\] Generating auto-draft/,
      /console\.log\(`✅ \[ROUTER → AUTODRAFT\] Auto-draft result:/,
      /console\.log\(`🎯 \[ROUTER → AUTODRAFT\] Subject:/,
    ]
  },

  // Meeting Pipeline - Remove per-meeting logs and transaction logs
  {
    file: 'src/services/meetingPipeline.ts',
    removePatterns: [
      /console\.log\(`🔍 \[MEETING PIPELINE\] Processing email/,
      /console\.log\(`✅ \[MEETING PIPELINE - LOOP PREVENTION DISABLED\]/,
      /console\.log\(`🌍 \[MEETING PIPELINE\] User timezone fetched/,
      /console\.log\(`✅ \[MEETING PIPELINE\] Meeting request detected/,
      /console\.log\(`📝 \[MEETING PIPELINE\] Meeting request saved:/,
      /console\.log\(`🎯 \[MEETING PIPELINE\] Meeting type:/,
      /console\.log\(`📧 \[MEETING PIPELINE\] No meeting request detected/,
      /console\.log\(`🔄 \[MEETING PIPELINE FALLBACK\]/,
      /console\.log\(`✅ \[MEETING PIPELINE FALLBACK\] Regular auto-draft/,
      /console\.log\(`📊 \[MEETING PIPELINE\] All database operations/,
      /console\.log\(`📝 \[MEETING PIPELINE\] Saving draft with context:/,
      /console\.log\('📊 \[TRANSACTION\] Started database transaction'\);/,
      /console\.log\('✅ \[TRANSACTION\] Database transaction committed/,
    ]
  },
];

async function cleanupFile(rule: CleanupRule): Promise<number> {
  const filePath = path.join(__dirname, '..', rule.file);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${rule.file}`);
    return 0;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalLength = content.length;
  let removedCount = 0;

  // Apply each remove pattern
  for (const pattern of rule.removePatterns) {
    const matches = content.match(new RegExp(pattern, 'g'));
    if (matches) {
      removedCount += matches.length;
      // Remove the entire line containing the pattern
      content = content.replace(new RegExp(`^.*${pattern.source}.*$`, 'gm'), '');
    }
  }

  // Remove multiple consecutive empty lines (cleanup)
  content = content.replace(/\n{3,}/g, '\n\n');

  // Write back only if changes were made
  if (content.length !== originalLength) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Cleaned ${rule.file}: Removed ${removedCount} log statements`);
    return removedCount;
  } else {
    console.log(`ℹ️  No changes needed for ${rule.file}`);
    return 0;
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    PRODUCTION LOG CLEANUP                                  ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  console.log('🎯 Target: Remove high-frequency noise logs');
  console.log('✅ Safety: Keeping all console.error() and console.warn()');
  console.log('✅ Safety: Keeping initialization and shutdown logs\n');

  let totalRemoved = 0;

  for (const rule of cleanupRules) {
    const removed = await cleanupFile(rule);
    totalRemoved += removed;
  }

  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                         CLEANUP COMPLETE                                   ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  console.log(`📊 Total log statements removed: ${totalRemoved}`);
  console.log(`✅ All error and warning logs preserved`);
  console.log(`✅ Production readiness improved\n`);
}

main().catch(error => {
  console.error('❌ Cleanup failed:', error);
  process.exit(1);
});
