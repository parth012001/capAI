# Chief AI - Email & Calendar Assistant

An AI-powered executive assistant that manages your email and calendar autonomously. Built for busy professionals who want to automate repetitive communication tasks while maintaining personal control.

## 🎯 What is Chief AI?

Chief AI acts as your personal executive assistant:
- **Reads your incoming emails** automatically via Gmail webhooks
- **Drafts responses** matching your tone and style using AI
- **Handles meeting scheduling** with Google Calendar integration
- **Requires your approval** before sending anything

**Status:** ✅ Production-ready for 10-user launch (85/100 confidence score)

---

## 🚀 Quick Start

### For Developers
```bash
# 1. Clone and install
git clone git@github.com:parth012001/Chief.git
cd Chief
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your credentials

# 3. Start development server
npm run dev
```

**📚 Complete setup guide:** [docs/setup/GMAIL_WEBHOOK_SETUP.md](docs/setup/GMAIL_WEBHOOK_SETUP.md)

### For Operations/DevOps
```bash
# Check webhook configuration
./scripts/update-webhooks.sh status

# Update production webhook URL
./scripts/update-webhooks.sh prod https://your-railway-url.railway.app

# Update development webhook URL (when ngrok restarts)
./scripts/update-webhooks.sh dev https://your-ngrok-url.ngrok-free.app
```

**📚 Complete operations guide:** [docs/operations/WEBHOOK_MANAGEMENT.md](docs/operations/WEBHOOK_MANAGEMENT.md)

---

## 📖 Documentation

**👉 [Complete Documentation Index](docs/README.md)** - Start here for all guides

### Essential Reading

| Document | Purpose | Audience |
|----------|---------|----------|
| **[CLAUDE.md](CLAUDE.md)** | Complete codebase guide with patterns and conventions | All developers |
| **[docs/operations/WEBHOOK_MANAGEMENT.md](docs/operations/WEBHOOK_MANAGEMENT.md)** | Manage prod/dev webhook URLs | DevOps, daily development |
| **[docs/operations/PRODUCTION_READINESS_AUDIT.md](docs/operations/PRODUCTION_READINESS_AUDIT.md)** | Pre-launch checklist (85/100 score) | DevOps, stakeholders |
| **[docs/README.md](docs/README.md)** | Full documentation index | Everyone |

### By Category

- **🛠️ Setup:** [Gmail webhooks](docs/setup/GMAIL_WEBHOOK_SETUP.md), [ngrok configuration](docs/setup/NGROK_URL_UPDATE_GUIDE.md)
- **⚙️ Operations:** [Webhook management](docs/operations/WEBHOOK_MANAGEMENT.md), [production readiness](docs/operations/PRODUCTION_READINESS_AUDIT.md)
- **🏗️ Architecture:** [System design](docs/architecture/PLAN.md), [frontend structure](docs/architecture/frontend.md)
- **💻 Development:** [Feature flags](docs/development/FEATURE_FLAGS_IMPLEMENTATION.md), [logging migration](docs/development/LOGGING_MIGRATION_COMPLETE.md), [testing](docs/development/TESTING.md)

---

## 🛠 Tech Stack

- **Backend:** Node.js + TypeScript + Express
- **Database:** PostgreSQL (Neon serverless) with pgvector for semantic search
- **AI:** OpenAI/Anthropic for draft generation and classification
- **Frontend:** React + Vite + TailwindCSS
- **Deployment:** Railway (backend) + Vercel (frontend)
- **Webhooks:** Google Cloud Pub/Sub for Gmail notifications

---

## 🌟 Features

### ✅ Production Features
- Real-time Gmail webhook processing
- AI-powered email classification (meeting vs regular)
- Intelligent email routing (meeting pipeline vs auto-draft)
- Smart response generation matching user's tone
- Google Calendar integration with availability detection
- Meeting scheduling with conflict resolution
- Auto-generated drafts requiring user approval
- Learning system that improves from user edits

### 🚧 Coming Soon (Feature Flagged)
- Voice search for emails
- Semantic search with vector embeddings
- Microsoft Outlook/Office 365 integration

---

## 📊 System Status

**Last Updated:** 2025-10-18

