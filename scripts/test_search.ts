/**
 * Test semantic search directly (without HTTP)
 */

import { semanticSearchService } from '../src/services/semanticSearchService';
import * as dotenv from 'dotenv';

dotenv.config();

async function testSearch() {
  console.log('🧪 Testing Semantic Search\n');
  console.log('='.repeat(60) + '\n');

  try {
    // Use Neon database explicitly
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
    });

    const userResult = await pool.query('SELECT user_id FROM user_gmail_tokens LIMIT 1');

    if (userResult.rows.length === 0) {
      console.error('❌ No users found in database');
      return;
    }

    const userId = userResult.rows[0].user_id;
    console.log(`👤 Testing with user: ${userId}\n`);

    // Step 1: Check stats
    console.log('[1/4] Checking embedding coverage...\n');
    const stats = await semanticSearchService.getSearchStats(userId);

    console.log(`   📊 Total emails: ${stats.totalEmails}`);
    console.log(`   ✅ With embeddings: ${stats.emailsWithEmbeddings}`);
    console.log(`   ⚠️  Without embeddings: ${stats.emailsWithoutEmbeddings}`);
    console.log(`   📈 Coverage: ${stats.embeddingCoverage}`);
    console.log('');

    if (stats.emailsWithEmbeddings === 0) {
      console.error('❌ No embeddings found. Run backfill first!');
      await pool.end();
      return;
    }

    // Step 2: Test Query 1 - Natural language
    console.log('[2/4] Test Query 1: "emails about meetings or scheduling"\n');

    const startTime1 = Date.now();
    const results1 = await semanticSearchService.search('emails about meetings or scheduling', {
      userId,
      limit: 5,
      threshold: 0.7 // Lower threshold for testing
    });
    const queryTime1 = Date.now() - startTime1;

    console.log(`   ⏱️  Query time: ${queryTime1}ms`);
    console.log(`   📊 Results found: ${results1.length}\n`);

    if (results1.length > 0) {
      console.log('   Top 3 Results:');
      results1.slice(0, 3).forEach((result, i) => {
        console.log(`\n   ${i + 1}. [${result.relevance_score}] ${result.subject}`);
        console.log(`      From: ${result.from_email}`);
        console.log(`      Match: ${result.match_type}`);
        console.log(`      ${semanticSearchService.explainMatch(result)}`);
      });
    } else {
      console.log('   ⚠️  No results found above threshold');
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Step 3: Test Query 2 - Specific topic
    console.log('[3/4] Test Query 2: "project updates and deadlines"\n');

    const startTime2 = Date.now();
    const results2 = await semanticSearchService.search('project updates and deadlines', {
      userId,
      limit: 5,
      threshold: 0.7
    });
    const queryTime2 = Date.now() - startTime2;

    console.log(`   ⏱️  Query time: ${queryTime2}ms`);
    console.log(`   📊 Results found: ${results2.length}\n`);

    if (results2.length > 0) {
      console.log('   Top 3 Results:');
      results2.slice(0, 3).forEach((result, i) => {
        console.log(`\n   ${i + 1}. [${result.relevance_score}] ${result.subject}`);
        console.log(`      From: ${result.from_email}`);
        console.log(`      Match: ${result.match_type}`);
      });
    } else {
      console.log('   ⚠️  No results found above threshold');
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Step 4: Test Query 3 - Broad search
    console.log('[4/4] Test Query 3: "important emails I need to respond to"\n');

    const startTime3 = Date.now();
    const results3 = await semanticSearchService.search('important emails I need to respond to', {
      userId,
      limit: 5,
      threshold: 0.6 // Even lower threshold
    });
    const queryTime3 = Date.now() - startTime3;

    console.log(`   ⏱️  Query time: ${queryTime3}ms`);
    console.log(`   📊 Results found: ${results3.length}\n`);

    if (results3.length > 0) {
      console.log('   Top 3 Results:');
      results3.slice(0, 3).forEach((result, i) => {
        console.log(`\n   ${i + 1}. [${result.relevance_score}] ${result.subject}`);
        console.log(`      From: ${result.from_email}`);
      });
    } else {
      console.log('   ⚠️  No results found above threshold');
    }

    console.log('\n' + '='.repeat(60) + '\n');

    console.log('✅ Search Test Complete!\n');

    console.log('📊 Summary:');
    console.log(`   Average query time: ${Math.round((queryTime1 + queryTime2 + queryTime3) / 3)}ms`);
    console.log(`   Total results across 3 queries: ${results1.length + results2.length + results3.length}`);
    console.log('');

    await pool.end();

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    throw error;
  }
}

testSearch().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
