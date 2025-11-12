# Chief AI Codebase Analysis & Status Report

## Executive Summary
Chief AI is a **production-ready MVP** of an AI-powered executive assistant that autonomously manages email and calendar for busy professionals. The system reads incoming emails, drafts contextually appropriate responses, handles meeting scheduling with calendar integration, and requires user approval before sending anything. 

**Current Git Status:** Clean working tree, main branch up to date.
**Recent Focus:** Multi-user webhook processing fixes, logging migration to Pino, and performance optimization.

---

## Project Structure Overview

### Root Directory Layout
```
chief/
├── src/                          # Backend TypeScript source code
│   ├── index.ts                 # Main entry point (5,602 lines - large monolith)
│   ├── config/                  # Configuration management
│   ├── database/                # Database connection & migrations
│   ├── middleware/              # Express middleware (auth, security, rate limiting)
│   ├── models/                  # Data models (6 models)
│   ├── routes/                  # API routes (2 route files)
│   ├── services/                # Core business logic (28 services)
│   ├── types/                   # TypeScript type definitions
│   └── utils/                   # Utilities (logger, Redis, serviceFactory, etc.)
│
├── frontend/                     # React + TypeScript frontend (Vite)
│   ├── src/
│   │   ├── components/          # React components (23 directories)
│   │   ├── hooks/               # Custom React hooks (10 hooks)
│   │   ├── pages/               # Page components (14 pages)
│   │   ├── services/            # Frontend API services
│   │   ├── contexts/            # React contexts
│   │   └── types/               # TypeScript types
│   ├── package.json
│   └── tsconfig.json
│
├── scripts/                      # Database & deployment scripts (40+ scripts)
│   ├── database/                # Database management & performance scripts
│   ├── deployment/              # Deployment automation
│   └── monitoring/              # Monitoring utilities
│
├── tests/                        # Integration & unit tests
│   ├── integration/             # End-to-end test scenarios
│   ├── unit/                    # Unit tests
│   └── fixtures/                # Test data
│
├── dist/                        # Compiled JavaScript output
├── docs/                        # Documentation (architecture, setup, operations)
├── package.json                 # Backend dependencies
├── tsconfig.json                # TypeScript config
└── .env                         # Environment variables (present)
```

---

## Backend Architecture (src/)

### Key Components

#### 1. **Main Entry Point** (`src/index.ts` - 5,602 lines)
- Initializes Express server with middleware stack
- Sets up all API routes and webhook handlers
- Configures production security, rate limiting, CORS
- Implements audit trail for multi-user logging
- **Issue:** Large monolithic file with 267 console.log statements (needs migration to Pino)

**Route Summary:**
- `POST /api/oauth-callback` - OAuth2 callback handling
- `GET /api/emails` - Fetch user emails
- `POST /api/drafts` - Create draft responses
- `GET /api/calendar` - Get calendar availability
- `POST /api/meeting-responses` - Handle meeting requests
- `POST /api/send-email` - Send drafted email
- And ~40+ other endpoints for various features

#### 2. **Security & Middleware** 

**Authentication (`src/middleware/auth.ts`):**
- JWT-based token validation
- `authMiddleware.authenticate` - Validates JWT and sets `req.userId`
- Extracts user ID from tokens before full authentication for rate limiting

**Security (`src/middleware/security.ts`):**
- Per-user rate limiting (3 buckets):
  - General: 500 req/15min per authenticated user
  - Auth: 10 req/15min (strict)
  - API: 800 req/15min for read operations
- Security headers and CORS configuration
- Request logging with sanitization
- In-memory rate limiter (upgraded from IP-based to user-based in 2025-10-20)

#### 3. **Service Factory Pattern** (`src/utils/serviceFactory.ts` - CRITICAL)

**Purpose:** Prevents data leakage between concurrent user requests via request-scoped dependency injection.

**Problem Fixed:**
- Global singleton services shared mutable state (currentUserId, userTimezone)
- Concurrent requests would overwrite each other's state
- Request A could read Request B's emails

**Solution:**
- Each HTTP request gets isolated `ServiceContainer`
- Services are lazy-initialized (created on first access)
- Complete isolation, zero data leakage

