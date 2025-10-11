# Vector Database Setup Instructions

## ⚠️ IMPORTANT: Run on Neon Database

Your local PostgreSQL doesn't have pgvector installed. You need to run these commands on **Neon's SQL Editor**.

## Step 1: Access Neon SQL Editor

1. Go to https://console.neon.tech
2. Select your project: `chief_ai` (or whatever your project is named)
3. Click on "SQL Editor" in the left sidebar
4. Make sure you're connected to your production database

## Step 2: Run These SQL Commands

Copy and paste these commands **one at a time** into the Neon SQL Editor:

### Command 1: Enable pgvector Extension
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```
✅ Expected output: `CREATE EXTENSION` or message saying it already exists

---

### Command 2: Add Embedding Column to Emails Table
```sql
ALTER TABLE emails
ADD COLUMN IF NOT EXISTS embedding vector(1536);
```
✅ Expected output: `ALTER TABLE`

---

### Command 3: Add Embedding Column to Promotional Emails
```sql
ALTER TABLE promotional_emails
ADD COLUMN IF NOT EXISTS embedding vector(1536);
```
✅ Expected output: `ALTER TABLE`

---

### Command 4: Create Index on Emails Embeddings
```sql
CREATE INDEX IF NOT EXISTS emails_embedding_idx
ON emails (embedding)
WHERE embedding IS NOT NULL;
```
✅ Expected output: `CREATE INDEX`

---

### Command 5: Create Index on Promotional Emails Embeddings
```sql
CREATE INDEX IF NOT EXISTS promotional_emails_embedding_idx
ON promotional_emails (embedding)
WHERE embedding IS NOT NULL;
```
✅ Expected output: `CREATE INDEX`

---

## Step 3: Verify Setup

Run this query to confirm everything worked:

```sql
-- Check pgvector extension
SELECT extname, extversion
FROM pg_extension
WHERE extname = 'vector';

-- Check new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'emails' AND column_name = 'embedding';

-- Count emails without embeddings
SELECT COUNT(*) as emails_without_embeddings
FROM emails
WHERE embedding IS NULL;
```

---

## What This Does

1. **pgvector Extension**: Enables vector data type in PostgreSQL
2. **Embedding Columns**: Adds 1536-dimensional vector columns (OpenAI's embedding size)
3. **Indexes**: Creates indexes for fast similarity search

## Next Steps (After Running on Neon)

Once you've successfully run these commands on Neon:

1. Update your Drizzle schema: `npm run db:introspect`
2. Generate embeddings for your 435 existing emails
3. Create semantic search API endpoints

---

## 🆘 Troubleshooting

**If you get "extension vector is not available":**
- Contact Neon support - they should enable pgvector for your project
- Or check Neon docs: https://neon.com/docs/extensions/pgvector

**If you get "permission denied":**
- Make sure you're running as the database owner/admin
- Check your Neon user has CREATE extension privileges
