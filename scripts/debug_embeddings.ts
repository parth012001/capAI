/**
 * Debug: Check actual similarity scores
 */

import { Pool } from 'pg';
import { embeddingService } from '../src/services/embeddingService';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_ilnjXht8p4zK@ep-empty-feather-adpyzdiz-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function debugEmbeddings() {
  console.log('🔍 DEBUGGING EMBEDDINGS\n');
  console.log('='.repeat(60) + '\n');

  try {
    const userResult = await pool.query('SELECT user_id FROM user_gmail_tokens LIMIT 1');
    const userId = userResult.rows[0].user_id;

    //  Check sample emails
    console.log('[1/3] Checking sample emails...\n');

    const sampleEmails = await pool.query(`
      SELECT id, subject, from_email,
             LENGTH(embedding::text) as embedding_length
      FROM emails
      WHERE user_id = $1 AND embedding IS NOT NULL
      LIMIT 5
    `, [userId]);

    console.log(`   Found ${sampleEmails.rows.length} emails with embeddings:\n`);
    sampleEmails.rows.forEach(e => {
      console.log(`   - "${e.subject}" (embedding size: ${e.embedding_length} chars)`);
    });
    console.log('');

    // Search with NO threshold to see ALL scores
    console.log('[2/3] Searching "important email" with NO threshold...\n');

    const query = "important email";
    const queryEmbedding = await embeddingService.generateEmbedding(query);
    const embeddingStr = embeddingService.formatEmbeddingForDB(queryEmbedding);

    const allResults = await pool.query(`
      SELECT
        id,
        subject,
        from_email,
        (1 - (embedding <=> $1::vector)) as similarity
      FROM emails
      WHERE user_id = $2 AND embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT 10
    `, [embeddingStr, userId]);

    console.log(`   Top 10 similarity scores:\n`);
    allResults.rows.forEach((r, i) => {
      console.log(`   ${i + 1}. Score: ${r.similarity.toFixed(4)}`);
      console.log(`      "${r.subject}"`);
      console.log(`      From: ${r.from_email}`);
      console.log('');
    });

    // Check embedding dimensions
    console.log('[3/3] Checking embedding dimensions...\n');

    const dimCheck = await pool.query(`
      SELECT
        array_length(embedding::real[], 1) as dimensions
      FROM emails
      WHERE user_id = $1 AND embedding IS NOT NULL
      LIMIT 1
    `, [userId]);

    if (dimCheck.rows.length > 0) {
      console.log(`   ✅ Embedding dimensions: ${dimCheck.rows[0].dimensions}`);
      console.log(`   Expected: 1536\n`);
    }

    console.log('='.repeat(60) + '\n');

  } catch (error: any) {
    console.error('❌ Debug failed:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

debugEmbeddings().catch(console.error);