**Usage Pattern:**
```typescript
app.get('/emails', authMiddleware.authenticate, async (req, res) => {
  const services = ServiceFactory.createFromRequest(req);
  const gmail = await services.getGmailService();
  const emails = await gmail.fetchEmails();
  res.json({ emails });
});
```

#### 4. **Database Connection** (`src/database/connection.ts`)

**Configuration (Neon Serverless PostgreSQL):**
- Max 100 concurrent connections (supports 100 users)
- Min 0 warm connections (Neon closes idle aggressively)
- Idle timeout: 10 seconds (release connections fast)
- Connection acquisition: 30 seconds (serverless wake-up)
- Keep-alive: Active with 5s initial delay

**Critical Function:** `queryWithRetry()`
- Auto-retries on connection errors
- Handles NEON connection drops without crashing
- Must be used for ALL database queries (not `pool.query()` directly)

**Error Handling:**
- Pool error handler catches connection drops
- Automatic reconnection via pg-pool
- No server crashes

---

### Models (6 Data Models)

Located in `src/models/`:

| Model | Purpose | Key Methods |
|-------|---------|------------|
| `Email.ts` | Email CRUD operations | getEmailsByUserId, getUnprocessedEmails, markAsProcessed |
| `Draft.ts` | Draft email management | createDraft, getDraftsByUserId, updateDraft |
| `AutoGeneratedDraft.ts` | AI-generated draft storage | getAutoGenerated, saveDraft, getDashboard |
| `Context.ts` | Thread context & conversation history | getThreadContext, saveContext, getConversationHistory |
| `Calendar.ts` | Calendar events & availability | getAvailability, getEvents, saveEvent |
| `PromotionalEmail.ts` | Promotional email filtering | classifyEmail, getStats, markAsRead |

**Pattern:** Models encapsulate SQL queries and provide typed interfaces. Use via `ServiceFactory` for request scoping.

---

### Services (28 Services)

Located in `src/services/`:

#### Core AI Services
- **`ai.ts`** (14.8 KB) - OpenAI/Anthropic integration for draft generation
- **`response.ts`** (24.8 KB) - Context-aware response generation using writing style
- **`learning.ts`** (26.5 KB) - Learns from user edits to improve drafts over time
- **`context.ts`** (33.8 KB) - Thread context retrieval and conversation history

#### Email Services
- **`gmail.ts`** (32.9 KB) - Gmail OAuth2 auth, real-time webhooks, email fetching
- **`intelligentEmailRouter.ts`** (16.2 KB) - Email classification and routing
- **`semanticSearchService.ts`** (8.5 KB) - Vector database search across emails

#### Calendar & Meeting Services
- **`calendar.ts`** (12.4 KB) - Google Calendar API integration
- **`meetingDetection.ts`** (35.8 KB) - Detects meeting requests in emails
- **`meetingPipeline.ts`** (33.2 KB) - End-to-end meeting workflow automation
- **`meetingResponseGenerator.ts`** (49.3 KB) - Generates smart meeting responses
- **`meetingAIContent.ts`** (20.7 KB) - AI-generated meeting content
- **`meetingConfirmation.ts`** (11.6 KB) - Handles meeting confirmations
- **`autoScheduling.ts`** (18.3 KB) - Automatic scheduling with conflict resolution
- **`smartAvailability.ts`** (10.9 KB) - Analyzes calendar availability

#### Utility Services
- **`timezone.ts`** (13.7 KB) - User timezone tracking and conversion
- **`userProfile.ts`** (4.1 KB) - User profile management
- **`tokenStorage.ts`** (13.2 KB) - OAuth token encryption and storage (recently updated 2025-11-10)
- **`webhookRenewal.ts`** (4.0 KB) - Gmail webhook renewal (7-day expiry)
- **`webhookTesting.ts`** (17.5 KB) - Testing suite for webhook scenarios
- **`voiceService.ts`** (13.9 KB) - Voice transcription via Whisper API
- **`embeddingService.ts`** (4.7 KB) - Vector embeddings for semantic search
- **`openAIClassifier.ts`** (13.3 KB) - Email classification
- **`contextStrategy.ts`** (10.2 KB) - Context retrieval strategies
- **`promptTemplates.ts`** (21.4 KB) - AI prompt templates for responses
- **`dateParser.ts`** (10.4 KB) - Parse dates from email content
- **`monitoring.ts`** (6.7 KB) - Health monitoring endpoints

