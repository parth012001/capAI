-- Migration: Add missing constraints to user_gmail_tokens table
-- This fixes the "no unique or exclusion constraint matching ON CONFLICT" error

-- Add PRIMARY KEY constraint (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_gmail_tokens_pkey'
        AND conrelid = 'user_gmail_tokens'::regclass
    ) THEN
        ALTER TABLE user_gmail_tokens ADD CONSTRAINT user_gmail_tokens_pkey PRIMARY KEY (user_id);
        RAISE NOTICE '✅ Added PRIMARY KEY constraint on user_id';
    ELSE
        RAISE NOTICE 'ℹ️  PRIMARY KEY already exists';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'PRIMARY KEY: %', SQLERRM;
END $$;

-- Add UNIQUE constraint on gmail_address (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_gmail_tokens_gmail_address_key'
        AND conrelid = 'user_gmail_tokens'::regclass
    ) THEN
        ALTER TABLE user_gmail_tokens ADD CONSTRAINT user_gmail_tokens_gmail_address_key UNIQUE (gmail_address);
        RAISE NOTICE '✅ Added UNIQUE constraint on gmail_address';
    ELSE
        RAISE NOTICE 'ℹ️  UNIQUE constraint already exists';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'UNIQUE constraint: %', SQLERRM;
END $$;
