/**
 * Migration script to enable pgvector and add embedding columns
 * Run with: npx tsx src/database/migrations/run_vector_migration.ts
 */

import { pool } from '../connection';
import * as fs from 'fs';
import * as path from 'path';

async function runVectorMigration() {
  console.log('🚀 Starting vector database migration...\n');

  try {
    // Execute statements one by one directly
    const statements = [
      `CREATE EXTENSION IF NOT EXISTS vector`,
      `ALTER TABLE emails ADD COLUMN IF NOT EXISTS embedding vector(1536)`,
      `ALTER TABLE promotional_emails ADD COLUMN IF NOT EXISTS embedding vector(1536)`,
      `CREATE INDEX IF NOT EXISTS emails_embedding_idx ON emails (embedding) WHERE embedding IS NOT NULL`,
      `CREATE INDEX IF NOT EXISTS promotional_emails_embedding_idx ON promotional_emails (embedding) WHERE embedding IS NOT NULL`
    ];

    console.log(`📝 Executing ${statements.length} SQL statements\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`[${i + 1}/${statements.length}] Executing...`);

      try {
        const result = await pool.query(statement);

        if (result.rows && result.rows.length > 0) {
          console.log('   Result:', JSON.stringify(result.rows[0]));
        } else {
          console.log('   ✅ Success');
        }
      } catch (error: any) {
        // If error is about extension/column already existing, that's OK
        if (error.message.includes('already exists')) {
          console.log('   ⚠️  Already exists (skipping)');
        } else {
          throw error;
        }
      }
    }

    console.log('\n✅ Vector database migration completed successfully!\n');

    // Verify pgvector is enabled
    const versionCheck = await pool.query(`
      SELECT extname, extversion
      FROM pg_extension
      WHERE extname = 'vector'
    `);

    if (versionCheck.rows.length > 0) {
      console.log('🎉 pgvector extension confirmed:');
      console.log(`   Version: ${versionCheck.rows[0].extversion}\n`);
    }

    // Check how many emails need embeddings
    const emailStats = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(embedding) as with_embeddings,
        COUNT(*) - COUNT(embedding) as without_embeddings
      FROM emails
    `);

    console.log('📊 Email Embedding Stats:');
    console.log(`   Total emails: ${emailStats.rows[0].total}`);
    console.log(`   With embeddings: ${emailStats.rows[0].with_embeddings}`);
    console.log(`   Need embeddings: ${emailStats.rows[0].without_embeddings}\n`);

    // Check promotional emails
    const promoStats = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(embedding) as with_embeddings,
        COUNT(*) - COUNT(embedding) as without_embeddings
      FROM promotional_emails
    `);

    console.log('📊 Promotional Email Embedding Stats:');
    console.log(`   Total emails: ${promoStats.rows[0].total}`);
    console.log(`   With embeddings: ${promoStats.rows[0].with_embeddings}`);
    console.log(`   Need embeddings: ${promoStats.rows[0].without_embeddings}\n`);

    console.log('🎯 Next Steps:');
    console.log('   1. Update Drizzle schema: npm run db:introspect');
    console.log('   2. Generate embeddings for existing emails');
    console.log('   3. Create semantic search API\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
runVectorMigration().catch(console.error);
