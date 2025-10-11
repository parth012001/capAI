-- Phase 1 & 2: Enable pgvector and add vector columns for semantic search
-- Run this SQL on your Neon database

-- Step 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Add embedding column to emails table
-- Using 1536 dimensions for OpenAI text-embedding-3-small model
ALTER TABLE emails
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Step 3: Add embedding column to promotional_emails table
ALTER TABLE promotional_emails
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Step 4: Create basic indexes for vector columns
-- Note: Advanced vector indexes (ivfflat/hnsw) will be added after we populate some data
CREATE INDEX IF NOT EXISTS emails_embedding_idx
ON emails (embedding)
WHERE embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS promotional_emails_embedding_idx
ON promotional_emails (embedding)
WHERE embedding IS NOT NULL;