#### Infrastructure Services
- **`tokenStorage.ts`** (13.2 KB) - Encrypted OAuth token management

---

### Routes (2 Route Files)

Located in `src/routes/`:

1. **`auth.ts`** (4.1 KB)
   - `GET /me` - Get current user profile
   - `POST /profile` - Update user profile

2. **`health.ts`** (5.6 KB)
   - `GET /health` - Health check
   - System status endpoints

**Note:** Most routes are in `src/index.ts` (40+ endpoints) - should be refactored into separate route files.

---

### Utilities (`src/utils/`)

| File | Purpose | Status |
|------|---------|--------|
| `serviceFactory.ts` (9.8 KB) | Request-scoped DI container | Production-ready, CRITICAL |
| `pino-logger.ts` (4.4 KB) | Structured logging with Pino | ✅ Implemented, used in services |
| `logger.ts` (4.5 KB) | Basic console logger | Legacy, being replaced by Pino |
| `redis.ts` (5.4 KB) | Redis integration for webhook deduplication | ✅ Gracefully degrades if unavailable |
| `monitoring.ts` (6.7 KB) | Health monitoring | ✅ Pino integration |
| `dateParser.ts` (10.4 KB) | Parse dates from emails | ✅ Standalone utility |
| `schedulingLinkValidator.ts` (4.3 KB) | Validate scheduling links | ✅ Used in profile setup |
| `textEncoding.ts` (4.0 KB) | Text encoding utilities | ✅ Email processing |

---

### Configuration (`src/config/`)

**`environment.ts`:**
- Validates required environment variables at startup
- Defines feature flags (e.g., `enableCORS`, `enableVoiceSearch`)
- Provides typed environment configuration
- Fails fast if required vars missing

**Required Environment Variables:**
```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
DATABASE_URL                    # Neon PostgreSQL
OPENAI_API_KEY
JWT_SECRET
TOKEN_ENCRYPTION_KEY            # For OAuth token storage
```

**Optional:**
```
LOG_LEVEL                       # debug, info, warn, error (default: info in prod)
WEBHOOK_RENEWAL_INTERVAL        # Hours between webhook renewals
FRONTEND_URL                    # Custom frontend URL
REDIS_URL                       # For webhook deduplication (production)
```

---

### Database (`src/database/`)

**Connection:** `connection.ts` (optimized for Neon serverless)

**Migrations:** Located in `scripts/database/` (40+ migration files)

**Key Migrations Applied:**
1. Phase 1-3: Core schema (tables for emails, drafts, calendar, etc.)
2. User authentication & token storage
3. Webhook processing (Gmail Push API)
4. Meeting pipeline schema
5. Timezone support (2025-10-16)
6. Performance indexes - **5 critical indexes** (2025-10-16):
   - `idx_emails_user_webhook` - 500ms → 5ms
   - `idx_auto_drafts_user_status_time` - 300ms → 3ms
   - `idx_generated_responses_user_learning` - 200ms → 10ms
   - `idx_edit_analyses_user_time_type` - 150ms → 8ms
   - `idx_meeting_processing_email_user` - 100ms → 2ms

**Database Schema:** 39 tables total
- Email & context tracking
- Draft generation & management
- Calendar & meeting pipeline
- User profiles & token storage
- Learning insights & edit analysis
- Promotional email filtering
- Webhook status & renewal tracking

---

## Frontend Architecture (frontend/)

### Technology Stack
- **Framework:** React 18 + TypeScript
- **Build:** Vite
- **Styling:** Tailwind CSS
- **HTTP:** React Query for data fetching
- **Routing:** React Router (implied from pages/)
- **State Management:** React Context API

### Directory Structure

