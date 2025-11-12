# Chief AI - Quick Reference Guide

## Project at a Glance

**Chief AI** is an AI-powered executive assistant that automates email drafting and meeting scheduling.

- **Status:** Production-ready MVP
- **Git Status:** Clean, main branch up to date
- **Tech Stack:** Node.js/Express + React + PostgreSQL (Neon) + Google APIs
- **Deployment:** Railway (backend), Vercel (frontend)

---

## Critical Files You Must Know

| File Path | Purpose | Why Important |
|-----------|---------|---------------|
| `/src/index.ts` | Main server + all routes | 5,602 lines - needs refactoring |
| `/src/utils/serviceFactory.ts` | Request-scoped DI container | PREVENTS DATA LEAKS (critical!) |
| `/src/database/connection.ts` | DB pooling + queryWithRetry() | Must use for all DB queries |
| `/src/middleware/security.ts` | Rate limiting (500 req/15min/user) | Per-user not IP-based |
| `/src/services/gmail.ts` | Gmail OAuth + webhooks | Email integration core |
| `/src/services/meetingPipeline.ts` | Meeting automation | Core meeting feature |
| `/frontend/src/lib/constants.ts` | Polling interval config | Fixed 30-second interval |
| `CLAUDE.md` | Project guidelines | Development patterns |

---

## Architecture Overview

```
User Request
    ↓
Express Middleware (auth, rate limit, security)
    ↓
Route Handler (with ServiceFactory.createFromRequest)
    ↓
ServiceContainer (request-scoped, isolated per user)
    ↓
Services (Gmail, Calendar, AI, etc.)
    ↓
Models (database access patterns)
    ↓
Connection Pool with queryWithRetry()
    ↓
Neon PostgreSQL
```

---

## Most Important Patterns

### 1. Using Services (CRITICAL)
```typescript
// WRONG - creates global singleton (data leak!)
const gmail = new GmailService();

// RIGHT - request-scoped container
const services = ServiceFactory.createFromRequest(req);
const gmail = await services.getGmailService();
```

### 2. Database Queries (CRITICAL)
```typescript
// WRONG - crashes on Neon connection drop
const result = await pool.query(sql, params);

// RIGHT - auto-retries on connection errors
const result = await queryWithRetry(sql, params);
```

### 3. Logging (IMPORTANT)
```typescript
// Prefer Pino for structured logging
logger.info({ userId: sanitizeUserId(userId), count: 42 }, 'gmail.emails.fetched');

// Avoid console.log (being phased out)
console.log('something');  // ❌ Still exists in index.ts
```

---

## Key Statistics

### Backend Structure
- **Main server:** 5,602 lines in index.ts (1 large file)
- **Services:** 28 services (Gmail, Calendar, AI, Meeting, etc.)
- **Models:** 6 models (Email, Draft, Context, Calendar, etc.)
- **Routes:** ~40 endpoints (mostly in index.ts, 2 route files)
- **Database:** 39 tables + 5 performance indexes

### Frontend Structure
- **Components:** 23 component directories
- **Hooks:** 10 custom hooks
- **Pages:** 14 page components
- **Polling:** Fixed 30-second intervals (~90 req/15min per user)

### Performance (Post-Optimization)
- Webhook processing: 500ms → 5ms (100x)
- Draft dashboard: 300ms → 3ms (100x)
- Learning system: 200ms → 10ms (20x)
- Logging: 85% reduction with Pino

---

## Rate Limiting (Per User)

| Bucket | Limit | Window |
|--------|-------|--------|
| General | 500 req/15min | Authenticated users |
| Auth | 10 req/15min | Strict for login attempts |
| API | 800 req/15min | Read operations |

Frontend polling (30s interval) = ~90 req/15min per user (well within limits)

---

## Database Setup

### Connection (Neon Serverless)
- Max 100 concurrent connections
- Min 0 warm connections (Neon closes idle aggressively)
- Idle timeout: 10 seconds
- Keep-alive: 5 seconds initial delay
- Must use `queryWithRetry()` for resilience

