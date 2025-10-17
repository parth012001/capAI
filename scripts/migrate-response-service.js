const fs = require('fs');
const path = require('path');

const RESPONSE_FILE = path.join(__dirname, '../src/services/response.ts');

function migrateResponseService() {
  let content = fs.readFileSync(RESPONSE_FILE, 'utf8');

  // Add logger import after existing imports
  if (!content.includes("from '../utils/pino-logger'")) {
    const lastImport = content.lastIndexOf("import ");
    const endOfLastImport = content.indexOf(';', lastImport);
    content = content.substring(0, endOfLastImport + 1) + 
              "\nimport { logger, sanitizeUserId } from '../utils/pino-logger';" +
              content.substring(endOfLastImport + 1);
    console.log('✓ Added logger import');
  }

  // Remove high-frequency noise logs
  const noiseLogs = [
    /console\.log\(`🤖 Generating smart response for email \$\{request\.emailId\}\.\.\.`\);?\n?/g,
    /console\.log\(`👤 User profile loaded: \$\{userProfile\.firstName\} \$\{userProfile\.lastName\}`\);?\n?/g,
    /console\.log\(`✅ Smart response generated with \$\{response\.contextUsed\.length\} context elements`\);?\n?/g,
    /console\.log\(`🎯 Starting just-in-time context gathering for \$\{request\.recipientEmail\}\.\.\.`\);?\n?/g,
    /console\.log\(`📋 Context strategy: \$\{strategy\.strategy\} \(~\$\{strategy\.processingTime\}s expected\)`\);?\n?/g,
    /console\.log\(`✅ Just-in-time context gathering completed`\);?\n?/g,
    /console\.log\(`  - Strategy: \$\{strategy\.strategy\}`\);?\n?/g,
    /console\.log\(`  - Sources: \$\{gatheredContext\.sources\.join\(', '\)\}`\);?\n?/g,
    /console\.log\(`  - Confidence: \$\{gatheredContext\.confidence\}%`\);?\n?/g,
    /console\.log\('🎯 Using professional prompt engineering system\.\.\.'\);?\n?/g,
    /console\.log\(`🧠 Getting learning patterns from Phase 2\.4 LearningService for user \$\{request\.userId \? request\.userId\.substring\(0, 8\) \+ '\.\.\.' : 'anonymous'\}\.\.\.`\);?\n?/g,
    /console\.log\(`✍️ User signature added: \$\{contextData\.userSignature\}`\);?\n?/g,
    /console\.log\('🎯 Applying', learningPatterns\.length, 'learning patterns behaviorally'\);?\n?/g,
    /console\.log\('📝 Prompt context built:', \{ relationshipType, urgencyLevel, contextSources: contextUsed \}\);?\n?/g,
    /console\.log\('📊 Response quality score:', qualityScore\.overall\.toFixed\(1\), '%'\);?\n?/g,
    /console\.log\('💡 Quality recommendations:', qualityScore\.recommendations\);?\n?/g,
    /console\.log\('🔍 Parsing AI response as JSON\.\.\.'\);?\n?/g,
  ];

  noiseLogs.forEach(pattern => {
    content = content.replace(pattern, '');
  });

  // Replace errors with structured logs
  content = content.replace(
    /console\.error\('❌ Error generating smart response:', error\);/g,
    `logger.error({ 
      emailId: request.emailId, 
      userId: request.userId ? sanitizeUserId(request.userId) : undefined,
      error: error instanceof Error ? error.message : String(error) 
    }, 'response.generation.failed');`
  );

  content = content.replace(
    /console\.error\('❌ Error in just-in-time context gathering:', error\);/g,
    `logger.error({ 
      recipientEmail: request.recipientEmail,
      error: error instanceof Error ? error.message : String(error) 
    }, 'response.context.gathering.failed');`
  );

  content = content.replace(
    /console\.warn\('⚠️ Response validation failed:', validationResult\.reason\);/g,
    `logger.warn({ reason: validationResult.reason }, 'response.validation.failed');`
  );

  content = content.replace(
    /console\.error\('❌ Failed to parse AI response as JSON:', error\);/g,
    `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'response.parse.failed');`
  );

  content = content.replace(
    /console\.error\('❌ Error in buildPromptWithContext:', error\);/g,
    `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'response.prompt.build.failed');`
  );

  content = content.replace(
    /console\.error\('❌ Error getting learning patterns:', error\);/g,
    `logger.error({ 
      userId: request.userId ? sanitizeUserId(request.userId) : undefined,
      error: error instanceof Error ? error.message : String(error) 
    }, 'response.learning.patterns.failed');`
  );

  content = content.replace(
    /console\.error\('❌ Error getting user signature:', error\);/g,
    `logger.error({ 
      userId: request.userId ? sanitizeUserId(request.userId) : undefined,
      error: error instanceof Error ? error.message : String(error) 
    }, 'response.signature.fetch.failed');`
  );

  content = content.replace(
    /console\.error\('❌ Error calling AI service:', error\);/g,
    `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'response.ai.call.failed');`
  );

  content = content.replace(
    /console\.error\('❌ Error parsing OpenAI response:', error\);/g,
    `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'response.openai.parse.failed');`
  );

  content = content.replace(
    /console\.error\('❌ Error parsing Anthropic response:', error\);/g,
    `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'response.anthropic.parse.failed');`
  );

  content = content.replace(
    /console\.error\('❌ Error determining context strategy:', error\);/g,
    `logger.error({ error: error instanceof Error ? error.message : String(error) }, 'response.context.strategy.failed');`
  );

  content = content.replace(
    /console\.error\('❌ Error checking recent email activity:', error\);/g,
    `logger.error({ 
      recipientEmail: senderEmail,
      error: error instanceof Error ? error.message : String(error) 
    }, 'response.email.activity.check.failed');`
  );

  content = content.replace(
    /console\.error\('❌ Error building thread context:', error\);/g,
    `logger.error({ 
      threadId,
      error: error instanceof Error ? error.message : String(error) 
    }, 'response.thread.context.failed');`
  );

  content = content.replace(
    /console\.error\('❌ Error building sender history context:', error\);/g,
    `logger.error({ 
      recipientEmail,
      error: error instanceof Error ? error.message : String(error) 
    }, 'response.sender.history.failed');`
  );

  content = content.replace(
    /console\.error\('❌ Error checking timezone:', error\);/g,
    `logger.error({ 
      userId: request.userId ? sanitizeUserId(request.userId) : undefined,
      error: error instanceof Error ? error.message : String(error) 
    }, 'response.timezone.check.failed');`
  );

  // Add structured success log for response generation
  content = content.replace(
    /(const response = \{[\s\S]*?contextUsed: contextUsed[\s\S]*?\};)/,
    `$1

      logger.info({
        emailId: request.emailId,
        userId: request.userId ? sanitizeUserId(request.userId) : undefined,
        contextElements: contextUsed.length,
        tone: determinedTone,
        urgency: determinedUrgency
      }, 'response.generated');`
  );

  fs.writeFileSync(RESPONSE_FILE, content, 'utf8');
  console.log('✅ Response Service migration complete');
}

try {
  migrateResponseService();
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}