```
frontend/src/
├── components/
│   ├── ui/                      # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   ├── Spinner.tsx
│   │   ├── Toast.tsx
│   │   ├── ProfileButton.tsx
│   │   └── index.ts
│   ├── layout/
│   │   ├── AppLayout.tsx        # Main app layout wrapper
│   │   └── StatusBar.tsx        # Status/header bar
│   ├── navigation/
│   │   └── DashboardTabs.tsx    # Tab navigation
│   ├── email/
│   │   ├── EmailPanel.tsx       # Email list view
│   │   ├── PromotionalEmailCard.tsx
│   │   └── PromotionalEmailsPanel.tsx
│   ├── draft/
│   │   └── DraftPanel.tsx       # Draft editor
│   ├── calendar/
│   │   └── CalendarPanel.tsx    # Calendar view
│   ├── meeting/
│   │   ├── MeetingPopupManager.tsx
│   │   ├── MeetingResponsePopup.tsx
│   │   └── index.ts
│   ├── learning/
│   │   └── LearningPanel.tsx    # Writing style learning display
│   ├── landing/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── HowItWorksSection.tsx
│   │   ├── FeaturesSection.tsx
│   │   ├── SecuritySection.tsx
│   │   ├── FinalCTASection.tsx
│   │   └── [other cards]        # Landing page cards
│   ├── legal/
│   │   └── LegalPageLayout.tsx
│   ├── Dashboard.tsx            # Main dashboard component
│   ├── AuthCallback.tsx         # OAuth callback handler
│   ├── Onboarding.tsx           # Onboarding flow
│   ├── ProfileSetup.tsx         # User profile setup
│   ├── SignIn.tsx               # Sign in form
│   ├── SignUpForm.tsx           # Sign up form
│   ├── SchedulingLinkModal.tsx  # Scheduling link modal
│   └── LoadingSpinner.tsx
│
├── hooks/                       # Custom React hooks (10 total)
│   ├── useEmails.ts            # Fetch emails (polls every 30s)
│   ├── useDrafts.ts            # Fetch drafts
│   ├── useCalendar.ts          # Fetch calendar
│   ├── usePromotionalEmails.ts # Fetch promotional stats
│   ├── useMeetingPopups.ts     # Meeting popup state
│   ├── useLearning.ts          # Learning insights
│   ├── useWebhookStatus.ts     # Webhook status
│   ├── useVoiceRecorder.ts     # Voice recording/transcription
│   ├── useSmartPolling.ts      # Fixed polling configuration
│   └── useToast.ts             # Toast notifications
│
├── pages/                       # Page components (14 total)
│   ├── LandingPage.tsx         # Public landing page
│   ├── SignUpSignInPage.tsx    # Auth page
│   ├── DashboardPage.tsx       # Main app dashboard
│   ├── ProfileSetupPage.tsx    # Profile setup
│   ├── AuthCallbackPage.tsx    # OAuth callback handler
│   ├── SearchPage.tsx          # Email search (voice/semantic)
│   ├── VoiceSearchPage.tsx     # Voice search interface
│   ├── SystemStatusPage.tsx    # System health dashboard
│   ├── PrivacyPolicyPage.tsx   # Legal pages
│   └── TermsOfUsePage.tsx
│
├── services/
│   ├── api.ts                  # HTTP client setup
│   ├── emailService.ts         # Email API calls
│   ├── draftService.ts         # Draft API calls
│   ├── calendarService.ts      # Calendar API calls
│   ├── promotionalEmailService.ts
│   ├── searchService.ts        # Semantic search API
│   └── voiceService.ts         # Voice transcription API
│
├── contexts/
│   ├── AuthContext.tsx         # Authentication context
│   └── AuthContext-simple.tsx  # Simplified version
│
├── types/
│   ├── auth.ts                 # Auth types
│   ├── api.ts                  # API response types
│   ├── email.ts                # Email types
│   ├── draft.ts                # Draft types
│   ├── calendar.ts             # Calendar types
│   ├── learning.ts             # Learning types
│   ├── promotionalEmail.ts     # Promotional email types
│
├── config/
│   ├── features.ts             # Feature flags
│   ├── landingContent.ts       # Landing page content
│   ├── animations.ts           # Animation configs
│
├── lib/
│   ├── constants.ts            # Constants (POLLING_CONFIG)
│   └── utils.ts                # Helper functions
│
├── assets/                      # Images, icons, etc.
├── App.tsx                      # Main app component
└── main.tsx                     # React entry point
```

### Frontend Polling Configuration

**Fixed Interval Strategy** (`frontend/src/lib/constants.ts`):
```typescript
export const POLLING_CONFIG = {
  FIXED_INTERVAL: 30000,        // 30 seconds
  FIXED_STALE_TIME: 25000,      // 25 seconds
  CACHE_TIME: 5 * 60 * 1000,    // 5 minutes
}
```

