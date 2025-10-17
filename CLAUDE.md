# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chief AI is an AI-powered executive assistant that autonomously manages email and calendar for busy professionals. The system reads incoming emails, drafts contextually appropriate responses matching the user's tone, handles meeting scheduling with calendar integration, and requires user approval before sending anything.

**Current Status:** Production-ready MVP with email ingestion, AI-powered draft generation, calendar integration, and meeting pipeline functionality.

## Development Commands

```bash
# Development
npm run dev                    # Start development server with tsx hot-reload
npm run build                  # Compile TypeScript to dist/
npm start                      # Run compiled production build

# Database Operations
npm run db:migrate             # Run database migrations
npm run db:introspect          # Introspect existing database schema
npm run db:generate            # Generate Drizzle migrations
npm run db:push                # Push schema changes to database
npm run db:studio              # Open Drizzle Studio for database GUI

# Testing
npm test                       # Run Jest test suite
npm run test:24-7              # Run all integration tests
npm run test:core              # Test 24/7 system functionality
npm run test:webhooks          # Test webhook scenarios
npm run test:api               # Test user experience flows

# Database Management Scripts
npx tsx scripts/database/apply-indexes.ts              # Apply Phase 1 critical indexes
npx tsx scripts/database/verify-no-damage.ts           # Verify database integrity
npx tsx scripts/database/test-index-performance.ts     # Test query performance with EXPLAIN ANALYZE
```

## Architecture

### Structured Logging with Pino (NEW)

**Location:** `src/utils/pino-logger.ts`

The codebase uses **Pino** for high-performance structured logging optimized for production deployment on Railway.

**Key Features:**
- JSON output in production (parseable, searchable)
- Pretty-printed colored output in development
- Automatic sensitive data redaction (tokens, passwords)
- User ID sanitization for privacy
- Zero performance overhead (~5x faster than console.log)

**Usage Examples:**

```typescript
import { logger, sanitizeUserId } from '../utils/pino-logger';

// Info logs (business events)
logger.info({
  userId: sanitizeUserId(userId),
  emailCount: emails.length,
  duration: 1234
}, 'gmail.emails.fetched');

// Error logs (with full context)
logger.error({
  userId: sanitizeUserId(userId),
  emailId,
  error: error instanceof Error ? error.message : String(error)
}, 'gmail.email.fetch.failed');

// Debug logs (verbose, dev only by default)
logger.debug({ operation: 'testOp' }, 'router.email.processing');

// Warn logs (degraded performance, retries)
logger.warn({ attempt: 2, maxRetries: 3 }, 'db.query.retry');
```

**Log Naming Convention:** Use dot-notation format `service.resource.action`
- `gmail.emails.fetched` - Gmail service fetched emails
- `meeting.request.detected` - Meeting pipeline detected request
- `router.decision.made` - Router made routing decision
- `auth.jwt.expired` - Auth middleware detected expired JWT

**Environment Configuration:**
- `LOG_LEVEL=debug` - Show all logs (development default)
- `LOG_LEVEL=info` - Show info, warn, error (production default)
- `LOG_LEVEL=error` - Show only errors (production quiet mode)

**Production Output (Railway logs):**
```json
{"level":30,"timestamp":"2025-10-17T01:31:19.299Z","userId":"user_abc123","emailCount":42,"duration":1234,"msg":"gmail.emails.fetched"}
```

**Development Output:**
```
[01:31:04.660] INFO: gmail.emails.fetched
    userId: "user_abc123"
    emailCount: 42
    duration: 1234
```

### Service Factory Pattern (CRITICAL)

**Location:** `src/utils/serviceFactory.ts`

The codebase uses **request-scoped dependency injection** to prevent race conditions in multi-user scenarios. Never use global singleton service instances.

```typescript
// ❌ WRONG - Global singleton (causes data leakage)
const gmailService = new GmailService();

// ✅ CORRECT - Request-scoped via ServiceFactory
app.get('/emails', authMiddleware.authenticate, async (req, res) => {
  const services = ServiceFactory.createFromRequest(req);  // Creates isolated container
  const gmail = await services.getGmailService();         // User-specific instance
  const emails = await gmail.fetchEmails();
  res.json({ emails });
});
```

**Why:** Services like GmailService and CalendarService maintain mutable state (currentUserId, userTimezone). Concurrent requests from different users would overwrite each other's state, causing User A to see User B's emails.

**Available Service Methods:**
- `getGmailService()` - Gmail API integration (requires initialization)
- `getCalendarService()` - Google Calendar API (requires initialization)
- `getAIService()` - OpenAI/Anthropic integration (stateless)
- `getResponseService()` - AI draft generation
- `getLearningService()` - Writing style learning
- `getMeetingDetectionService()` - Email → meeting detection
- `getMeetingPipelineService()` - End-to-end meeting workflow
- Model getters: `getEmailModel()`, `getDraftModel()`, `getContextModel()`, etc.

