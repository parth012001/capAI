# Chief AI - Architecture Diagrams

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Chief AI System                              │
└─────────────────────────────────────────────────────────────────────┘

                     External Services
                            │
        ┌───────────┬────────┼─────────┬────────────┐
        │           │        │         │            │
        ▼           ▼        ▼         ▼            ▼
    ┌────────┐ ┌────────┐ ┌──────┐ ┌────────┐ ┌─────────┐
    │ Google │ │ Google │ │Gmail │ │ OpenAI │ │  Redis  │
    │ OAuth2 │ │Calendar│ │ Push │ │ / Anth │ │ (Locks) │
    │        │ │        │ │ API  │ │        │ │         │
    └────────┘ └────────┘ └──────┘ └────────┘ └─────────┘
        │           │        │         │            │
        └───────────┴────────┼─────────┴────────────┘
                             │
    ┌────────────────────────┴────────────────────────┐
    │                                                  │
    │         Express Server (Port 3000)              │
    │                                                  │
    ├─────────────────────────────────────────────────┤
    │  Middleware Stack (Order Matters)               │
    ├─────────────────────────────────────────────────┤
    │  1. requestLogging (audit trail)                │
    │  2. healthCheckBypass (skip logs for /health)   │
    │  3. monitoringMiddleware (track metrics)        │
    │  4. express.json() (parse body)                 │
    │  5. CORS (conditional by origin)                │
    ├─────────────────────────────────────────────────┤
    │  Per-Route Middleware                           │
    ├─────────────────────────────────────────────────┤
    │  - authMiddleware.authenticate (JWT validation) │
    │  - Rate Limiting (per-user: 500 req/15min)      │
    ├─────────────────────────────────────────────────┤
    │  Route Handlers (~40 endpoints)                 │
    ├─────────────────────────────────────────────────┤
    │  POST /api/oauth-callback → AuthCallback        │
    │  GET  /api/emails → EmailController             │
    │  POST /api/drafts → DraftController             │
    │  GET  /api/calendar → CalendarController        │
    │  POST /api/meeting-responses → MeetingCtrl      │
    │  POST /api/send-email → SendEmailController     │
    │  ... and ~35 more endpoints                     │
    └─────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌─────────────┐
│ ServiceFactory│  │   Models     │  │   Utils     │
│              │  │              │  │             │
│ Creates      │  │ - Email      │  │ - Logger    │
│ request-     │  │ - Draft      │  │   (Pino)    │
│ scoped       │  │ - Context    │  │ - Redis     │
│ containers   │  │ - Calendar   │  │ - Monitoring│
│ (prevents    │  │ - AutoGenDft │  │ - DateParse │
│ data leaks)  │  │ - Promo Email│  │             │
└──────────────┘  └──────────────┘  └─────────────┘
        │
        └────────────┬──────────────────────────────┐
                     │                              │
                ┌────▼───────────────────────────────┐
                │   28 Services (Lazy-Initialized)   │
                ├────────────────────────────────────┤
                │                                    │
                │   Email & Gmail (3)                │
                │   • gmail.ts                       │
                │   • intelligentEmailRouter.ts      │
                │   • semanticSearchService.ts       │
                │                                    │
                │   AI & Responses (4)               │
                │   • ai.ts                          │
                │   • response.ts                    │
                │   • learning.ts                    │
                │   • context.ts                     │
                │                                    │
                │   Calendar & Meeting (7)           │
                │   • calendar.ts                    │
                │   • meetingDetection.ts            │
                │   • meetingPipeline.ts             │
                │   • meetingResponseGenerator.ts    │
                │   • autoScheduling.ts              │
                │   • meetingConfirmation.ts         │
                │   • smartAvailability.ts           │
                │                                    │
                │   Infrastructure (14+)             │
                │   • tokenStorage.ts                │
                │   • webhookRenewal.ts              │
                │   • voiceService.ts                │
                │   • embeddingService.ts            │
                │   • timezone.ts                    │
                │   ... and more                     │
                │                                    │
                └────┬──────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
    ┌────────────────┐   ┌──────────────────┐
    │ Connection Pool│   │  queryWithRetry()│
    │  (Neon Ready)  │   │  (Auto-Retry on  │
    │                │   │   Connection Drop│
    │ - Max 100 conn │   │   - Handles NEON │
    │ - Min 0 warm   │   │     failures)    │
    │ - 10s idle     │   │                  │
    │ - 5s keep-alive│   │                  │
    └────────────────┘   └──────────────────┘
        │
        ▼
    ┌──────────────────────────┐
    │  Neon PostgreSQL         │
    │  (Serverless)            │
    ├──────────────────────────┤
    │  39 Tables:              │
    │  • Emails                │
    │  • Drafts                │
    │  • Calendar Events       │
    │  • User Profiles         │
    │  • OAuth Tokens          │
    │  • Learning Insights     │
    │  • Meeting Pipeline      │
    │  • Webhook Status        │
    │  ... and more            │
    │                          │
    │  5 Critical Indexes:     │
    │  • idx_emails_user_webhook       │
    │  • idx_auto_drafts_user_status   │
    │  • idx_generated_responses_learn │
    │  • idx_edit_analyses_user_type   │
    │  • idx_meeting_processing_email  │
    └──────────────────────────┘