**Why Fixed Intervals:**
- Predictable rate limit consumption (~90 req/15min per user)
- Simpler implementation than adaptive polling
- Gmail webhooks handle real-time notifications (polling is backup)
- Industry standard (Gmail app polls every 15-60s)

**Polling Endpoints:**
- `useEmails()` - Polls every 30s for new emails
- `useDrafts()` / `useLatestDraft()` - Polls every 30s for draft updates
- `usePromotionalEmails()` - Polls every 30s for promotional stats

### Frontend Authentication Flow
1. User starts OAuth flow
2. Redirected to Google OAuth
3. Google redirects to `/auth/callback`
4. `AuthCallback.tsx` component handles OAuth response
5. JWT token stored locally
6. `AuthContext` provides authenticated requests

---

## Key Implementation Patterns

### 1. Request-Scoped Service Injection
Every authenticated route must use `ServiceFactory.createFromRequest(req)`:
```typescript
const services = ServiceFactory.createFromRequest(req);
const gmail = await services.getGmailService();
const emails = await gmail.fetchEmails();
```

### 2. Database Queries Must Use queryWithRetry()
```typescript
import { queryWithRetry } from '../database/connection';
const result = await queryWithRetry(sql, params);  // ✅ Correct
await pool.query(sql, params);                      // ❌ Wrong
```

### 3. Service Initialization Pattern
```typescript
const gmail = await services.getGmailService();  // Initializes for user
const calendar = await services.getCalendarService();
const ai = services.getAIService();  // Stateless, no init needed
```

### 4. Webhook Processing Pattern
```typescript
async function processWebhookNotification(notification) {
  const lockKey = `webhook:gmail:${notification.historyId}`;
  const lockAcquired = await redis.acquireLock(lockKey, 300);
  
  if (!lockAcquired) {
    console.log('Duplicate webhook - skipping');
    return;
  }

  try {
    await processGmailNotification(notification);
  } finally {
    await redis.releaseLock(lockKey);
  }
}
```

### 5. Pino Logging Pattern
```typescript
import { logger, sanitizeUserId } from '../utils/pino-logger';

logger.info({
  userId: sanitizeUserId(userId),
  emailCount: emails.length,
  duration: 1234
}, 'gmail.emails.fetched');

logger.error({
  userId: sanitizeUserId(userId),
  emailId,
  error: error.message
}, 'gmail.email.fetch.failed');
```

---

## Scripts & Utilities

Located in `scripts/` (40+ scripts):

### Database Management
- `database/apply-indexes.ts` - Apply Phase 1 critical indexes
- `database/verify-no-damage.ts` - Verify database integrity after migrations
- `database/test-index-performance.ts` - Test query performance with EXPLAIN ANALYZE
- `database/verify-indexes.ts` - Index verification

### Database Migrations
- 40+ SQL migration files for schema evolution
- Timezone support, constraints, performance indexes
- Vector database support for semantic search
- Promotional email schema

### Webhook Management
- `update-webhooks.sh` - Update dev/prod webhook URLs
- `./update-webhooks.sh status` - Check current URLs
- `./update-webhooks.sh dev <ngrok-url>` - Update ngrok tunnel

### Testing
- Integration test runners for 24/7 system
- Webhook scenario testing
- User experience flow tests
- Connection handling tests

### Deployment
- `deployment/auto-restart.sh` - Automatic restart on crashes
- Monitoring & cleanup scripts

---

## Critical Issues & Warnings

### High Priority (Production Impact)

1. **Large Monolithic index.ts (5,602 lines)**
   - 267 console.log statements scattered throughout
   - Should be refactored into separate route files
   - **Action:** Split into logical route modules, migrate logging to Pino
   - **Impact:** High log volume in production (~40K logs/day with 10 users)

2. **Logging Migration Incomplete**
   - Core services: ✅ Migrated to Pino (~200 statements)
   - `src/index.ts`: ⚠️ Still uses console.log (~267 statements)
   - **Action:** Migrate webhook handler to structured logging
   - **Status:** Partial migration (post-launch task)

