-- COMPREHENSIVE MIGRATION: Add ALL missing constraints to ALL tables
-- Fixes "no unique or exclusion constraint matching ON CONFLICT" errors across the system

-- 1. availability_cache
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'availability_cache_pkey' AND conrelid = 'availability_cache'::regclass) THEN
        ALTER TABLE availability_cache ADD CONSTRAINT availability_cache_pkey PRIMARY KEY (id);
        RAISE NOTICE '✅ Added PRIMARY KEY to availability_cache.id';
    END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'availability_cache PK: %', SQLERRM;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'availability_cache_date_key_calendar_id_key' AND conrelid = 'availability_cache'::regclass) THEN
        ALTER TABLE availability_cache ADD CONSTRAINT availability_cache_date_key_calendar_id_key UNIQUE (date_key, calendar_id);
        RAISE NOTICE '✅ Added UNIQUE to availability_cache(date_key, calendar_id)';
    END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'availability_cache UNIQUE: %', SQLERRM;
END $$;

-- 2. calendar_events
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calendar_events_pkey' AND conrelid = 'calendar_events'::regclass) THEN
        ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);
        RAISE NOTICE '✅ Added PRIMARY KEY to calendar_events.id';
    END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'calendar_events PK: %', SQLERRM;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calendar_events_google_event_id_key' AND conrelid = 'calendar_events'::regclass) THEN
        ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_google_event_id_key UNIQUE (google_event_id);
        RAISE NOTICE '✅ Added UNIQUE to calendar_events.google_event_id';
    END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'calendar_events UNIQUE: %', SQLERRM;
END $$;

-- 3. email_threads
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_threads_pkey' AND conrelid = 'email_threads'::regclass) THEN
        ALTER TABLE email_threads ADD CONSTRAINT email_threads_pkey PRIMARY KEY (id);
        RAISE NOTICE '✅ Added PRIMARY KEY to email_threads.id';
    END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'email_threads PK: %', SQLERRM;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_threads_thread_id_key' AND conrelid = 'email_threads'::regclass) THEN
        ALTER TABLE email_threads ADD CONSTRAINT email_threads_thread_id_key UNIQUE (thread_id);
        RAISE NOTICE '✅ Added UNIQUE to email_threads.thread_id';
    END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'email_threads UNIQUE: %', SQLERRM;
END $$;

-- 4. extracted_entities
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'extracted_entities_pkey' AND conrelid = 'extracted_entities'::regclass) THEN
        ALTER TABLE extracted_entities ADD CONSTRAINT extracted_entities_pkey PRIMARY KEY (id);
        RAISE NOTICE '✅ Added PRIMARY KEY to extracted_entities.id';
    END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'extracted_entities PK: %', SQLERRM;
END $$;

-- 5. meeting_requests
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meeting_requests_pkey' AND conrelid = 'meeting_requests'::regclass) THEN
        ALTER TABLE meeting_requests ADD CONSTRAINT meeting_requests_pkey PRIMARY KEY (id);
        RAISE NOTICE '✅ Added PRIMARY KEY to meeting_requests.id';
    END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'meeting_requests PK: %', SQLERRM;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meeting_requests_email_id_user_id_key' AND conrelid = 'meeting_requests'::regclass) THEN
        ALTER TABLE meeting_requests ADD CONSTRAINT meeting_requests_email_id_user_id_key UNIQUE (email_id, user_id);
        RAISE NOTICE '✅ Added UNIQUE to meeting_requests(email_id, user_id)';
    END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'meeting_requests UNIQUE: %', SQLERRM;
END $$;

-- 6. meeting_processing_results
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meeting_processing_results_pkey' AND conrelid = 'meeting_processing_results'::regclass) THEN
        ALTER TABLE meeting_processing_results ADD CONSTRAINT meeting_processing_results_pkey PRIMARY KEY (id);
        RAISE NOTICE '✅ Added PRIMARY KEY to meeting_processing_results.id';
    END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'meeting_processing_results PK: %', SQLERRM;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meeting_processing_results_email_db_id_user_id_key' AND conrelid = 'meeting_processing_results'::regclass) THEN
        ALTER TABLE meeting_processing_results ADD CONSTRAINT meeting_processing_results_email_db_id_user_id_key UNIQUE (email_db_id, user_id);
        RAISE NOTICE '✅ Added UNIQUE to meeting_processing_results(email_db_id, user_id)';
    END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'meeting_processing_results UNIQUE: %', SQLERRM;
END $$;

-- 7. sent_emails
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sent_emails_pkey' AND conrelid = 'sent_emails'::regclass) THEN
        ALTER TABLE sent_emails ADD CONSTRAINT sent_emails_pkey PRIMARY KEY (id);
        RAISE NOTICE '✅ Added PRIMARY KEY to sent_emails.id';
    END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'sent_emails PK: %', SQLERRM;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sent_emails_gmail_id_key' AND conrelid = 'sent_emails'::regclass) THEN
        ALTER TABLE sent_emails ADD CONSTRAINT sent_emails_gmail_id_key UNIQUE (gmail_id);
        RAISE NOTICE '✅ Added UNIQUE to sent_emails.gmail_id';
    END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'sent_emails UNIQUE: %', SQLERRM;
END $$;
