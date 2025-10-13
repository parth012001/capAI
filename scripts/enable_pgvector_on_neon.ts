/**
 * Enable pgvector extension on Neon database
 */

import { Pool } from 'pg';

// Explicitly use Neon connection string
const NEON_URL = 'postgresql://neondb_owner:npg_ilnjXht8p4zK@ep-empty-feather-adpyzdiz-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const neonPool = new Pool({
  connectionString: NEON_URL,
  ssl: { rejectUnauthorized: false }
});

async function enablePgvector() {
  console.log('🚀 Enabling pgvector on Neon database...\n');

  try {
    // First, verify we're connected to Neon
    const versionCheck = await neonPool.query('SELECT version()');
    console.log('📊 Connected to:');
    console.log(`   ${versionCheck.rows[0].version.substring(0, 100)}...\n`);

    if (versionCheck.rows[0].version.includes('Homebrew')) {
      throw new Error('ERROR: Still connected to local database instead of Neon!');
    }

    // Enable pgvector extension
    console.log('[1/5] Enabling pgvector extension...');
    await neonPool.query('CREATE EXTENSION IF NOT EXISTS vector');
    console.log('   ✅ Success\n');

    // Add embedding column to emails
    console.log('[2/5] Adding embedding column to emails table...');
    await neonPool.query('ALTER TABLE emails ADD COLUMN IF NOT EXISTS embedding vector(1536)');
    console.log('   ✅ Success\n');

    // Add embedding column to promotional_emails
    console.log('[3/5] Adding embedding column to promotional_emails table...');
    await neonPool.query('ALTER TABLE promotional_emails ADD COLUMN IF NOT EXISTS embedding vector(1536)');
    console.log('   ✅ Success\n');

    // Create index on emails
    console.log('[4/5] Creating index on emails.embedding...');
    await neonPool.query('CREATE INDEX IF NOT EXISTS emails_embedding_idx ON emails USING ivfflat (embedding vector_cosine_ops) WHERE embedding IS NOT NULL');
    console.log('   ✅ Success\n');

    // Create index on promotional_emails
    console.log('[5/5] Creating index on promotional_emails.embedding...');
    await neonPool.query('CREATE INDEX IF NOT EXISTS promotional_emails_embedding_idx ON promotional_emails USING ivfflat (embedding vector_cosine_ops) WHERE embedding IS NOT NULL');
    console.log('   ✅ Success\n');

    // Verify
    const extCheck = await neonPool.query(`
      SELECT extname, extversion
      FROM pg_extension
      WHERE extname = 'vector'
    `);

    if (extCheck.rows.length > 0) {
      console.log('🎉 pgvector enabled successfully!');
      console.log(`   Version: ${extCheck.rows[0].extversion}\n`);
    }

    // Check columns
    const emailsCol = await neonPool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'emails' AND column_name = 'embedding'
    `);

    const promoCol = await neonPool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'promotional_emails' AND column_name = 'embedding'
    `);

    console.log('📊 Vector columns created:');
    console.log(`   ✅ emails.embedding: ${emailsCol.rows[0]?.data_type || 'NOT FOUND'}`);
    console.log(`   ✅ promotional_emails.embedding: ${promoCol.rows[0]?.data_type || 'NOT FOUND'}\n`);

    console.log('✅ Neon database is ready for semantic search!');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await neonPool.end();
  }
}

enablePgvector().catch(console.error);