3. **Webhook Renewal Cron Job Missing**
   - Gmail webhooks expire after 7 days
   - Manual renewal is possible but needs automation
   - **Action:** Implement background cron for webhook renewal

### Medium Priority

4. **Several TODO Comments in Code**
   - Line 322 in `index.ts`: "Remove this endpoint or refactor"
   - Line 1701, 1769: Debug logging for threading/calendar
   - Line 2335, 5145, 5344, 5381, 5444: "Add authentication or remove"
   - **Action:** Clean up TODOs before next release

5. **Backup Files in Services**
   - `src/services/gmail.ts.backup` (34.6 KB) exists
   - Should be removed from source control
   - **Action:** Delete backup files, use git history instead

6. **Redis Dependency**
   - Production requires Redis for webhook deduplication
   - **Current Status:** ✅ Connected via Railway plugin
   - Gracefully degrades in development (fail-open)

### Low Priority

7. **Frontend Feature Flags**
   - Voice search and semantic search disabled (2025-10-21 commit)
   - Set in `frontend/src/config/features.ts`
   - **Action:** Re-enable once verified stable

8. **Empty Test HTML File**
   - `frontend/src/pages/terms-of-use-content-clean.html` is empty
   - **Action:** Remove or populate with actual terms content

---

## Recent Changes & Commits

### Latest Commits (2025-11-10 onwards)
1. **Fixed multiuser webhook processing blocking** - Critical fix
2. **Cleared build errors** - TypeScript compilation fixes
3. **Added scheduling link field for signup** - Feature addition
4. **Changed onboarding flow** - UX improvements
5. **Fixed promotional email scrolling** - UI bug fix

### Key Historical Improvements
- **2025-10-20:** Implemented per-user rate limiting, connected Redis
- **2025-10-17:** Simplified frontend polling to fixed 30s intervals
- **2025-10-16:** Applied 5 critical performance indexes
- **Oct 17:** Migrated webhook logging to Pino (85% log reduction)
- **Oct 16:** Made Redis optional, reduced log spam
- **Oct 10:** Fixed Neon Connection Timeout in tokenStorage
- **Oct 8:** Disabled voice/search features temporarily

---

## Deployment Architecture

