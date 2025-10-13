/**
 * Backfill Embeddings Script
 * Generates vector embeddings for all emails that don't have them yet
 *
 * Usage: npx tsx scripts/backfill_embeddings.ts
 */

import { Pool } from 'pg';
import { embeddingService } from '../src/services/embeddingService';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
});

interface Email {
  id: number;
  subject: string | null;
  body: string | null;
  from_email: string | null;
}

async function backfillEmbeddings() {
  console.log('🚀 Starting Embedding Backfill Process\n');
  console.log('='.repeat(60) + '\n');

  try {
    // Step 1: Check current status
    console.log('[1/5] Checking current embedding status...\n');

    const statsQuery = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(embedding) as with_embeddings,
        COUNT(*) - COUNT(embedding) as without_embeddings
      FROM emails
    `);

    const stats = statsQuery.rows[0];
    const total = parseInt(stats.total);
    const withEmbeddings = parseInt(stats.with_embeddings);
    const withoutEmbeddings = parseInt(stats.without_embeddings);

    console.log(`   📊 Total emails: ${total}`);
    console.log(`   ✅ With embeddings: ${withEmbeddings}`);
    console.log(`   ⚠️  Without embeddings: ${withoutEmbeddings}`);
    console.log('');

    if (withoutEmbeddings === 0) {
      console.log('✅ All emails already have embeddings! Nothing to do.\n');
      return;
    }

    // Step 2: Fetch emails without embeddings
    console.log('[2/5] Fetching emails without embeddings...\n');

    const emailsQuery = await pool.query(`
      SELECT id, subject, body, from_email
      FROM emails
      WHERE embedding IS NULL
      ORDER BY id
    `);

    const emails: Email[] = emailsQuery.rows;
    console.log(`   📧 Found ${emails.length} emails to process\n`);

    // Step 3: Estimate cost
    console.log('[3/5] Estimating OpenAI API cost...\n');

    const estimatedCost = embeddingService.estimateCost(emails.length, 500);
    console.log(`   💰 Estimated cost: $${estimatedCost.toFixed(4)}`);
    console.log(`   ⏱️  Estimated time: ~${Math.ceil(emails.length / 100)} minutes`);
    console.log('');

    // Step 4: Generate embeddings in batches
    console.log('[4/5] Generating embeddings...\n');

    const BATCH_SIZE = 10; // Process 10 emails at a time
    let processed = 0;
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batch = emails.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(emails.length / BATCH_SIZE);

      console.log(`   📦 Batch ${batchNum}/${totalBatches} (${batch.length} emails)...`);

      for (const email of batch) {
        try {
          // Generate embedding
          const embedding = await embeddingService.generateEmailEmbedding(
            email.subject,
            email.body,
            email.from_email
          );

          // Format for PostgreSQL
          const embeddingStr = embeddingService.formatEmbeddingForDB(embedding);

          // Update database
          await pool.query(
            'UPDATE emails SET embedding = $1 WHERE id = $2',
            [embeddingStr, email.id]
          );

          successful++;
        } catch (error: any) {
          console.error(`      ❌ Failed for email ${email.id}: ${error.message}`);
          failed++;
        }

        processed++;

        // Progress indicator
        if (processed % 50 === 0) {
          const progress = ((processed / emails.length) * 100).toFixed(1);
          console.log(`      Progress: ${processed}/${emails.length} (${progress}%)`);
        }
      }

      // Rate limiting: wait between batches to avoid API limits
      if (i + BATCH_SIZE < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
    }

    console.log(`\n   ✅ Processed ${processed} emails`);
    console.log(`   ✅ Successful: ${successful}`);
    if (failed > 0) {
      console.log(`   ❌ Failed: ${failed}`);
    }
    console.log('');

    // Step 5: Verify results
    console.log('[5/5] Verifying results...\n');

    const finalStats = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(embedding) as with_embeddings,
        COUNT(*) - COUNT(embedding) as without_embeddings
      FROM emails
    `);

    const finalTotal = parseInt(finalStats.rows[0].total);
    const finalWithEmbeddings = parseInt(finalStats.rows[0].with_embeddings);
    const finalWithoutEmbeddings = parseInt(finalStats.rows[0].without_embeddings);
    const coverage = ((finalWithEmbeddings / finalTotal) * 100).toFixed(1);

    console.log(`   📊 Final Status:`);
    console.log(`      Total emails: ${finalTotal}`);
    console.log(`      With embeddings: ${finalWithEmbeddings} (${coverage}%)`);
    console.log(`      Without embeddings: ${finalWithoutEmbeddings}`);
    console.log('');

    console.log('='.repeat(60));
    console.log('\n✅✅✅ EMBEDDING BACKFILL COMPLETE! ✅✅✅\n');

    if (finalWithoutEmbeddings === 0) {
      console.log('🎉 All emails now have embeddings!');
      console.log('🔍 Semantic search is ready to use!');
      console.log('');
      console.log('Try it out:');
      console.log('   GET /emails/search?q=your search query');
      console.log('');
    } else {
      console.log(`⚠️  ${finalWithoutEmbeddings} emails still without embeddings`);
      console.log('You may want to run this script again.');
      console.log('');
    }

  } catch (error: any) {
    console.error('❌ Backfill failed:', error.message);
    console.error(error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the backfill
backfillEmbeddings().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
