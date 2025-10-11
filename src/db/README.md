# Drizzle ORM Setup

This directory contains the Drizzle ORM configuration and generated schema for the Chief AI application.

## Directory Structure

```
src/db/
├── client.ts           # Drizzle database client (connection pool + schema)
├── migrations/         # Auto-generated from database introspection
│   ├── schema.ts      # All table definitions
│   ├── relations.ts   # Table relationships
│   └── *.sql          # SQL migration files
├── test-connection.ts # Test script for verifying setup
└── README.md          # This file
```

## Quick Start

### Testing the Connection

Run the test script to verify everything is working:

```bash
npx tsx src/db/test-connection.ts
```

### Using the Client

Import the database client in your code:

```typescript
import { db, user_profiles, emails } from './db/client';
import { eq, and, desc } from 'drizzle-orm';

// Example: Query user profiles
const users = await db.select().from(user_profiles).where(
  eq(user_profiles.user_id, 'some-user-id')
);

// Example: Insert data
const newUser = await db.insert(user_profiles).values({
  user_id: 'new-user-123',
  display_name: 'John Doe',
  usage_current: 0,
  usage_limit: 1000,
}).returning();

// Example: Update data
await db.update(user_profiles)
  .set({ usage_current: 10 })
  .where(eq(user_profiles.user_id, 'user-123'));

// Example: Join with relations
const emailsWithProfiles = await db.query.emails.findMany({
  with: {
    sender_profile: true,
  },
  limit: 10,
});
```

## Migration Strategy

We're using a **parallel mode** migration approach:

1. **Phase 1 (Current)**: Setup & Foundation ✅
   - Installed Drizzle ORM
   - Generated schema from existing database
   - Created database client

2. **Phase 2 (Next)**: Pilot Migration
   - Migrate 2-3 small model files
   - Run side-by-side with existing `pg` queries
   - Verify functionality

3. **Phases 3-6**: Gradual rollout across all services

## Key Features

- **Type Safety**: Full TypeScript type inference for all queries
- **Connection Pooling**: Automatic connection management (max 20 connections)
- **Relations**: Automatic joins using `.with()` syntax
- **Performance**: Compiled queries with minimal overhead
- **Schema Sync**: Auto-generated from actual database structure

## Useful Commands

```bash
# Introspect database (regenerate schema from current DB)
npm run db:introspect

# Generate migrations from schema changes
npm run db:generate

# Push schema changes to database
npm run db:push

# Open Drizzle Studio (GUI for browsing data)
npm run db:studio
```

## Converting from `pg` to Drizzle

### Before (with `pg`):
```typescript
const result = await pool.query(
  'SELECT * FROM user_profiles WHERE user_id = $1',
  [userId]
);
const user = result.rows[0];
```

### After (with Drizzle):
```typescript
const [user] = await db.select().from(user_profiles).where(
  eq(user_profiles.user_id, userId)
);
```

Benefits:
- ✅ Type-safe: TypeScript knows the shape of `user`
- ✅ No SQL injection risk
- ✅ Auto-complete for column names
- ✅ Compile-time error checking