### Database Connection (Neon Serverless)

**Location:** `src/database/connection.ts`

The connection pool is optimized for Neon's serverless PostgreSQL:
- `max: 100` connections (supports 100 concurrent users)
- `min: 0` warm connections (Neon closes idle connections aggressively)
- `idleTimeoutMillis: 10000` (10s) - releases idle connections fast
- `keepAlive: true` with 5s initial delay - prevents connection drops

**CRITICAL:** Use `queryWithRetry()` for all database queries to handle Neon's connection drops:

```typescript
import { queryWithRetry } from '../database/connection';

// ✅ CORRECT - Auto-retries on connection errors
const result = await queryWithRetry('SELECT * FROM emails WHERE user_id = $1', [userId]);

// ❌ WRONG - Will crash on Neon connection drop
const result = await pool.query('SELECT * FROM emails WHERE user_id = $1', [userId]);
```

### Core Services

**Gmail Integration** (`src/services/gmail.ts`):
- OAuth2 authentication with token refresh
- Real-time webhook processing (Gmail Push API)
- Email fetching with pagination
- Thread-aware email parsing
- Requires `initializeForUser(userId)` before use

**AI Services** (`src/services/ai.ts`, `src/services/response.ts`, `src/services/learning.ts`):
- OpenAI/Anthropic integration for draft generation
- Context-aware response generation using user's writing style
- Learning system analyzes sent emails and user edits
- Feedback loop improves draft quality over time

**Calendar Services** (`src/services/calendar.ts`, `src/services/meetingPipeline.ts`):
- Google Calendar API integration
- Smart availability detection
- Meeting request detection from emails
- Automated scheduling with conflict resolution
- Timezone-aware scheduling

**Webhook System** (`src/services/webhookRenewal.ts`, `src/services/intelligentEmailRouter.ts`):
- Gmail Push API notifications for real-time email processing
- Automatic webhook renewal (7-day expiry)
- Redis-based deduplication (requires Redis in production)
- Intelligent email routing based on content classification

### Data Models

All models are in `src/models/` and provide database access patterns:
- `EmailModel` - Email CRUD with webhook processing status
- `DraftModel` - Draft storage and retrieval
- `AutoGeneratedDraftModel` - AI-generated drafts awaiting approval
- `ContextModel` - Thread context and conversation history
- `CalendarModel` - Calendar events and availability
- `PromotionalEmailModel` - Promotional email filtering

**Pattern:** Models encapsulate SQL queries and provide typed interfaces. Use models through ServiceFactory for proper request scoping.

### Authentication & Security

**Authentication Middleware** (`src/middleware/auth.ts`):
- JWT-based authentication
- `authMiddleware.authenticate` - Validates token and sets `req.userId`
- All authenticated routes MUST use this middleware

**Security Middleware** (`src/middleware/security.ts`):
- Rate limiting (auth endpoints: 5 req/min, API: 100 req/min)
- Security headers (helmet-style)
- Request logging with sanitization
- Graceful shutdown handling

### Database Schema & Migrations

**Schema Location:** `scripts/database/complete_working_schema.sql` (39 tables)

**Recent Critical Migrations:**
1. `add_timezone_support.sql` - User timezone tracking
2. `add_all_missing_constraints.sql` - Foreign key constraints
3. `add_performance_indexes.sql` - Performance optimization (5 critical indexes)

**Performance Indexes Deployed (2025-10-16):**
- `idx_emails_user_webhook` - Webhook processing (500ms → 5ms)
- `idx_auto_drafts_user_status_time` - Draft dashboard (300ms → 3ms)
- `idx_generated_responses_user_learning` - Learning system (200ms → 10ms)
- `idx_edit_analyses_user_time_type` - Edit analysis (150ms → 8ms)
- `idx_meeting_processing_email_user` - Meeting pipeline (100ms → 2ms)

**Adding New Migrations:**
1. Create SQL file in `scripts/database/`
2. Use `CREATE INDEX CONCURRENTLY IF NOT EXISTS` for indexes (zero downtime)
3. Test locally with `npx tsx scripts/database/verify-no-damage.ts`
4. Apply to production with `npx tsx scripts/database/apply-indexes.ts`

### Redis Integration (Optional in Dev)

**Location:** `src/utils/redis.ts`

Redis is used for webhook deduplication and distributed locking. The implementation **gracefully degrades** when Redis is unavailable:

```typescript
const lockAcquired = await redis.acquireLock(key, ttlSeconds);
// Returns true if Redis unavailable (fail-open for development)
// In production, must have Redis (AWS ElastiCache)
```

**Production Requirement:** Redis is required for multi-instance deployments to prevent duplicate webhook processing.

### Environment Variables