```

---

## Request Flow (Authentication & Service Injection)

```
User Browser
      │
      ├─ OAuth2 Authorization (Google)
      │
      ├─ Receives JWT Token
      │
      └─► Backend Request with JWT
          │
          ├─ SecurityMiddleware
          │  └─ Extract userId from JWT (before auth)
          │  └─ Check per-user rate limit (500 req/15min)
          │
          ├─ authMiddleware.authenticate
          │  └─ Validate JWT signature
          │  └─ Set req.userId
          │
          ├─ Route Handler
          │  │
          │  ├─► ServiceFactory.createFromRequest(req)
          │  │   └─ Creates ServiceContainer(userId)
          │  │      └─ Lazy-initializes services on access
          │  │
          │  ├─ const gmail = await services.getGmailService()
          │  │  └─ Initialize with user's OAuth tokens
          │  │
          │  ├─ const emails = await gmail.fetchEmails()
          │  │  └─ Call Gmail API with user's credentials
          │  │
          │  └─ Response sent to client
```

---

## Request-Scoped Service Container Isolation

```
Concurrent Request A (User alice)        Concurrent Request B (User bob)
│                                        │
├─ ServiceFactory.createFromRequest     ├─ ServiceFactory.createFromRequest
│  └─ ServiceContainer("alice")         │  └─ ServiceContainer("bob")
│                                        │
├─ services.getGmailService()           ├─ services.getGmailService()
│  └─ GmailService (instance A)         │  └─ GmailService (instance B)
│     initializeForUser("alice")        │     initializeForUser("bob")
│     currentUserId = "alice"           │     currentUserId = "bob"
│     accessToken = alice's token       │     accessToken = bob's token
│                                        │
├─ gmail.fetchEmails()                  ├─ gmail.fetchEmails()
│  └─ Fetches alice's emails ✅         │  └─ Fetches bob's emails ✅
│                                        │
└─ Response: alice's emails only        └─ Response: bob's emails only

                    ✅ ZERO DATA LEAKAGE
```

---

## Database Query Resilience (queryWithRetry)

```
queryWithRetry(sql, params, maxRetries=2)
│
├─ Attempt 1
│  │
│  ├─► pool.query(sql, params)
│  │
│  ├─ Success?  → Return result ✅
│  │
│  ├─ Connection Error?
│  │  (ECONNRESET, ECONNREFUSED, ETIMEDOUT, etc.)
│  │
│  └─ If attempt < maxRetries → Retry
│
├─ Attempt 2
│  │
│  ├─► pool.query(sql, params)
│  │
│  ├─ Success?  → Return result ✅
│  │
│  └─ Failure?  → Throw error ❌
│
└─ Result: Resilient to Neon connection drops
```

---

## Frontend Polling Architecture

```
React Component (useEmails hook)
│
├─ Initialize React Query with fixed interval
│  └─ POLLING_CONFIG.FIXED_INTERVAL = 30000ms
│
├─ QueryClient.useQuery({
│     queryKey: ['emails'],
│     queryFn: () => emailService.fetchEmails(),
│     refetchInterval: 30000,      // 30 seconds
│     staleTime: 25000,             // 25 seconds
│     cacheTime: 5 * 60 * 1000      // 5 minutes
│  })
│
├─ Every 30 seconds:
│  │
│  ├─ Check if data is stale (>25s old)
│  │
│  ├─ If stale → Fetch new data
│  │  └─ GET /api/emails (authenticated)
│  │
│  ├─ Update local cache
│  │
│  └─ Re-render component with fresh data
│
└─ Result: ~90 requests/15min per user (within 500 limit)

