# Chief AI Documentation

Welcome to Chief AI's technical documentation. This directory contains all guides, architecture decisions, and operational procedures.

## 📁 Documentation Structure

```
docs/
├── setup/              # Initial setup and configuration
├── operations/         # Day-to-day operational guides
├── architecture/       # System design and technical decisions
└── development/        # Development workflows and migrations
```

---

## 🚀 Quick Start Guides

### For New Developers
1. [CLAUDE.md](../CLAUDE.md) - **START HERE** - Complete codebase guide for Claude Code
2. [Setup: Gmail Webhook](setup/GMAIL_WEBHOOK_SETUP.md) - Configure Gmail Push notifications
3. [Setup: ngrok URL Updates](setup/NGROK_URL_UPDATE_GUIDE.md) - Local development setup

### For Operations/DevOps
1. [Webhook Management](operations/WEBHOOK_MANAGEMENT.md) - Manage prod/dev webhook URLs
2. [Production Readiness](operations/PRODUCTION_READINESS_AUDIT.md) - Pre-launch checklist (85/100 score)

### For Frontend Developers
1. [Frontend Architecture](architecture/frontend.md) - React app structure
2. [Project README](../frontend/README.md) - Frontend setup and development

---

## 📚 Documentation by Category

### 🛠️ Setup & Configuration

| Document | Description | When to Use |
|----------|-------------|-------------|
| [Gmail Webhook Setup](setup/GMAIL_WEBHOOK_SETUP.md) | Configure Google Cloud Pub/Sub for Gmail notifications | First-time setup |
| [ngrok URL Updates](setup/NGROK_URL_UPDATE_GUIDE.md) | Update webhook URLs for local development | When ngrok restarts |

### ⚙️ Operations & Maintenance

| Document | Description | When to Use |
|----------|-------------|-------------|
| [Webhook Management](operations/WEBHOOK_MANAGEMENT.md) | **CRITICAL** - Manage production/development webhook URLs | Daily development, before launch |
| [Production Readiness Audit](operations/PRODUCTION_READINESS_AUDIT.md) | Comprehensive production assessment (85/100) | Before launch, quarterly reviews |

### 🏗️ Architecture & Design

| Document | Description | When to Use |
|----------|-------------|-------------|
| [System Architecture Plan](architecture/PLAN.md) | Overall system design and roadmap | Understanding system structure |
| [Frontend Architecture](architecture/frontend.md) | React app structure and patterns | Frontend development |
| [Microsoft Integration Strategy](architecture/MICROSOFT_INTEGRATION_STRATEGY.md) | Future Outlook/Office 365 integration plan | Feature planning |

### 💻 Development Workflows

| Document | Description | When to Use |
|----------|-------------|-------------|
| [Feature Flags Implementation](development/FEATURE_FLAGS_IMPLEMENTATION.md) | How voice/search features are disabled | Re-enabling features |
| [Logging Migration](development/LOGGING_MIGRATION_COMPLETE.md) | Pino structured logging implementation | Understanding logs |
| [Testing Guide](development/TESTING.md) | Manual and automated testing procedures | QA and testing |

---

## 🎯 Common Tasks

### I want to...

**...deploy to production**
1. Read [Production Readiness Audit](operations/PRODUCTION_READINESS_AUDIT.md)
2. Update production webhook URL: [Webhook Management](operations/WEBHOOK_MANAGEMENT.md)
3. Run health checks and verify deployment

**...work on local development**
1. Start ngrok: `ngrok http 3000`
2. Update dev webhook: `./scripts/update-webhooks.sh dev https://YOUR-NGROK-URL.ngrok-free.app`
3. Reference: [Webhook Management](operations/WEBHOOK_MANAGEMENT.md)

**...understand the codebase**
1. Read [CLAUDE.md](../CLAUDE.md) - Complete guide with patterns and conventions
2. Check [Frontend Architecture](architecture/frontend.md) for React structure
3. Review [System Architecture](architecture/PLAN.md) for overall design

**...add a new feature**
1. Read [CLAUDE.md](../CLAUDE.md) for coding patterns (ServiceFactory, queryWithRetry, etc.)
2. Check [Feature Flags](development/FEATURE_FLAGS_IMPLEMENTATION.md) for feature toggle pattern
3. Follow [Testing Guide](development/TESTING.md) for QA

**...debug webhook issues**
1. Check webhook status: `./scripts/update-webhooks.sh status`
2. Review [Webhook Management](operations/WEBHOOK_MANAGEMENT.md) troubleshooting section
3. Check [Gmail Webhook Setup](setup/GMAIL_WEBHOOK_SETUP.md) for configuration

**...review system health**
1. Read [Production Readiness Audit](operations/PRODUCTION_READINESS_AUDIT.md) - Last audit: 85/100
2. Check database performance indexes (20-100x speedup documented)
3. Verify no N+1 queries, proper error handling, memory leak prevention

---

## 📊 System Status

**Last Updated:** 2025-10-18

| Area | Status | Score | Notes |
|------|--------|-------|-------|
| Production Readiness | ✅ Ready | 85/100 | Safe for 10-user launch |
| Database Performance | ✅ Optimized | 100x speedup | 5 critical indexes deployed |
| Security | ✅ Verified | 50+ routes protected | Rate limiting, JWT auth |
| Logging | ✅ Enterprise-grade | Pino structured logs | Privacy-compliant, 60% noise reduction |
| Webhook System | ✅ Configured | Prod/Dev separated | Railway + ngrok independent |
| Feature Flags | ✅ Implemented | Voice/Search disabled | Easy re-enable in 5 minutes |

---

## 🔑 Key Concepts

### ServiceFactory Pattern
All services must be request-scoped to prevent race conditions. See [CLAUDE.md](../CLAUDE.md#service-factory-pattern-critical)

### Database Queries
Always use `queryWithRetry()` for Neon PostgreSQL reliability. See [CLAUDE.md](../CLAUDE.md#database-connection-neon-serverless)

### Webhook Subscriptions
- **Production:** `gmail-notifications-sub` → Railway
- **Development:** `gmail-notifications-dev` → ngrok
- See [Webhook Management](operations/WEBHOOK_MANAGEMENT.md)

---

## 📞 Support & Contributing

### Getting Help
- Check relevant documentation above
- Review [CLAUDE.md](../CLAUDE.md) for coding patterns
- Run `./scripts/update-webhooks.sh status` for webhook issues

### Documentation Guidelines
- **Setup docs** → Initial configuration (one-time tasks)
- **Operations docs** → Day-to-day procedures (recurring tasks)
- **Architecture docs** → Design decisions and system structure
- **Development docs** → Implementation details and migrations

### Updating Documentation
When making significant changes:
1. Update relevant docs in this directory
2. Update [CLAUDE.md](../CLAUDE.md) if changing core patterns
3. Add entry to this README if creating new docs
4. Keep [Production Readiness Audit](operations/PRODUCTION_READINESS_AUDIT.md) current

---

## 🗺️ Roadmap

See [architecture/PLAN.md](architecture/PLAN.md) for system roadmap and future features.

**Completed:**
- ✅ Email ingestion and processing
- ✅ AI-powered draft generation
- ✅ Calendar integration
- ✅ Meeting pipeline
- ✅ Webhook system
- ✅ Production-ready logging
- ✅ Feature flag system

**In Progress:**
- Voice search (disabled via feature flags)
- Semantic search (disabled via feature flags)
- Microsoft integration (planned)

---

**Last Review:** 2025-10-18
**Next Review:** Before production scale-up (50+ users)
