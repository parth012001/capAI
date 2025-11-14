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

# Webhook Management (Development)
./scripts/update-webhooks.sh dev <ngrok-url>           # Update dev webhook to new ngrok URL
./scripts/update-webhooks.sh status                    # Check current webhook URLs
# Example: ./scripts/update-webhooks.sh dev https://5a069f19bcd6.ngrok-free.app
# Note: Also update WEBHOOK_DOMAIN in .env file and restart server
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

**⚠️ Migration Status:**
- ✅ Core services migrated to Pino (~200 statements)
- ⚠️ `src/index.ts` still uses console.log (~478 statements)
- **Impact:** High log volume in production (~40K logs/day with 10 users)
- **Action Required:** Migrate index.ts webhook handler to structured logging post-launch

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

### 🚀 Composio Migration (IN PROGRESS - 50% COMPLETE)

**Status:** Backend migration complete (Phases 0-5), frontend pending (Phase 6-7)
**Documentation:** `.github/issue_composio_migration.md`

#### Overview

The application is migrating from custom Google OAuth to Composio SDK for all Gmail and Calendar operations. This eliminates Google OAuth verification requirements while keeping Google OAuth for initial user authentication.

#### Architecture

**Provider Abstraction Layer** (`src/services/providers/`):
```
Request → ServiceFactory → Provider Interface → Composio SDK → Gmail/Calendar API
```

**Key Interfaces:**
- `IEmailProvider` - Email operations (fetch, send, reply)
- `ICalendarProvider` - Calendar operations (list, create, check availability)

**Implementations:**
- `ComposioEmailProvider` - Composio Gmail integration
- `ComposioCalendarProvider` - Composio Calendar integration

#### Usage Pattern

```typescript
// Get providers via ServiceFactory (request-scoped)
const services = ServiceFactory.createFromRequest(req);

// Email operations
const emailProvider = await services.getEmailProvider();
const result = await emailProvider.fetchEmails(userId, { maxResults: 20 });

// Calendar operations
const calendarProvider = await services.getCalendarProvider();
const events = await calendarProvider.listEvents(userId, {
  timeMin: new Date(),
  timeMax: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
});
```

#### Webhook System

**Current:** Two webhook systems run in parallel
- **Google Pub/Sub:** `POST /webhooks/gmail` (legacy, can be disabled)
- **Composio Triggers:** `POST /webhooks/composio` (new system)

**Toggle:**
```bash
DISABLE_GOOGLE_WEBHOOKS=true  # Disable Google webhook renewal service
```

**Key Differences:**
- Google: Real-time push, expires every 7 days, requires renewal service
- Composio: Polling (~60s latency), never expires, auto-managed by Composio

**Automatic Trigger Setup:**
- Triggers auto-created when user connects via Composio
- Located in: `src/routes/composio.routes.ts` (connection wait & sync endpoints)
- Manual bulk setup: `npx tsx scripts/setup-composio-triggers.ts`

#### Migration Status

**✅ Complete (Phases 0-5):**
- [x] Database schema (all Composio columns exist)
- [x] Provider abstraction layer (interfaces + implementations)
- [x] ServiceFactory integration (getEmailProvider/getCalendarProvider)
- [x] Route handlers updated (5 routes use providers)
- [x] Webhook system migrated (Composio endpoint created)
- [x] Automatic trigger setup (on connection)

**🔄 Pending (Phases 6-7):**
- [ ] Frontend connection UI (force Composio connection after Google OAuth sign-in)
- [ ] Production deployment and testing
- [ ] Monitor webhook delivery (24 hours)
- [ ] Switch fully to Composio webhooks

#### Environment Variables

```bash
# Composio Configuration (Production)
COMPOSIO_API_KEY=ak_9ckm0hutPg5atdGFtJEd
COMPOSIO_GMAIL_AUTH_CONFIG_ID=ac_M2QcFWIKvXv0
COMPOSIO_CALENDAR_AUTH_CONFIG_ID=ac_k53apWo91X9Y
COMPOSIO_WEBHOOK_URL=https://chief-production.up.railway.app/webhooks/composio

# Webhook Control
DISABLE_GOOGLE_WEBHOOKS=false  # Set true after migration complete

# Google OAuth (still used for sign-in)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

#### Testing Scripts

```bash
# Test email provider
npx tsx scripts/test-email-provider.ts <userId>

# Test calendar provider
npx tsx scripts/test-calendar-provider.ts <userId>

# Test service factory providers
npx tsx scripts/test-service-factory-providers.ts <userId>

# Test webhook delivery
npx tsx scripts/test-composio-webhook.ts <userId>

# Setup triggers for all users
npx tsx scripts/setup-composio-triggers.ts
```

#### Important Notes

- **Provider errors:** If user hasn't connected via Composio, providers throw: `"User has not connected via Composio"`
- **Request scoping:** Providers are request-scoped (isolated per user, no data leakage)
- **Type safety:** Use `email as any` when passing provider EmailMessage to `gmail.parseEmail()` (type compatibility)
- **Rollback:** Toggle `DISABLE_GOOGLE_WEBHOOKS=false` to instantly revert to Google webhooks

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
- **Per-user rate limiting** - Each authenticated user gets isolated rate limit bucket
- Rate limits: General (500 req/15min), API (800 req/15min), Auth (10 req/15min)
- Extracts userId from JWT token before full authentication for rate limiting
- Falls back to IP-based limiting for unauthenticated requests
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

### Redis Integration (REQUIRED in Production)

**Location:** `src/utils/redis.ts`

Redis is used for webhook deduplication and distributed locking. The implementation **gracefully degrades** when Redis is unavailable:

```typescript
const lockAcquired = await redis.acquireLock(key, ttlSeconds);
// Returns true if Redis unavailable (fail-open for development)
// In production, Redis prevents duplicate webhook processing
```

**Production Setup (Railway):**
1. Add Redis plugin in Railway dashboard
2. Set `REDIS_URL` environment variable (use public URL: `redis://default:PASSWORD@gondola.proxy.rlwy.net:PORT`)
3. Redis connects automatically on deployment
4. Logs show: `✅ [REDIS] Connected successfully`

