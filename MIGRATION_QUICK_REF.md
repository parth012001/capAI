# Composio Migration - Quick Reference

**Status:** ✅ Composio tested and ready. Dual system in place.

---

## 📍 Where We Are

```
Current: Google OAuth for Gmail/Calendar (PRODUCTION)
New:     Composio for Gmail/Calendar (TESTED, READY)
Goal:    Migrate from Google OAuth → Composio for all operations
Keep:    Google OAuth ONLY for user sign-in
```

---

## 🎯 What Needs to Change

### Files to Update
1. **`src/index.ts`** (478 lines) - Main webhook handler
   - Replace `gmail.fetchEmails()` → `composioService.fetchEmails()`
   - Replace `gmail.sendEmail()` → `composioService.sendEmail()`

2. **`src/services/gmail.ts`** - Gmail operations
   - Wrap with Composio or deprecate

3. **`src/services/calendar.ts`** - Calendar operations
   - Wrap with Composio or deprecate

4. **`src/services/webhookRenewal.ts`** - Webhook management
   - Replace Google Pub/Sub → Composio triggers

---

## ✅ What STAYS the Same

- ✅ Google OAuth for **user sign-in ONLY**
- ✅ JWT authentication flow
- ✅ ServiceFactory pattern (user isolation)
- ✅ Database schema (already has Composio columns)
- ✅ Frontend auth pages

---

## 🔄 Migration Strategy

### Step 1: Abstraction Layer (Week 1-2)
```typescript
interface IEmailProvider {
  fetchEmails(userId, params): Promise<any>;
  sendEmail(userId, params): Promise<any>;
}

const provider = process.env.USE_COMPOSIO === 'true'
  ? new ComposioEmailProvider()
  : new GoogleEmailProvider();
```

### Step 2: Update Pipeline (Week 2-3)
```typescript
// src/index.ts
const emailProvider = getEmailProvider();
const emails = await emailProvider.fetchEmails(userId, params);
```

### Step 3: Gradual Rollout (Week 4-6)
- 10% users → Monitor → 25% → 50% → 100%
- Feature flag controls which system is used

### Step 4: Webhook Migration (Week 5-7)
- Add Composio webhook endpoint
- Run both systems in parallel
- Gradually migrate users

### Step 5: Cleanup (Week 8)
- Deprecate Google OAuth code
- Archive old code

---

## 🧪 Testing

**Test Page:** http://localhost:5173/integrations/test

**Already Verified:**
- ✅ All Composio operations work
- ✅ User isolation (no data leakage)
- ✅ Database operations correct
- ✅ TypeScript compiles
- ✅ Real user tested (p.ahiir01@gmail.com)

---

## 🚨 Critical Points

### User Isolation is GUARANTEED
```
JWT Token → Auth Middleware → req.userId → ServiceFactory → Provider → API
```
Both systems use same isolation pattern - no data leakage possible.

### Both Systems Can Coexist
- Google OAuth tokens in `user_gmail_tokens.access_token`
- Composio tokens in Composio's system (via `composio_connected_account_id`)
- Feature flag switches between them
- Can rollback instantly

### Rollback is Instant
```bash
export USE_COMPOSIO=false
npm run dev  # restart backend
# Done - back to Google OAuth
```

---

## 📊 Key Differences

| Feature | Google OAuth | Composio |
|---------|--------------|----------|
| Token Storage | Our database | Composio's system |
| Token Refresh | We handle | They handle |
| Webhook Renewal | 7 days, we manage | Automatic |
| Error Handling | Custom | Built-in |
| Scope Management | Manual | Automatic |

---

## 📂 File Reference

### Ready to Use ✅
- `src/services/composio.ts` - All methods working
- `src/routes/composio.routes.ts` - Test endpoints ready
- `frontend/src/pages/ComposioTestPage.tsx` - Test UI ready

### Need to Update ⚠️
- `src/index.ts` - Webhook handler (main pipeline)
- `src/services/gmail.ts` - Gmail operations
- `src/services/calendar.ts` - Calendar operations
- `src/services/webhookRenewal.ts` - Webhook lifecycle

### Keep As-Is ✅
- `src/middleware/auth.ts` - JWT auth
- `src/utils/serviceFactory.ts` - DI pattern
- `src/database/connection.ts` - DB connection

---

## 🎯 Next Steps

1. **Read:** `COMPOSIO_MIGRATION_HANDOFF.md` (complete details)
2. **Test:** Run test page to see Composio working
3. **Design:** Abstraction layer (IEmailProvider)
4. **Implement:** Provider pattern in src/index.ts
5. **Test:** Feature flag switching
6. **Deploy:** Gradual rollout with monitoring

---

## 📞 Quick Links

- **Full Handoff:** `COMPOSIO_MIGRATION_HANDOFF.md`
- **Testing Guide:** `COMPOSIO_TESTING_GUIDE.md`
- **API Fix Details:** `COMPOSIO_API_FIX_SUMMARY.md`
- **Quick Test:** `QUICK_TEST_GUIDE.md`
- **Architecture:** `CLAUDE.md`

---

**Timeline:** 6-8 weeks for complete, safe migration
**Risk:** LOW (both systems work, instant rollback)
**Status:** Ready to begin implementation
