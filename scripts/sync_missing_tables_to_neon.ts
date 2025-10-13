/**
 * Sync missing tables from local to Neon
 * Only creates the 8 tables that exist locally but not on Neon
 */

import { Pool } from 'pg';

const neonPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_ilnjXht8p4zK@ep-empty-feather-adpyzdiz-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
});

async function syncMissingTables() {
  console.log('🚀 Syncing missing tables to Neon...\n');

  try {
    // Create the 8 missing tables
    const statements = [
      `
      CREATE TABLE IF NOT EXISTS active_webhook_users (
        user_id varchar(255),
        gmail_address varchar(255),
        refresh_token_encrypted text,
        access_token_encrypted text,
        access_token_expires_at timestamp,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS available_time_slots (
        date timestamp,
        availability_status text,
        meeting_count bigint,
        existing_meetings jsonb[]
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS meeting_patterns_analysis (
        pattern_type varchar(100),
        frequency integer,
        success_rate numeric(5, 2),
        confidence numeric(5, 2),
        pattern_data jsonb,
        recommendation_level text,
        last_used timestamp with time zone,
        created_at timestamp with time zone DEFAULT now()
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS meeting_pipeline_analytics (
        user_id varchar(100),
        processing_date date,
        emails_processed bigint,
        meetings_detected bigint,
        detection_rate numeric,
        avg_processing_time numeric,
        error_count bigint,
        skipped_count bigint
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS pending_meeting_confirmations (
        id varchar(255) PRIMARY KEY,
        draft_id varchar(255),
        meeting_request_id integer,
        user_id varchar(255),
        selected_time_slot jsonb,
        status varchar(50) DEFAULT 'pending',
        created_at timestamp with time zone DEFAULT now(),
        subject text,
        sender_email varchar(255),
        preferred_dates jsonb,
        requested_duration integer,
        location_preference text,
        special_requirements text
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS user_learning_insights (
        user_id varchar(255),
        pattern_type varchar(50),
        pattern_value varchar(100),
        frequency integer,
        success_rate numeric(5, 2),
        recommendation text,
        confidence integer,
        last_updated timestamp DEFAULT now(),
        created_at timestamp DEFAULT now()
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS validated_learning_insights (
        id serial PRIMARY KEY,
        pattern_type varchar(50),
        pattern_value varchar(100),
        frequency integer,
        success_rate numeric(5, 2),
        recommendation text,
        confidence integer,
        sample_size integer,
        time_span_days integer,
        threshold_met boolean,
        validation_status text,
        created_at timestamp DEFAULT now(),
        last_updated timestamp DEFAULT now()
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS validated_learning_insights_with_stability (
        id serial PRIMARY KEY,
        pattern_type varchar(50),
        pattern_value varchar(100),
        frequency integer,
        success_rate numeric(5, 2),
        recommendation text,
        confidence integer,
        sample_size integer,
        time_span_days integer,
        threshold_met boolean,
        stability_score numeric(5, 3),
        pattern_variance numeric(8, 3),
        stability_validated boolean,
        pattern_drift_detected boolean,
        validation_status text,
        created_at timestamp DEFAULT now(),
        last_updated timestamp DEFAULT now()
      )
      `
    ];

    for (let i = 0; i < statements.length; i++) {
      console.log(`[${i + 1}/${statements.length}] Creating table...`);
      try {
        await neonPool.query(statements[i]);
        console.log('   ✅ Success\n');
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          console.log('   ⚠️  Already exists (skipping)\n');
        } else {
          throw error;
        }
      }
    }

    console.log('✅ All 8 missing tables created on Neon!\n');

    // Verify
    const tableCheck = await neonPool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log(`📊 Total tables on Neon: ${tableCheck.rows.length}\n`);

  } catch (error) {
    console.error('❌ Sync failed:', error);
    throw error;
  } finally {
    await neonPool.end();
  }
}

syncMissingTables().catch(console.error);
