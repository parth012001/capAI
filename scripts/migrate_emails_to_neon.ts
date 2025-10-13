/**
 * Migrate all emails and related data from local to Neon
 */

import { Pool } from 'pg';

const localPool = new Pool({
  connectionString: 'postgresql://parthahir@localhost:5432/chief_ai',
});

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_ilnjXht8p4zK@ep-empty-feather-adpyzdiz-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function migrateData() {
  console.log('🚀 Starting data migration from LOCAL → NEON\n');
  console.log('='.repeat(60) + '\n');

  try {
    // Step 1: Migrate user_gmail_tokens first (foreign key dependency)
    console.log('[1/5] Migrating user_gmail_tokens...');
    const users = await localPool.query('SELECT * FROM user_gmail_tokens');

    if (users.rows.length > 0) {
      // Clear existing Neon users first to avoid conflicts
      await neonPool.query('DELETE FROM user_gmail_tokens');

      for (const user of users.rows) {
        await neonPool.query(`
          INSERT INTO user_gmail_tokens (
            user_id, gmail_address, refresh_token_encrypted, access_token_encrypted,
            access_token_expires_at, created_at, updated_at, webhook_active,
            webhook_expires_at, first_name, last_name, full_name, onboarding_completed,
            scheduling_link, scheduling_link_verified, scheduling_link_added_at,
            timezone, timezone_updated_at, timezone_source
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          ON CONFLICT (user_id) DO UPDATE SET
            gmail_address = EXCLUDED.gmail_address,
            refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
            access_token_encrypted = EXCLUDED.access_token_encrypted,
            updated_at = EXCLUDED.updated_at
        `, [
          user.user_id, user.gmail_address, user.refresh_token_encrypted, user.access_token_encrypted,
          user.access_token_expires_at, user.created_at, user.updated_at, user.webhook_active,
          user.webhook_expires_at, user.first_name, user.last_name, user.full_name, user.onboarding_completed,
          user.scheduling_link, user.scheduling_link_verified, user.scheduling_link_added_at,
          user.timezone, user.timezone_updated_at, user.timezone_source
        ]);
      }
      console.log(`   ✅ Migrated ${users.rows.length} users\n`);
    } else {
      console.log('   ⚠️  No users to migrate\n');
    }

    // Step 2: Migrate email_threads
    console.log('[2/5] Migrating email_threads...');
    const threads = await localPool.query('SELECT * FROM email_threads');

    if (threads.rows.length > 0) {
      await neonPool.query('DELETE FROM email_threads');

      for (const thread of threads.rows) {
        await neonPool.query(`
          INSERT INTO email_threads (
            id, thread_id, user_id, subject, participants, message_count,
            last_message_date, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO NOTHING
        `, [
          thread.id, thread.thread_id, thread.user_id, thread.subject,
          thread.participants, thread.message_count, thread.last_message_date,
          thread.created_at, thread.updated_at
        ]);
      }
      console.log(`   ✅ Migrated ${threads.rows.length} email threads\n`);
    } else {
      console.log('   ⚠️  No threads to migrate\n');
    }

    // Step 3: Migrate emails
    console.log('[3/5] Migrating emails (436 rows)...');
    const emails = await localPool.query('SELECT * FROM emails ORDER BY id');

    if (emails.rows.length > 0) {
      // Clear existing emails
      await neonPool.query('TRUNCATE TABLE emails CASCADE');

      let migrated = 0;
      for (const email of emails.rows) {
        await neonPool.query(`
          INSERT INTO emails (
            id, gmail_id, thread_id, user_id, subject, from_email, to_email,
            cc_email, bcc_email, body, received_at, labels, is_read,
            category, priority_score, summary, key_points, suggested_actions,
            sentiment, urgency_level, context_type, requires_response,
            ai_processed, created_at, thread_context_id, sender_profile_id,
            extracted_data, processing_status, webhook_processed
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
          )
        `, [
          email.id, email.gmail_id, email.thread_id, email.user_id, email.subject,
          email.from_email, email.to_email, email.cc_email, email.bcc_email,
          email.body, email.received_at, email.labels, email.is_read,
          email.category, email.priority_score, email.summary, email.key_points,
          email.suggested_actions, email.sentiment, email.urgency_level,
          email.context_type, email.requires_response, email.ai_processed,
          email.created_at, email.thread_context_id, email.sender_profile_id,
          email.extracted_data, email.processing_status, email.webhook_processed
        ]);

        migrated++;
        if (migrated % 50 === 0) {
          console.log(`   📊 Progress: ${migrated}/${emails.rows.length} emails...`);
        }
      }
      console.log(`   ✅ Migrated ${emails.rows.length} emails\n`);
    } else {
      console.log('   ⚠️  No emails to migrate\n');
    }

    // Step 4: Migrate promotional_emails
    console.log('[4/5] Migrating promotional_emails...');
    const promoEmails = await localPool.query('SELECT * FROM promotional_emails ORDER BY id');

    if (promoEmails.rows.length > 0) {
      await neonPool.query('TRUNCATE TABLE promotional_emails CASCADE');

      for (const promo of promoEmails.rows) {
        await neonPool.query(`
          INSERT INTO promotional_emails (
            id, gmail_id, user_id, thread_id, subject, from_email, to_email,
            body, received_at, classification_reason, is_read, webhook_processed,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
          promo.id, promo.gmail_id, promo.user_id, promo.thread_id, promo.subject,
          promo.from_email, promo.to_email, promo.body, promo.received_at,
          promo.classification_reason, promo.is_read, promo.webhook_processed,
          promo.created_at, promo.updated_at
        ]);
      }
      console.log(`   ✅ Migrated ${promoEmails.rows.length} promotional emails\n`);
    } else {
      console.log('   ⚠️  No promotional emails to migrate\n');
    }

    // Step 5: Verify migration
    console.log('[5/5] Verifying migration...');

    const localEmailCount = await localPool.query('SELECT COUNT(*) FROM emails');
    const neonEmailCount = await neonPool.query('SELECT COUNT(*) FROM emails');

    const localPromoCount = await localPool.query('SELECT COUNT(*) FROM promotional_emails');
    const neonPromoCount = await neonPool.query('SELECT COUNT(*) FROM promotional_emails');

    console.log('');
    console.log('='.repeat(60) + '\n');
    console.log('📊 MIGRATION VERIFICATION:\n');
    console.log(`   Emails:              LOCAL: ${localEmailCount.rows[0].count} → NEON: ${neonEmailCount.rows[0].count}`);
    console.log(`   Promotional Emails:  LOCAL: ${localPromoCount.rows[0].count} → NEON: ${neonPromoCount.rows[0].count}`);
    console.log('');

    if (localEmailCount.rows[0].count === neonEmailCount.rows[0].count &&
        localPromoCount.rows[0].count === neonPromoCount.rows[0].count) {
      console.log('✅✅✅ MIGRATION SUCCESSFUL! ✅✅✅');
      console.log('All data copied from LOCAL → NEON\n');
    } else {
      console.log('⚠️  Migration completed but counts do not match\n');
    }

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    throw error;
  } finally {
    await localPool.end();
    await neonPool.end();
  }
}

migrateData().catch(console.error);