### Current Stack
- **Backend:** Railway (Node.js)
- **Database:** Neon PostgreSQL (serverless)
- **Frontend:** Vercel (https://cap-ai-puce.vercel.app)
- **Cache/Locks:** Railway Redis (production)
- **Google Cloud:** Pub/Sub for Gmail webhooks

### Webhook Configuration
- **Production:** Gmail Pub/Sub → Railway URL → `gmail-notifications-sub`
- **Development:** Gmail Pub/Sub → ngrok tunnel → `gmail-notifications-dev`
- **Update Process:** `./scripts/update-webhooks.sh dev <ngrok-url>`

### Production Checklist
- ✅ ServiceFactory implemented (prevents race conditions)
- ✅ Database indexes optimized (5 critical paths)
- ✅ Connection pooling configured for Neon
- ✅ Error handling and logging in place
- ✅ Per-user rate limiting enabled
- ✅ Redis connected (webhook deduplication)
- ✅ Frontend polling optimized (fixed 30s)
- ⚠️ Logging migration incomplete (index.ts)
- ⚠️ Webhook renewal cron job needed

---

## Development Commands

### Backend
```bash
npm run dev                    # Start with tsx hot-reload
npm run build                 # Compile TypeScript
npm start                     # Run production build
npm test                      # Run Jest tests
npm run test:24-7            # Integration tests
npm run test:core            # 24/7 system tests
npm run test:webhooks        # Webhook scenarios
npm run test:api             # User experience flows
```

### Database
```bash
npm run db:migrate           # Run migrations
npm run db:introspect        # Introspect schema
npm run db:generate          # Generate migrations
npm run db:push              # Push schema changes
npm run db:studio            # Open Drizzle Studio GUI

# Database scripts
npx tsx scripts/database/apply-indexes.ts
npx tsx scripts/database/verify-no-damage.ts
npx tsx scripts/database/test-index-performance.ts
```

### Webhook Management
```bash
./scripts/update-webhooks.sh dev https://NEW_NGROK.ngrok-free.app
./scripts/update-webhooks.sh status
```

---

## Performance Metrics (Post-Index Optimization)

**Database Query Performance (2025-10-16):**
- Webhook processing: 500ms → 5ms (100x improvement)
- Draft dashboard: 300ms → 3ms (100x improvement)
- Learning system: 200ms → 10ms (20x improvement)
- Edit analysis: 150ms → 8ms (18x improvement)
- Meeting pipeline: 100ms → 2ms (50x improvement)

**Logging Performance:**
- Reduced log volume by 85% with Pino migration
- Structured JSON output (searchable in production)

**Frontend:**
- 30-second polling interval = ~90 requests/15min per user
- Well within per-user rate limit (500 req/15min)

---

## Security Considerations

### Implemented
- ✅ JWT-based authentication
- ✅ Per-user rate limiting (500 req/15min)
- ✅ OAuth2 with Google
- ✅ Token encryption for stored credentials
- ✅ CORS whitelisting
- ✅ Security headers (helmet-style)
- ✅ Pino logging with automatic data redaction
- ✅ Request scoped dependency injection (no data leakage)

### Recommended
- Implement CSRF tokens
- Add webhook signature verification
- Implement API key rate limiting (separate from user limits)
- Regular security audits of OAuth implementation

---

## Future Improvements & Migration Plan

### Short-term (Next Sprint)
1. Refactor `index.ts` into separate route modules
2. Complete Pino logging migration
3. Implement webhook renewal cron job
4. Clean up TODO comments and backup files
5. Re-enable voice/search features after testing

### Medium-term (1-2 Months)
1. Consider AWS migration (RDS, ElastiCache, ECS)
2. Add comprehensive test coverage
3. Implement API versioning
4. Add request/response validation middleware
5. Create developer API documentation

### Long-term (3+ Months)
1. Multi-tenant support
2. Role-based access control (RBAC)
3. Admin dashboard
4. Usage analytics & billing
5. Advanced meeting coordination (multiple participants)

---

## Key Files Reference

### Must-Know Files
- `/src/index.ts` - Main application server (5,602 lines)
- `/src/utils/serviceFactory.ts` - Dependency injection (CRITICAL)
- `/src/database/connection.ts` - DB connection pooling
- `/src/middleware/security.ts` - Rate limiting & auth
- `/src/services/gmail.ts` - Gmail API integration
- `/src/services/meetingPipeline.ts` - Meeting automation
- `/frontend/src/lib/constants.ts` - Polling configuration
- `CLAUDE.md` - Project guidelines (in this repo)

### Documentation
- `/docs/architecture/` - Architecture documentation
- `/docs/setup/` - Setup instructions
- `/docs/development/` - Development guide
- `/tests/MANUAL_TEST_GUIDE.md` - Manual testing procedures

---

## Support & Troubleshooting

### Common Issues

1. **Neon Connection Timeout**
   - Increase `connectionTimeoutMillis` in `connection.ts`
   - Check REDIS_URL in production
   - Verify pool size matches expected load

2. **Webhook Not Processing**
   - Check ngrok tunnel active for development
   - Run `./scripts/update-webhooks.sh status`
   - Verify `webhook_processed` flag in emails table

3. **Rate Limit Exceeded**
   - Check polling interval (should be 30s)
   - Verify per-user rate limits (500 req/15min)
   - Monitor frontend polling configuration

4. **High Log Volume**
   - Ensure `LOG_LEVEL=info` in production
   - Check for remaining console.log statements in index.ts
   - Monitor Pino logger JSON output

5. **MultiUser Issues**
   - Verify ServiceFactory is used in all routes
   - Check for global service instances
   - Ensure userId is properly extracted from JWT

---

## Conclusion

Chief AI is a **well-architected production MVP** with strong security patterns (request-scoped DI, per-user rate limiting), optimized database performance (5 critical indexes), and comprehensive logging infrastructure. The main areas for improvement are code organization (split large index.ts), complete logging migration, and automating webhook renewal. The codebase is ready for production with minor cleanup needed.

**Overall Status: Production Ready with Minor Issues**
- Architecture: ✅ Excellent
- Security: ✅ Strong
- Performance: ✅ Optimized
- Code Quality: ⚠️ Good but needs refactoring
- Logging: ⚠️ Partial migration
- Testing: ⚠️ Integration tests present, more unit tests needed
