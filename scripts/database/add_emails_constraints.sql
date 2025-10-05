-- Migration: Add missing constraints to emails and promotional_emails tables
-- Fixes "no unique or exclusion constraint matching ON CONFLICT" error for email processing

-- Add PRIMARY KEY to emails table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'emails_pkey'
        AND conrelid = 'emails'::regclass
    ) THEN
        ALTER TABLE emails ADD CONSTRAINT emails_pkey PRIMARY KEY (id);
        RAISE NOTICE '✅ Added PRIMARY KEY constraint on emails.id';
    ELSE
        RAISE NOTICE 'ℹ️  PRIMARY KEY on emails already exists';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'emails PRIMARY KEY: %', SQLERRM;
END $$;

-- Add UNIQUE constraint on (gmail_id, user_id) for emails table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'emails_gmail_id_user_id_key'
        AND conrelid = 'emails'::regclass
    ) THEN
        ALTER TABLE emails ADD CONSTRAINT emails_gmail_id_user_id_key UNIQUE (gmail_id, user_id);
        RAISE NOTICE '✅ Added UNIQUE constraint on emails(gmail_id, user_id)';
    ELSE
        RAISE NOTICE 'ℹ️  UNIQUE constraint on emails(gmail_id, user_id) already exists';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'emails UNIQUE constraint: %', SQLERRM;
END $$;

-- Add PRIMARY KEY to promotional_emails table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'promotional_emails_pkey'
        AND conrelid = 'promotional_emails'::regclass
    ) THEN
        ALTER TABLE promotional_emails ADD CONSTRAINT promotional_emails_pkey PRIMARY KEY (id);
        RAISE NOTICE '✅ Added PRIMARY KEY constraint on promotional_emails.id';
    ELSE
        RAISE NOTICE 'ℹ️  PRIMARY KEY on promotional_emails already exists';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'promotional_emails PRIMARY KEY: %', SQLERRM;
END $$;

-- Add UNIQUE constraint on (gmail_id, user_id) for promotional_emails table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'promotional_emails_gmail_id_user_id_key'
        AND conrelid = 'promotional_emails'::regclass
    ) THEN
        ALTER TABLE promotional_emails ADD CONSTRAINT promotional_emails_gmail_id_user_id_key UNIQUE (gmail_id, user_id);
        RAISE NOTICE '✅ Added UNIQUE constraint on promotional_emails(gmail_id, user_id)';
    ELSE
        RAISE NOTICE 'ℹ️  UNIQUE constraint on promotional_emails(gmail_id, user_id) already exists';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'promotional_emails UNIQUE constraint: %', SQLERRM;
END $$;
