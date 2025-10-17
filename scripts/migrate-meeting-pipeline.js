const fs = require('fs');
const path = require('path');

const MEETING_FILE = path.join(__dirname, '../src/services/meetingPipeline.ts');

function migrateMeetingPipeline() {
  let content = fs.readFileSync(MEETING_FILE, 'utf8');

  // Remove high-frequency noise logs
  const noiseLogs = [
    /console\.log\(`🔍 \[MEETING PIPELINE\] Processing email \$\{email\.id\} for meetings\.\.\.`\);?\n?/g,
    /console\.log\(`✅ \[MEETING PIPELINE - LOOP PREVENTION DISABLED\] Processing email: \$\{email\.subject\}`\);?\n?/g,
    /console\.log\(`🌍 \[MEETING PIPELINE\] User timezone fetched from DB: \$\{userTimezone\}`\);?\n?/g,
    /console\.log\(`⚠️ \[MEETING PIPELINE\] No timezone in DB for user, will use default`\);?\n?/g,
    /console\.log\(`📧 \[MEETING PIPELINE\] No meeting request detected`\);?\n?/g,
    /console\.log\(`🔄 \[MEETING PIPELINE FALLBACK\] Email has meeting keywords but is not a request`\);?\n?/g,
    /console\.log\(`🔄 \[MEETING PIPELINE FALLBACK\] Generating regular auto-draft as fallback\.\.\.`\);?\n?/g,
    /console\.log\(`✅ \[MEETING PIPELINE FALLBACK\] Regular auto-draft created successfully`\);?\n?/g,
    /console\.log\(`📊 \[MEETING PIPELINE\] All database operations completed atomically`\);?\n?/g,
    /console\.log\(`🔍 \[MEETING PIPELINE\] Processing \$\{emails\.length\} emails for meetings\.\.\.`\);?\n?/g,
    /console\.log\('📊 \[TRANSACTION\] Started database transaction'\);?\n?/g,
    /console\.log\('✅ \[TRANSACTION\] Database transaction committed successfully'\);?\n?/g,
    /console\.log\('🔄 \[TRANSACTION\] Database transaction rolled back due to error'\);?\n?/g,
  ];

  noiseLogs.forEach(pattern => {
    content = content.replace(pattern, '');
  });

  // Keep important structured logs
  content = content.replace(
    /console\.log\(`✅ \[MEETING PIPELINE\] Meeting request detected and saved: \$\{meetingRequest\.meetingType\} \(ID: \$\{meetingRequestId\}\)`\);/g,
    `logger.info({ userId: sanitizeUserId(userId), meetingRequestId, meetingType: meetingRequest.meetingType, confidence: meetingRequest.detectionConfidence }, 'meeting.request.detected');`
  );

  content = content.replace(
    /console\.log\(`📝 \[MEETING PIPELINE\] About to save meeting response draft with meeting request:`, \{[\s\S]*?\}\);/g,
    ``  // Remove verbose debug log
  );

  content = content.replace(
    /console\.log\(`📝 \[MEETING PIPELINE\] Response saved as draft: \$\{response\.actionTaken\}`\);/g,
    `logger.info({ userId: sanitizeUserId(userId), actionTaken: response.actionTaken }, 'meeting.response.saved');`
  );

  content = content.replace(
    /console\.log\(`📝 \[MEETING PIPELINE\] Not saving draft - shouldRespond: \$\{response\.shouldRespond\}, hasResponseText: \$\{!!response\.responseText\}`\);/g,
    `logger.debug({ shouldRespond: response.shouldRespond, hasResponseText: !!response.responseText }, 'meeting.response.skipped');`
  );

  content = content.replace(
    /console\.warn\('⚠️ \[MEETING PIPELINE\] Failed to generate\/save response:', responseError\);/g,
    `logger.warn({ error: responseError instanceof Error ? responseError.message : String(responseError) }, 'meeting.response.generation.failed');`
  );

  content = content.replace(
    /console\.error\('❌ \[MEETING PIPELINE FALLBACK\] Failed to create fallback draft:', fallbackError\);/g,
    `logger.error({ error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError) }, 'meeting.fallback.draft.failed');`
  );

  content = content.replace(
    /console\.log\('⚠️ \[MEETING PIPELINE FALLBACK\] ResponseService not available, skipping fallback draft'\);/g,
    `logger.debug({}, 'meeting.fallback.service.unavailable');`
  );

  content = content.replace(
    /console\.log\(`⏭️ Email \$\{email\.id\} already processed for meetings`\);/g,
    `logger.debug({ emailId: email.id }, 'meeting.email.already_processed');`
  );

  // Main error handler
  content = content.replace(
    /console\.error\(`❌ \[MEETING PIPELINE\] Error processing email \$\{email\.id\}:`, error\);/g,
    `logger.error({ userId: sanitizeUserId(userId), emailId: email.id, error: error instanceof Error ? error.message : String(error) }, 'meeting.processing.failed');`
  );

  // Batch processing complete
  content = content.replace(
    /console\.log\(`📋 \[MEETING PIPELINE\] Batch processing complete: \$\{meetingEmails\.length\}\/\$\{emails\.length\} meeting requests found`\);/g,
    `logger.info({ totalEmails: emails.length, meetingsFound: meetingEmails.length }, 'meeting.batch.completed');`
  );

  // Database errors
  content = content.replace(
    /console\.error\('❌ \[MEETING PIPELINE\] Error fetching meeting requests:', error\);/g,
    `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'meeting.requests.fetch.failed');`
  );

  content = content.replace(
    /console\.error\('❌ \[MEETING PIPELINE\] Error fetching meeting stats:', error\);/g,
    `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'meeting.stats.fetch.failed');`
  );

  content = content.replace(
    /console\.error\('❌ Error getting email DB ID:', error\);/g,
    `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'meeting.email.db_id.failed');`
  );

  content = content.replace(
    /console\.error\('❌ Error checking processing status:', error\);/g,
    `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'meeting.processing.status.failed');`
  );

  content = content.replace(
    /console\.error\('❌ Error saving meeting request:', error\);/g,
    `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'meeting.request.save.failed');`
  );

  content = content.replace(
    /console\.error\('❌ Error storing pipeline result:', error\);/g,
    ``  // Remove - not critical
  );

  content = content.replace(
    /console\.error\('Failed to store error result:', storeError\);/g,
    ``  // Remove - not critical
  );

  // Meeting response draft logs
  content = content.replace(
    /console\.log\(`📝 \[MEETING PIPELINE\] Saving meeting response draft for meeting request:`, \{[\s\S]*?\}\);/g,
    ``  // Remove verbose debug
  );

  content = content.replace(
    /console\.log\(`📝 \[MEETING PIPELINE\] Saving draft with context:`, JSON\.stringify\(contextUsed, null, 2\)\);/g,
    ``  // Remove verbose debug
  );

  content = content.replace(
    /console\.log\(`✅ Meeting response saved as auto-generated draft with ID: \$\{draftId\}`\);/g,
    `logger.info({ draftId }, 'meeting.draft.created');`
  );

  content = content.replace(
    /console\.log\(`📝 Draft status: waiting for user approval`\);/g,
    ``  // Remove - redundant
  );

  content = content.replace(
    /console\.error\('❌ Failed to save meeting response as draft:', error\);/g,
    `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'meeting.draft.save.failed');`
  );

  // Tagged meeting draft logs
  content = content.replace(
    /console\.log\(`📝 \[MEETING PIPELINE\] Creating tagged meeting draft for approval\.\.\.`\);/g,
    ``  // Remove - redundant
  );

  content = content.replace(
    /console\.log\(`✅ \[MEETING PIPELINE\] Meeting draft saved - ID: \$\{draftId\}`\);/g,
    `logger.info({ draftId, userId: sanitizeUserId(userId) }, 'meeting.draft.saved');`
  );

  content = content.replace(
    /console\.log\(`🎯 \[MEETING PIPELINE\] Action: \$\{response\.actionTaken\}, Status: pending \(awaiting user approval\)`\);/g,
    ``  // Remove - redundant
  );

  content = content.replace(
    /console\.error\('❌ \[MEETING PIPELINE\] Error creating tagged meeting draft:', error\);/g,
    `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'meeting.draft.create.failed');`
  );

  // Transaction errors
  content = content.replace(
    /console\.log\('🔄 \[TRANSACTION\] Database transaction rolled back due to error'\);/g,
    `logger.warn({ reason: 'error' }, 'meeting.transaction.rollback');`
  );

  content = content.replace(
    /console\.error\('❌ \[TRANSACTION\] Error during rollback:', rollbackError\);/g,
    `logger.error({ error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError) }, 'meeting.transaction.rollback.failed');`
  );

  content = content.replace(
    /console\.error\('❌ \[TRANSACTION\] Transaction failed:', error\);/g,
    `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'meeting.transaction.failed');`
  );

  // Timezone errors
  content = content.replace(
    /console\.error\(`❌ \[MEETING PIPELINE\] Error fetching user timezone:`, error\);/g,
    `logger.error({ userId: sanitizeUserId(userId), error: error instanceof Error ? error.message : String(error) }, 'meeting.timezone.fetch.failed');`
  );

  fs.writeFileSync(MEETING_FILE, content, 'utf8');
  console.log('✅ Meeting Pipeline migration complete');
}

migrateMeetingPipeline();
