/**
 * Direct test of semantic search on Neon
 */

import { Pool } from 'pg';
import { embeddingService } from '../src/services/embeddingService';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_ilnjXht8p4zK@ep-empty-feather-adpyzdiz-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function testSearchDirect() {
  console.log('🧪 TESTING SEMANTIC SEARCH (Direct on Neon)\n');
  console.log('='.repeat(60) + '\n');

  try {
    // Get user
    const userResult = await pool.query('SELECT user_id FROM user_gmail_tokens LIMIT 1');
    const userId = userResult.rows[0].user_id;
    console.log(`👤 Testing with user: ${userId}\n`);

    // Test query
    const query = "emails about meetings or scheduling";
    console.log(`🔍 Searching for: "${query}"\n`);

    // Generate query embedding
    console.log('[1/2] Generating query embedding...');
    const queryEmbedding = await embeddingService.generateEmbedding(query);
    const embeddingStr = embeddingService.formatEmbeddingForDB(queryEmbedding);
    console.log('   ✅ Query embedding generated\n');

    // Run semantic search
    console.log('[2/2] Running semantic search...');
    const startTime = Date.now();

    const result = await pool.query(`
      SELECT
        id,
        subject,
        from_email,
        received_at,
        (1 - (embedding <=> $1::vector)) as similarity
      FROM emails
      WHERE user_id = $2
        AND embedding IS NOT NULL
        AND (1 - (embedding <=> $1::vector)) >= 0.7
      ORDER BY embedding <=> $1::vector
      LIMIT 5
    `, [embeddingStr, userId]);

    const queryTime = Date.now() - startTime;
    console.log(`   ✅ Search completed in ${queryTime}ms\n`);

    console.log('='.repeat(60) + '\n');

    console.log(`📊 RESULTS: Found ${result.rows.length} emails\n`);

    if (result.rows.length > 0) {
      result.rows.forEach((row, i) => {
        console.log(`${i + 1}. [Score: ${row.similarity.toFixed(3)}]`);
        console.log(`   Subject: ${row.subject}`);
        console.log(`   From: ${row.from_email}`);
        console.log(`   Date: ${new Date(row.received_at).toLocaleDateString()}`);
        console.log('');
      });
    } else {
      console.log('   ⚠️  No results found above threshold 0.7');
      console.log('   Try lowering the threshold or using a different query\n');
    }

    console.log('='.repeat(60));
    console.log('\n✅ Semantic Search Test Complete!\n');
    console.log('🎉 Your search is working!\n');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

testSearchDirect().catch(console.error);