| Component | Status | Details |
|-----------|--------|---------|
| Production Readiness | ✅ Ready | 85/100 confidence score for 10-user launch |
| Database Performance | ✅ Optimized | 5 critical indexes, 20-100x speedup |
| Security | ✅ Verified | 50+ protected routes, rate limiting, JWT auth |
| Logging | ✅ Enterprise-grade | Pino structured logs, 60% noise reduction |
| Webhook System | ✅ Configured | Prod (Railway) + Dev (ngrok) independent |
| Error Handling | ✅ Robust | 52+ try-catch blocks, queryWithRetry pattern |

---

## 🔑 Key Technical Patterns

### ServiceFactory Pattern
Request-scoped dependency injection prevents race conditions in multi-user scenarios.
```typescript
// ✅ CORRECT - Request-scoped
const services = ServiceFactory.createFromRequest(req);
const gmail = await services.getGmailService();

// ❌ WRONG - Global singleton (causes data leakage)
const gmailService = new GmailService();
```

### Database Queries with Retry
Always use `queryWithRetry()` for Neon PostgreSQL reliability.
```typescript
// ✅ CORRECT - Auto-retries on connection errors
const result = await queryWithRetry('SELECT * FROM emails WHERE user_id = $1', [userId]);

// ❌ WRONG - Will crash on Neon connection drop
const result = await pool.query('SELECT * FROM emails WHERE user_id = $1', [userId]);
```

**📚 See [CLAUDE.md](CLAUDE.md) for complete pattern documentation**

---

## 🚦 Development Commands

```bash
# Development
npm run dev                    # Start development server with hot-reload
npm run build                  # Compile TypeScript to dist/
npm start                      # Run compiled production build

# Database Operations
npm run db:migrate             # Run database migrations
npm run db:push                # Push schema changes to database
npm run db:studio              # Open Drizzle Studio for database GUI

# Testing
npm test                       # Run Jest test suite
npm run test:24-7              # Run all integration tests
npm run test:webhooks          # Test webhook scenarios
npm run test:api               # Test user experience flows

# Webhook Management
./scripts/update-webhooks.sh status        # Check current webhook URLs
./scripts/update-webhooks.sh prod <url>    # Update production URL
./scripts/update-webhooks.sh dev <url>     # Update development URL
```

---

## 🔐 Environment Variables

Required variables (see `.env.example`):
```env
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
```env
REDIS_URL=redis://...                     # Webhook deduplication
WEBHOOK_SECRET=...                        # Gmail webhook verification
```

---

## 🚨 Common Issues & Solutions

### "Connection terminated due to connection timeout"
**Fixed:** All database queries now use `queryWithRetry()` pattern. See [CLAUDE.md](CLAUDE.md#database-connection-neon-serverless)

### "Webhooks not arriving in development"
1. Check ngrok is running: `curl https://YOUR-NGROK-URL.ngrok-free.app/health`
2. Update dev webhook: `./scripts/update-webhooks.sh dev https://YOUR-NGROK-URL.ngrok-free.app`
3. See [docs/operations/WEBHOOK_MANAGEMENT.md](docs/operations/WEBHOOK_MANAGEMENT.md)

### "Production webhooks stopped working"
1. Check Railway deployment status
2. Verify webhook URL: `./scripts/update-webhooks.sh status`
3. See [docs/operations/WEBHOOK_MANAGEMENT.md](docs/operations/WEBHOOK_MANAGEMENT.md)

---

## 🤝 Contributing

1. Read [CLAUDE.md](CLAUDE.md) for coding patterns and conventions
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Follow ServiceFactory pattern and use `queryWithRetry()` for queries
4. Run tests: `npm test`
5. Update documentation if needed
6. Submit Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support

- **Documentation:** [docs/README.md](docs/README.md)
- **Codebase Guide:** [CLAUDE.md](CLAUDE.md)
- **Operations Guide:** [docs/operations/WEBHOOK_MANAGEMENT.md](docs/operations/WEBHOOK_MANAGEMENT.md)
- **Architecture:** [docs/architecture/PLAN.md](docs/architecture/PLAN.md)

---

*Built for busy professionals who want to reclaim their time while maintaining control over their communications.*

**Deployment:** Railway (backend) + Vercel (frontend)
**Status:** Production-ready for 10-user launch ✅
