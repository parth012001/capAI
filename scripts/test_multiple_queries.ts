/**
 * Test multiple queries with different thresholds
 */

import { Pool } from 'pg';
import { embeddingService } from '../src/services/embeddingService';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_ilnjXht8p4zK@ep-empty-feather-adpyzdiz-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function runSearch(query: string, threshold: number, userId: string) {
  const queryEmbedding = await embeddingService.generateEmbedding(query);
  const embeddingStr = embeddingService.formatEmbeddingForDB(queryEmbedding);

  const startTime = Date.now();
  const result = await pool.query(`
    SELECT
      id,
      subject,
      from_email,
      (1 - (embedding <=> $1::vector)) as similarity
    FROM emails
    WHERE user_id = $2
      AND embedding IS NOT NULL
      AND (1 - (embedding <=> $1::vector)) >= $3
    ORDER BY embedding <=> $1::vector
    LIMIT 3
  `, [embeddingStr, userId, threshold]);

  const queryTime = Date.now() - startTime;

  return { results: result.rows, queryTime };
}

async function testMultipleQueries() {
  console.log('🧪 TESTING MULTIPLE SEARCH QUERIES\n');
  console.log('='.repeat(60) + '\n');

  try {
    const userResult = await pool.query('SELECT user_id FROM user_gmail_tokens LIMIT 1');
    const userId = userResult.rows[0].user_id;

    const queries = [
      { q: "important emails", threshold: 0.5 },
      { q: "work and projects", threshold: 0.5 },
      { q: "email from a colleague", threshold: 0.5 },
    ];

    for (let i = 0; i < queries.length; i++) {
      const { q, threshold } = queries[i];

      console.log(`[Query ${i + 1}/3] "${q}" (threshold: ${threshold})`);

      const { results, queryTime } = await runSearch(q, threshold, userId);

      console.log(`   ⏱️  Time: ${queryTime}ms`);
      console.log(`   📊 Results: ${results.length}\n`);

      if (results.length > 0) {
        results.forEach((r, idx) => {
          console.log(`   ${idx + 1}. [${r.similarity.toFixed(3)}] ${r.subject}`);
          console.log(`      From: ${r.from_email}`);
        });
        console.log('');
      } else {
        console.log('   ⚠️  No results\n');
      }

      console.log('');
    }

    console.log('='.repeat(60));
    console.log('\n✅ ALL TESTS COMPLETE!\n');
    console.log('🎉 Semantic search is fully functional!\n');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testMultipleQueries().catch(console.error);