### Critical Indexes Applied (2025-10-16)
1. `idx_emails_user_webhook` - Webhook processing
2. `idx_auto_drafts_user_status_time` - Draft dashboard
3. `idx_generated_responses_user_learning` - Learning system
4. `idx_edit_analyses_user_time_type` - Edit analysis
5. `idx_meeting_processing_email_user` - Meeting pipeline

---

## Frontend Polling

**Configuration:**
```typescript
// frontend/src/lib/constants.ts
POLLING_CONFIG = {
  FIXED_INTERVAL: 30000,      // 30 seconds
  FIXED_STALE_TIME: 25000,    // 25 seconds
  CACHE_TIME: 5 * 60 * 1000   // 5 minutes
}
```

**Polling Endpoints:**
- `useEmails()` - Email list
- `useDrafts()` - Draft editor
- `usePromotionalEmails()` - Promotional stats
- `useCalendar()` - Calendar events

---

## Required Environment Variables

```bash
# Essential (app won't start without these)
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
DATABASE_URL                    # Neon PostgreSQL URL
OPENAI_API_KEY
JWT_SECRET
TOKEN_ENCRYPTION_KEY

# Optional
LOG_LEVEL=info                  # debug, info, warn, error
REDIS_URL                       # Production webhook deduplication
FRONTEND_URL                    # Custom domain
WEBHOOK_RENEWAL_INTERVAL        # Hours between renewals
```

---

## Security Summary

### Implemented
- ✅ JWT-based authentication
- ✅ Per-user rate limiting (not IP-based)
- ✅ OAuth2 with Google
- ✅ Token encryption
- ✅ CORS whitelisting
- ✅ Request-scoped DI (no data leakage)
- ✅ Pino logging with data redaction

### Recommended (Not Yet Done)
- CSRF tokens
- Webhook signature verification
- API key rate limiting
- Regular security audits

---

## Active Issues

### 🔴 High Priority
1. **Large index.ts (5,602 lines)**
   - 267 console.log statements
   - Needs refactoring into separate route files
   - Impact: High log volume in production

2. **Logging Migration Incomplete**
   - Services: ✅ Migrated to Pino
   - index.ts: ⚠️ Still uses console.log
   - Action: Migrate webhook handlers

3. **Webhook Renewal Automation**
   - Gmail webhooks expire after 7 days
   - Currently requires manual renewal
   - Action: Implement cron job

### 🟡 Medium Priority
4. TODO comments scattered in code (cleanup before next release)
5. Backup file: `src/services/gmail.ts.backup` (remove)
6. Voice/search features disabled (re-enable after testing)

### 🟢 Low Priority
7. Empty HTML file in frontend legal section
8. Simplify AuthContext (duplicate versions)

---

## Development Workflow

### Starting Development
```bash
cd chief
npm run dev              # Backend with hot-reload
# In another terminal:
cd frontend
npm run dev             # Frontend on localhost:5173
```

### Database Work
```bash
npm run db:studio       # GUI for database
npm run db:migrate      # Run migrations
npx tsx scripts/database/verify-no-damage.ts  # Verify integrity
```

### Webhook Updates (ngrok)
```bash
./scripts/update-webhooks.sh dev https://YOUR_NGROK_URL.ngrok-free.app
./scripts/update-webhooks.sh status    # Check current URLs
```

### Testing
```bash
npm test                # Jest tests
npm run test:24-7       # Full system integration
npm run test:webhooks   # Webhook scenarios
npm run test:api        # User flows
```

### Building for Production
```bash
npm run build           # Compile TypeScript → dist/
npm start               # Run production build
```

---

## Service Architecture (28 Total)

### Email & Gmail (3)
- `gmail.ts` - OAuth, webhooks, email fetching
- `intelligentEmailRouter.ts` - Email classification
- `semanticSearchService.ts` - Vector search

### AI & Responses (4)
- `ai.ts` - OpenAI/Anthropic integration
- `response.ts` - Context-aware draft generation
- `learning.ts` - Learn from user edits
- `context.ts` - Thread history