Required variables (see `.env.example`):
```
DATABASE_URL=postgresql://...              # Neon PostgreSQL connection
GOOGLE_CLIENT_ID=...                      # OAuth2 credentials
GOOGLE_CLIENT_SECRET=...
OPENAI_API_KEY=...                        # AI service (or ANTHROPIC_API_KEY)
JWT_SECRET=...                            # Authentication
TOKEN_ENCRYPTION_KEY=...                  # Token encryption
FRONTEND_URL=https://cap-ai-puce.vercel.app
NODE_ENV=production
PORT=3000
```

Optional for production:
```
REDIS_URL=redis://...                     # Webhook deduplication
WEBHOOK_SECRET=...                        # Gmail webhook verification
```

## Critical Patterns & Conventions

### 1. Always Use ServiceFactory for Route Handlers

```typescript
app.get('/api/emails', authMiddleware.authenticate, async (req, res) => {
  const services = ServiceFactory.createFromRequest(req);
  const gmail = await services.getGmailService();
  const emailModel = services.getEmailModel();

  const emails = await emailModel.getEmailsByUserId(req.userId);
  res.json({ emails });
});
```

### 2. Database Queries Must Use queryWithRetry

```typescript
import { queryWithRetry } from '../database/connection';

// Handles Neon connection drops with automatic retry
const result = await queryWithRetry(
  'SELECT * FROM emails WHERE user_id = $1 AND webhook_processed = $2',
  [userId, false]
);
```

### 3. Services Require Initialization

```typescript
const services = ServiceFactory.createFromRequest(req);

// Gmail and Calendar require user initialization
const gmail = await services.getGmailService();  // Already initialized by factory
const calendar = await services.getCalendarService();  // Already initialized

// AI services are stateless - no initialization needed
const ai = services.getAIService();
```

### 4. Webhook Processing Pattern

```typescript
// Webhook handlers run outside request context
async function processWebhookNotification(notification) {
  // Acquire lock for deduplication
  const lockKey = `webhook:gmail:${notification.historyId}`;
  const lockAcquired = await redis.acquireLock(lockKey, 300);

  if (!lockAcquired) {
    console.log('Duplicate webhook - skipping');
    return;
  }

  try {
    // Process notification
    await processGmailNotificationMultiUser(notification);
  } finally {
    await redis.releaseLock(lockKey);
  }
}
```

### 5. Error Handling Best Practices

```typescript
try {
  // Operation
} catch (error: any) {
  console.error('❌ Operation failed:', {
    message: error.message,
    code: error.code,
    userId: req.userId,
    timestamp: new Date().toISOString()
  });

  // Return user-friendly error
  res.status(500).json({
    error: 'Operation failed',
    message: 'Please try again later'
  });
}
```

## Testing & Verification

### Database Integrity Checks

```bash
# Verify database is intact after migrations
npx tsx scripts/database/verify-no-damage.ts

# Output shows:
# - All tables exist (49 tables)
# - Row counts for data integrity
# - Index verification
# - Critical query tests
```

### Performance Testing

```bash
# Test actual production queries with EXPLAIN ANALYZE
npx tsx scripts/database/test-index-performance.ts

# Shows:
# - Query execution times
# - Index usage confirmation
# - Sequential scan warnings
# - Performance comparisons
```

### Integration Testing

```bash
# Test entire 24/7 system
npm run test:24-7

# Test specific components
npm run test:webhooks    # Webhook processing
npm run test:api         # User-facing API
npm run test:core        # Core business logic
```

## Deployment

**Current Stack:**
- Backend: Railway
- Database: Neon PostgreSQL (serverless)
- Frontend: Vercel (https://cap-ai-puce.vercel.app)

**Pre-Launch Checklist:**
1. ✅ ServiceFactory implemented (prevents race conditions)
2. ✅ Database indexes optimized (5 critical paths)
3. ✅ Connection pooling configured for Neon
4. ✅ Error handling and logging in place
5. ✅ Authentication and rate limiting enabled
6. ⚠️ Redis required for production (webhook deduplication)
7. ⚠️ Webhook renewal cron job needed (7-day expiry)

**Future AWS Migration:**
- RDS PostgreSQL (migrate from Neon)
- ElastiCache Redis (required for multi-instance)
- ECS/EC2 for backend (migrate from Railway)
- Indexes will migrate automatically with data

## Common Pitfalls

1. **Never create global service instances** - Always use ServiceFactory
2. **Don't use pool.query directly** - Use queryWithRetry for Neon reliability
3. **Initialize Gmail/Calendar services** - Call initializeForUser before use
4. **Handle Redis gracefully** - Code must work when Redis is unavailable (dev mode)
5. **Use IF NOT EXISTS for indexes** - Prevents deployment errors
6. **Apply indexes with CONCURRENTLY** - Prevents table locks in production
7. **Validate JWT tokens** - All authenticated routes need authMiddleware
8. **Check webhook_processed flag** - Prevents duplicate email processing
