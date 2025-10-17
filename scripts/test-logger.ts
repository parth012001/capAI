/**
 * Test script to verify Pino logger is working correctly
 */

import { logger, sanitizeUserId } from '../src/utils/pino-logger';

console.log('='.repeat(80));
console.log('TESTING PINO STRUCTURED LOGGING');
console.log('='.repeat(80));
console.log('');

// Test different log levels
logger.info({ test: 'value', number: 123 }, 'test.info.message');
logger.debug({ userId: sanitizeUserId('user_1234567890abcdef'), operation: 'testOp' }, 'test.debug.message');
logger.warn({ reason: 'test_warning', count: 5 }, 'test.warn.message');
logger.error({ error: 'Test error message', code: 'TEST_ERROR' }, 'test.error.message');

// Test Gmail-style log
logger.info({
  userId: sanitizeUserId('user_abc123'),
  emailCount: 42,
  duration: 1234
}, 'gmail.emails.fetched');

// Test Meeting Pipeline-style log
logger.info({
  userId: sanitizeUserId('user_xyz789'),
  meetingRequestId: 999,
  meetingType: 'urgent',
  confidence: 95
}, 'meeting.request.detected');

// Test Router-style log
logger.info({
  userId: sanitizeUserId('user_test'),
  emailId: 'msg_12345',
  route: 'meeting',
  confidence: 87
}, 'router.decision.made');

console.log('');
console.log('='.repeat(80));
console.log('✅ Logger test complete - check output above');
console.log('='.repeat(80));
