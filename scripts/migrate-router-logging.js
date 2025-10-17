const fs = require('fs');
const path = require('path');

const ROUTER_FILE = path.join(__dirname, '../src/services/intelligentEmailRouter.ts');

function migrateRouterService() {
  let content = fs.readFileSync(ROUTER_FILE, 'utf8');

  // Replace router logs with structured versions
  content = content.replace(
    /console\.log\(`🧠 \[INTELLIGENT ROUTER\] Processing email: "\$\{email\.subject\}" from \$\{email\.from\}`\);/g,
    `logger.debug({ userId: sanitizeUserId(userId), emailId: email.id, from: email.from, subject: email.subject }, 'router.email.processing');`
  );

  content = content.replace(
    /console\.log\(`🔍 \[ROUTER\] Classification: \$\{classification\.isMeeting \? 'MEETING' : 'REGULAR'\} \(\$\{classification\.confidence\}% confidence\)`\);/g,
    `logger.info({ userId: sanitizeUserId(userId), isMeeting: classification.isMeeting, confidence: classification.confidence }, 'router.email.classified');`
  );

  content = content.replace(
    /console\.log\(`💭 \[ROUTER\] Reasoning: \$\{classification\.reasoning\}`\);/g,
    ``  // Remove - too verbose
  );

  content = content.replace(
    /console\.log\(`🎯 \[ROUTER\] Route Decision: \$\{routingDecision\.route\.toUpperCase\(\)\}`\);/g,
    `logger.info({ userId: sanitizeUserId(userId), route: routingDecision.route, confidence: routingDecision.confidence }, 'router.decision.made');`
  );

  // Meeting pipeline logs
  content = content.replace(
    /console\.log\(`📅 \[ROUTER\] Routing to MEETING PIPELINE\.\.\.\`\);/g,
    ``  // Remove - redundant
  );

  content = content.replace(
    /console\.log\(`📅 \[ROUTER → MEETING\] Processing meeting request\.\.\.\`\);/g,
    ``  // Remove - redundant
  );

  content = content.replace(
    /console\.log\(`✅ \[ROUTER → MEETING\] Meeting processing complete: \$\{meetingResult\.status\}`\);/g,
    ``  // Remove - handled by meeting pipeline
  );

  content = content.replace(
    /console\.log\(`📋 \[ROUTER → MEETING\] Meeting detected: \$\{meetingResult\.meetingRequest\?\.meetingType\}`\);/g,
    ``  // Remove - handled by meeting pipeline
  );

  content = content.replace(
    /if \(meetingResult\.response\) \{\s+console\.log\(`🤖 \[ROUTER → MEETING\] Response generated: \$\{meetingResult\.response\.actionTaken\}`\);\s+\}/g,
    ``  // Remove - handled by meeting pipeline
  );

  // Auto-draft pipeline logs
  content = content.replace(
    /console\.log\(`📝 \[ROUTER\] Routing to AUTO-DRAFT PIPELINE\.\.\.\`\);/g,
    ``  // Remove - redundant
  );

  content = content.replace(
    /console\.log\(`📝 \[ROUTER → AUTODRAFT\] Generating auto-draft response\.\.\.\`\);/g,
    ``  // Remove - redundant
  );

  content = content.replace(
    /console\.log\(`✅ \[ROUTER → AUTODRAFT\] Auto-draft created with ID \$\{autoDraftId\}`\);/g,
    `logger.info({ userId: sanitizeUserId(userId), draftId: autoDraftId.toString() }, 'router.autodraft.created');`
  );

  content = content.replace(
    /console\.log\(`📝 \[ROUTER → AUTODRAFT\] Subject: "\$\{smartResponse\.subject\}"`\);/g,
    ``  // Remove - too verbose
  );

  content = content.replace(
    /console\.log\(`🎯 \[ROUTER → AUTODRAFT\] Tone: \$\{smartResponse\.tone\}, Urgency: \$\{smartResponse\.urgencyLevel\}`\);/g,
    ``  // Remove - too verbose
  );

  // Skip logs
  content = content.replace(
    /console\.log\(`⏭️ \[ROUTER\] SKIPPING email processing`\);/g,
    `logger.debug({ userId: sanitizeUserId(userId), emailId: email.id, reason: result.reason }, 'router.email.skipped');`
  );

  // Completion log
  content = content.replace(
    /console\.log\(`✅ \[ROUTER\] Processing complete in \$\{result\.totalProcessingTime\}ms`\);/g,
    `logger.info({ userId: sanitizeUserId(userId), emailId: email.id, duration: result.totalProcessingTime, route: result.routingDecision.route }, 'router.email.processed');`
  );

  // Error logs
  content = content.replace(
    /console\.error\(`❌ \[ROUTER\] Error processing email \$\{email\.id\}:`, error\);/g,
    `logger.error({ userId: sanitizeUserId(userId), emailId: email.id, error: error instanceof Error ? error.message : String(error) }, 'router.email.failed');`
  );

  content = content.replace(
    /console\.error\(`❌ \[ROUTER → MEETING\] Meeting pipeline error:`, error\);/g,
    `logger.error({ userId: sanitizeUserId(userId), emailId: email.id, error: error instanceof Error ? error.message : String(error) }, 'router.meeting.failed');`
  );

  content = content.replace(
    /console\.error\(`❌ \[ROUTER → AUTODRAFT\] Auto-draft pipeline error:`, error\);/g,
    `logger.error({ userId: sanitizeUserId(userId), error: error instanceof Error ? error.message : String(error) }, 'router.autodraft.failed');`
  );

  // Batch processing logs
  content = content.replace(
    /console\.log\(`🧠 \[ROUTER\] Processing \$\{emails\.length\} emails intelligently\.\.\.\`\);/g,
    `logger.info({ emailCount: emails.length, userId: sanitizeUserId(userId) }, 'router.batch.started');`
  );

  content = content.replace(
    /console\.log\(`📊 \[ROUTER\] Batch processing complete:`\);/g,
    ``  // Remove - summary below covers it
  );

  content = content.replace(
    /console\.log\(`   📅 Meeting pipeline: \$\{meetingCount\} emails`\);\s+console\.log\(`   📝 Auto-draft pipeline: \$\{autoDraftCount\} emails`\);\s+console\.log\(`   ⏭️ Skipped: \$\{skippedCount\} emails`\);/g,
    `logger.info({ userId: sanitizeUserId(userId), totalEmails: emails.length, meetingCount, autoDraftCount, skippedCount }, 'router.batch.completed');`
  );

  fs.writeFileSync(ROUTER_FILE, content, 'utf8');
  console.log('✅ Router service migration complete');
}

migrateRouterService();