### Calendar & Meeting (7)
- `calendar.ts` - Google Calendar API
- `meetingDetection.ts` - Detect meeting requests
- `meetingPipeline.ts` - Automation workflow
- `meetingResponseGenerator.ts` - Smart responses
- `autoScheduling.ts` - Auto-schedule with conflicts
- `meetingConfirmation.ts` - Confirmations
- `smartAvailability.ts` - Availability analysis

### Utilities & Infrastructure (11+)
- `timezone.ts`, `userProfile.ts`, `tokenStorage.ts`
- `webhookRenewal.ts`, `webhookTesting.ts`
- `voiceService.ts`, `embeddingService.ts`
- `openAIClassifier.ts`, etc.

---

## Common Mistakes to Avoid

| Don't ❌ | Do ✅ | Why |
|----------|------|-----|
| Global `new GmailService()` | `ServiceFactory.createFromRequest(req)` | Prevents data leaks |
| `pool.query()` | `queryWithRetry()` | Handles Neon drops |
| `console.log()` everywhere | Use Pino logger | Structured logging |
| Use IP for rate limits | Use userId extraction | Per-user limits |
| Unencrypted tokens | `TokenStorageService` | Security |
| Global singleton models | Request-scoped via factory | Data isolation |

---

## Deployment Checklist

Before deploying to production:

- [ ] All TODOs addressed or documented
- [ ] No console.log in hot paths (webhook handlers)
- [ ] Backup files removed (gmail.ts.backup)
- [ ] Database indexes verified (`verify-no-damage.ts`)
- [ ] Redis URL configured (for production)
- [ ] WEBHOOK_DOMAIN updated for ngrok
- [ ] Rate limits tuned for expected load
- [ ] Logging level set correctly (info or warn)
- [ ] Frontend feature flags reviewed
- [ ] Auth flows tested end-to-end

---

## Troubleshooting Quick Links

### Problem: Neon Connection Timeout
**Solution:** Check `connectionTimeoutMillis` in `connection.ts`, increase if needed for serverless wake-up.

### Problem: Webhook Not Processing
**Solution:** Run `./scripts/update-webhooks.sh status`, verify ngrok tunnel active, check `webhook_processed` flag.

### Problem: Rate Limit Exceeded
**Solution:** Check polling interval (30s?), verify rate limit buckets in `security.ts`, monitor `useSmartPolling.ts`.

### Problem: High Log Volume
**Solution:** Set `LOG_LEVEL=info` (not debug), migrate console.log from index.ts, verify Pino structured format.

### Problem: Data Leakage Between Users
**Solution:** Verify `ServiceFactory.createFromRequest(req)` used in all routes, no global service instances.

---

## Key Achievements

- ✅ Production-ready security (request-scoped DI, per-user rate limiting)
- ✅ 100x database performance improvement with critical indexes
- ✅ 85% log reduction with Pino migration
- ✅ Multi-user webhook processing with Redis deduplication
- ✅ Comprehensive test suite (integration tests)
- ✅ Clean deployment pipeline (Railway + Vercel)
- ✅ Graceful error handling (Neon connection resilience)
- ✅ Feature-rich MVP (emails, calendar, meetings, learning, voice)

---

## Next Steps for Development

1. **Refactor index.ts** - Split into route modules (emails, calendar, auth, etc.)
2. **Complete logging migration** - Move remaining console.log to Pino
3. **Automate webhook renewal** - Implement 7-day renewal cron
4. **Clean up code** - Remove TODOs, backup files, unused features
5. **Enhance testing** - Add more unit tests, improve coverage
6. **AWS migration** - Consider RDS + ElastiCache + ECS (future)

---

## Resources

- **Project Guide:** `CLAUDE.md` (in repo root)
- **Full Analysis:** `CODEBASE_ANALYSIS.md` (this analysis)
- **Tests Guide:** `/tests/MANUAL_TEST_GUIDE.md`
- **Architecture:** `/docs/architecture/`
- **Setup:** `/docs/setup/`

---

**Last Updated:** November 10, 2025
**Analysis by:** Claude Code
**Status:** Production Ready with Minor Issues