Gmail Webhooks (Real-time)
│
├─ Gmail Pub/Sub notification arrives
│
├─ Webhook handler processes immediately
│
├─ User sees new emails faster than polling
│
└─ Polling is backup for resilience
```

---

## Meeting Pipeline Flow

```
Email Arrives (Webhook)
│
├─► MeetingDetectionService.detectMeetingRequest(email)
│   └─ AI analysis to identify if meeting request
│      • Parse dates, times, attendees
│      • Extract meeting details
│
├─ Is Meeting Request? 
│  │
│  YES:
│  │
│  ├─► MeetingPipelineService.processRequest()
│  │   │
│  │   ├─ Get user's calendar availability
│  │   │  └─ CalendarService.getAvailability()
│  │   │
│  │   ├─ Generate meeting response
│  │   │  └─ MeetingResponseGenerator.generateResponse()
│  │   │     • Suggest times if conflict
│  │   │     • Provide Calendly link if needed
│  │   │     • Draft professional response
│  │   │
│  │   ├─ Save to AutoGeneratedDraft
│  │   │  └─ User reviews before sending
│  │   │
│  │   ├─ Optional: Auto-schedule if requested
│  │   │  └─ AutoSchedulingService.schedule()
│  │   │
│  │   └─ Send response (after user approval)
│  │
│  NO:
│  │
│  └─► Generate regular email response
│      └─ ResponseService.generateResponse()
│
└─ Draft awaits user approval
   └─ User clicks "Send" → Email sent
```

---

## Service Initialization Sequence

```
ServiceContainer(userId)
│
├─ Constructor validates userId
│
├─ Service Access Pattern (Lazy Initialization)
│
├─ services.getGmailService()
│  │
│  └─ if (!_gmailService) {
│       _gmailService = new GmailService()
│       await _gmailService.initializeForUser(userId)
│     }
│  └─ return _gmailService
│
├─ services.getCalendarService()
│  │
│  └─ if (!_calendarService) {
│       _calendarService = new CalendarService()
│       const credentials = 
│         await TokenStorageService.getDecryptedCredentials(userId)
│       await _calendarService.setStoredTokens(...)
│       await _calendarService.initializeForUser(userId)
│     }
│  └─ return _calendarService
│
├─ services.getAIService()
│  │
│  └─ if (!_aiService) {
│       _aiService = new AIService()  // Stateless, no init
│     }
│  └─ return _aiService
│
└─ Services cached within request lifecycle
   └─ All services isolated to this container
```

---

## Rate Limiting Strategy

```
Request arrives with JWT
│
├─ Extract userId from token
│
├─ Check per-user rate limit bucket:
│  │
│  ├─ General bucket: 500 req/15min ✅ (most routes)
│  ├─ Auth bucket:     10 req/15min ✅ (login, signup)
│  └─ API bucket:     800 req/15min ✅ (read operations)
│
├─ Is limit exceeded?
│  │
│  ├─ YES: Return 429 (Too Many Requests) ❌
│  │
│  └─ NO: Increment counter, proceed ✅
│
├─ Frontend generates ~90 req/15min
│  │
│  └─ Polling every 30s
│     × 3 endpoints (emails, drafts, promotional)
│     × 30 polling cycles per 15 minutes
│     = ~90 requests (well within 500 limit)
│
└─ Per-user isolation prevents thundering herd
```

---

## Logging Pipeline (Pino Integration)

```
Application Code
│
├─ logger.info({...metadata...}, 'logger.event.name')
│
├─ Pino Logger
│  │
│  ├─ Sanitize sensitive data
│  │  └─ Redact tokens, passwords, API keys
│  │
│  ├─ Format based on NODE_ENV
│  │  │
│  │  ├─ Development: Pretty-printed + colors
│  │  │
│  │  └─ Production: Structured JSON
│  │     {
│  │       "level": 30,
│  │       "timestamp": "2025-11-10T05:10:00.000Z",
│  │       "userId": "user_abc123",
│  │       "message": "gmail.emails.fetched",
│  │       "metadata": {...}
│  │     }
│  │
│  ├─ Log Level Filtering
│  │  │
│  │  ├─ LOG_LEVEL=debug → Show all logs
│  │  ├─ LOG_LEVEL=info  → Info, warn, error only
│  │  └─ LOG_LEVEL=error → Error only
│  │
│  └─ Output to stdout (Railway logs)
│     │
│     ├─ Searchable structured format
│     ├─ Automatic data redaction
│     └─ Performance optimized (5x faster than console.log)
│
└─ Result: Audit trail + debugging + no PII in logs
```

---

## Production Deployment Stack

```
┌──────────────────────────────────────────────────────┐
│                    Frontend Layer                    │
├──────────────────────────────────────────────────────┤
│  Vercel (Global CDN)                                 │
│  • React SPA                                         │
│  • Domain: cap-ai-puce.vercel.app                   │
│  • Automatic deployments from git                    │
│  • 30-second polling to backend                      │
└───────────────────┬──────────────────────────────────┘
                    │
                    │ HTTPS (TLS 1.3)
                    │
