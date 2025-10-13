/**
 * Check if embeddings exist on Neon database
 */

import { Pool } from 'pg';

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_ilnjXht8p4zK@ep-empty-feather-adpyzdiz-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function checkEmbeddings() {
  console.log('🔍 Checking embeddings on NEON database\n');

  try {
    const stats = await neonPool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(embedding) as with_embeddings,
        COUNT(*) - COUNT(embedding) as without_embeddings
      FROM emails
    `);

    const total = parseInt(stats.rows[0].total);
    const withEmbeddings = parseInt(stats.rows[0].with_embeddings);
    const withoutEmbeddings = parseInt(stats.rows[0].without_embeddings);
    const coverage = total > 0 ? ((withEmbeddings / total) * 100).toFixed(1) : '0';

    console.log(`📊 Neon Database Embedding Status:`);
    console.log(`   Total emails: ${total}`);
    console.log(`   With embeddings: ${withEmbeddings}`);
    console.log(`   Without embeddings: ${withoutEmbeddings}`);
    console.log(`   Coverage: ${coverage}%\n`);

    if (withEmbeddings > 0) {
      console.log('✅ Embeddings found on Neon!');
      console.log('🎉 Semantic search is ready!\n');
    } else {
      console.log('⚠️  No embeddings found on Neon.');
      console.log('The backfill may have run on local database instead.\n');
    }

  } catch (error: any) {
    console.error('❌ Check failed:', error.message);
  } finally {
    await neonPool.end();
  }
}

checkEmbeddings().catch(console.error);