**Production Requirement:** Redis is required for multi-instance deployments to prevent duplicate webhook processing and race conditions.

### Frontend Polling Configuration

**Location:** `frontend/src/lib/constants.ts`, `frontend/src/hooks/useSmartPolling.ts`

The frontend uses **fixed-interval polling** for real-time updates:

**Polling Strategy:**
- Fixed 30-second intervals for all data fetching (emails, drafts, promotional stats)
- Simplified from previous adaptive "smart polling" to reduce rate limiting overhead
- Each user generates ~90 requests per 15 minutes (well within per-user rate limits)

**Key Configuration:**
```typescript
// frontend/src/lib/constants.ts
export const POLLING_CONFIG = {
  FIXED_INTERVAL: 30000,     // 30 seconds - consistent polling
  FIXED_STALE_TIME: 25000,   // 25 seconds
  CACHE_TIME: 5 * 60 * 1000, // 5 minutes
}
```

**Affected Hooks:**
- `useEmails()` - Polls every 30s for new emails
- `useDrafts()` / `useLatestDraft()` - Polls every 30s for draft updates
- `usePromotionalEmails()` - Polls every 30s for promotional email stats

**Why Fixed Intervals:**
- Predictable rate limit consumption
- Simpler implementation than adaptive polling
- Gmail webhooks handle real-time notifications (polling is backup)
- Industry standard (Gmail app polls every 15-60s)

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

Required for production:
```
REDIS_URL=redis://...                     # Webhook deduplication (Railway Redis public URL)
```

Optional:
```
WEBHOOK_SECRET=...                        # Gmail webhook verification (future use)
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
5. ✅ Per-user rate limiting enabled (500 req/15min per user)
6. ✅ Redis connected in production (Railway Redis plugin)
7. ✅ Frontend polling optimized (fixed 30s intervals)
8. ⚠️ Logging migration incomplete (index.ts still uses console.log)
9. ⚠️ Webhook renewal cron job needed (7-day expiry)

**Recent Production Changes (2025-10-20):**
- ✅ Implemented per-user rate limiting (extracts userId from JWT before auth)
- ✅ Connected Redis for webhook deduplication (Railway Redis plugin)
- ✅ Simplified frontend polling to fixed 30s intervals
- ✅ Increased rate limits: General (100→500), API (200→800)

**Future AWS Migration:**
- RDS PostgreSQL (migrate from Neon)
- ElastiCache Redis (already using Redis pattern)
- ECS/EC2 for backend (migrate from Railway)
- Indexes will migrate automatically with data

## Webhook Management

### Google Pub/Sub Configuration

The app uses Google Cloud Pub/Sub for Gmail webhook notifications. There are **two separate subscriptions**:

1. **Production** (`gmail-notifications-sub`): Points to Railway URL
2. **Development** (`gmail-notifications-dev`): Points to ngrok tunnel

**IMPORTANT:** When you restart ngrok and get a new URL, you MUST update the dev subscription endpoint.

### Updating Development Webhook (ngrok)

When you start a new ngrok tunnel, follow these steps:

1. **Update .env file:**
   ```bash
   WEBHOOK_DOMAIN=https://NEW_NGROK_URL.ngrok-free.app
   ```

2. **Update Google Cloud Pub/Sub subscription:**
   ```bash
   ./scripts/update-webhooks.sh dev https://NEW_NGROK_URL.ngrok-free.app
   ```

3. **Verify the update:**
   ```bash
   ./scripts/update-webhooks.sh status
   ```

4. **Restart development server:**
   ```bash
   npm run dev
   ```

### Quick Reference Commands

```bash
# Check current webhook URLs for both dev and prod
./scripts/update-webhooks.sh status

# Update dev webhook to new ngrok URL
./scripts/update-webhooks.sh dev https://5a069f19bcd6.ngrok-free.app

# Update prod webhook (Railway URL - rarely needed)
./scripts/update-webhooks.sh prod https://chief-ai-safe-production-b8aa.up.railway.app
```

**Project Info:**
- Project ID: `chief-ai-470506`
- Topic: `gmail-notifications`
- Dev Subscription: `gmail-notifications-dev`
- Prod Subscription: `gmail-notifications-sub`

## Common Pitfalls

1. **Never create global service instances** - Always use ServiceFactory
2. **Don't use pool.query directly** - Use queryWithRetry for Neon reliability
3. **Initialize Gmail/Calendar services** - Call initializeForUser before use
4. **Redis must use public URL in Railway** - Internal hostname (redis.railway.internal) won't resolve
5. **Use IF NOT EXISTS for indexes** - Prevents deployment errors
6. **Apply indexes with CONCURRENTLY** - Prevents table locks in production
7. **Validate JWT tokens** - All authenticated routes need authMiddleware
8. **Check webhook_processed flag** - Prevents duplicate email processing
9. **Rate limiting is per-user in production** - Each authenticated user has isolated 500 req/15min bucket
10. **Logging volume matters** - console.log in hot paths (webhooks) creates performance issues at scale
11. **Update webhooks when ngrok restarts** - Use `./scripts/update-webhooks.sh dev <new-ngrok-url>` and update WEBHOOK_DOMAIN in .env