┌───────────────────┴──────────────────────────────────┐
│                  Backend Layer                       │
├──────────────────────────────────────────────────────┤
│  Railway (Node.js)                                   │
│  • Express server (5,602 lines)                      │
│  • Multi-container setup                            │
│  • Auto-scaling (horizontal)                        │
│  • Health checks + automatic restart                │
└───────────────────┬──────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
┌────────────┐ ┌─────────┐ ┌─────────┐
│   Neon     │ │ Railway │ │  Google │
│PostgreSQL │ │  Redis  │ │ Services│
│(Serverles)│ │ (Cache) │ │         │
│           │ │ (Locks) │ │OAuth2,  │
│ 100 conn  │ │         │ │Calendar,│
│ 39 tables │ │Webhook  │ │Gmail    │
│ 5 indexes │ │dedup    │ │         │
└────────────┘ └─────────┘ └─────────┘
```

---

## Error Recovery Flows

```
Scenario 1: Neon Connection Drop
│
├─ pool.query() fails with ECONNRESET
│
├─ queryWithRetry() catches connection error
│
├─ Retry attempt 1: Reconnect & retry
│
├─ Success? → Return data ✅
│
└─ If fails: Return 503 (Service Unavailable) with graceful message


Scenario 2: Webhook Duplicate
│
├─ Gmail sends duplicate notification
│
├─ Redis acquireLock(key, ttl)
│
├─ Lock already exists? → Skip processing ✅
│
├─ Lock acquired? → Process notification
│
└─ Release lock after processing


Scenario 3: Rate Limit Exceeded
│
├─ User exceeds 500 req/15min
│
├─ Return 429 (Too Many Requests)
│
├─ Retry-After header: X seconds
│
└─ Frontend backs off / shows message


Scenario 4: OAuth Token Expired
│
├─ Gmail API returns 401 Unauthorized
│
├─ Refresh token with refresh_token
│
├─ Update stored token via TokenStorageService
│
├─ Retry original request
│
└─ Success with new token ✅
```

---

## File Organization Summary

```
chief/
├── src/                           [Backend Source]
│   ├── index.ts                   5,602 lines (needs refactoring)
│   ├── config/environment.ts      Configuration & env vars
│   ├── database/connection.ts     Neon pooling + queryWithRetry
│   ├── middleware/
│   │   ├── auth.ts               JWT validation
│   │   └── security.ts           Rate limiting (per-user)
│   ├── models/                    6 models (stateless)
│   ├── routes/                    2 route files (should expand)
│   ├── services/                  28 services (request-scoped)
│   ├── types/                     TypeScript definitions
│   └── utils/                     Utilities (serviceFactory, logger, etc.)
│
├── frontend/                      [React Frontend]
│   ├── src/
│   │   ├── components/            23 component directories
│   │   ├── hooks/                 10 custom React hooks
│   │   ├── pages/                 14 page components
│   │   ├── services/              Backend API integration
│   │   ├── contexts/              React contexts
│   │   ├── types/                 TypeScript types
│   │   ├── lib/constants.ts       Polling configuration
│   │   └── App.tsx                Router & main component
│   └── package.json               React dependencies
│
├── scripts/                       [Utilities]
│   ├── database/                  40+ DB management scripts
│   ├── deployment/                Deployment automation
│   └── monitoring/                Health monitoring
│
├── tests/                         [Integration Tests]
│   ├── integration/               End-to-end tests
│   ├── unit/                      Unit tests
│   └── fixtures/                  Test data
│
├── docs/                          [Documentation]
│   ├── architecture/              System architecture
│   ├── setup/                     Setup instructions
│   └── operations/                Operations guide
│
├── CODEBASE_ANALYSIS.md           This comprehensive analysis
├── QUICK_REFERENCE.md            Quick lookup guide
├── CLAUDE.md                      Project guidelines
└── .env                           Environment variables
```

---

**Architecture Last Updated:** November 10, 2025
**Status:** Production Ready with Minor Improvements Needed
