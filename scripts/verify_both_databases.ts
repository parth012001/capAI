/**
 * Verify both local and Neon databases are intact
 * Check tables, columns, and row counts
 */

import { Pool } from 'pg';

const localPool = new Pool({
  connectionString: 'postgresql://parthahir@localhost:5432/chief_ai',
});

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_ilnjXht8p4zK@ep-empty-feather-adpyzdiz-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function verifyDatabases() {
  console.log('🔍 VERIFYING BOTH DATABASES\n');
  console.log('='.repeat(60) + '\n');

  try {
    // Verify PostgreSQL versions
    console.log('📊 DATABASE VERSIONS:\n');

    const localVersion = await localPool.query('SELECT version()');
    console.log('LOCAL:');
    console.log(`   ${localVersion.rows[0].version.substring(0, 80)}`);

    const neonVersion = await neonPool.query('SELECT version()');
    console.log('\nNEON:');
    console.log(`   ${neonVersion.rows[0].version.substring(0, 80)}`);
    console.log('\n' + '='.repeat(60) + '\n');

    // Check tables
    const tableQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    const localTables = await localPool.query(tableQuery);
    const neonTables = await neonPool.query(tableQuery);

    console.log('📋 TABLE COUNT:\n');
    console.log(`   LOCAL: ${localTables.rows.length} tables`);
    console.log(`   NEON:  ${neonTables.rows.length} tables`);

    const localTableNames = localTables.rows.map(r => r.table_name);
    const neonTableNames = neonTables.rows.map(r => r.table_name);

    const onlyInLocal = localTableNames.filter(t => !neonTableNames.includes(t));
    const onlyInNeon = neonTableNames.filter(t => !localTableNames.includes(t));

    if (onlyInLocal.length > 0) {
      console.log('\n   ⚠️  Tables ONLY in LOCAL:');
      onlyInLocal.forEach(t => console.log(`      - ${t}`));
    }

    if (onlyInNeon.length > 0) {
      console.log('\n   ⚠️  Tables ONLY in NEON:');
      onlyInNeon.forEach(t => console.log(`      - ${t}`));
    }

    if (onlyInLocal.length === 0 && onlyInNeon.length === 0) {
      console.log('\n   ✅ Both databases have identical table lists');
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Check critical data counts
    console.log('📊 ROW COUNTS (CRITICAL TABLES):\n');

    const criticalTables = [
      'emails',
      'promotional_emails',
      'drafts',
      'user_gmail_tokens',
      'sender_profiles',
      'email_threads'
    ];

    for (const table of criticalTables) {
      try {
        const localCount = await localPool.query(`SELECT COUNT(*) FROM ${table}`);
        const neonCount = await neonPool.query(`SELECT COUNT(*) FROM ${table}`);

        const localRows = parseInt(localCount.rows[0].count);
        const neonRows = parseInt(neonCount.rows[0].count);

        console.log(`   ${table}:`);
        console.log(`      LOCAL: ${localRows} rows`);
        console.log(`      NEON:  ${neonRows} rows`);

        if (localRows !== neonRows) {
          console.log(`      ⚠️  DIFFERENCE: ${localRows - neonRows}`);
        }
        console.log('');
      } catch (error: any) {
        console.log(`   ${table}: ❌ Error - ${error.message}\n`);
      }
    }

    console.log('='.repeat(60) + '\n');

    // Check if LOCAL has pgvector installed
    console.log('🔍 PGVECTOR STATUS:\n');

    try {
      const localPgvector = await localPool.query(`
        SELECT extname, extversion
        FROM pg_extension
        WHERE extname = 'vector'
      `);

      if (localPgvector.rows.length > 0) {
        console.log(`   LOCAL:  ⚠️  pgvector v${localPgvector.rows[0].extversion} is installed`);
      } else {
        console.log('   LOCAL:  ✅ pgvector NOT installed (expected)');
      }
    } catch (error) {
      console.log('   LOCAL:  ✅ pgvector NOT installed (expected)');
    }

    const neonPgvector = await neonPool.query(`
      SELECT extname, extversion
      FROM pg_extension
      WHERE extname = 'vector'
    `);

    if (neonPgvector.rows.length > 0) {
      console.log(`   NEON:   ✅ pgvector v${neonPgvector.rows[0].extversion} is installed`);
    } else {
      console.log('   NEON:   ❌ pgvector NOT installed');
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Check if embedding columns exist
    console.log('📋 EMBEDDING COLUMNS:\n');

    const localEmailsEmbedding = await localPool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'emails' AND column_name = 'embedding'
    `);

    const neonEmailsEmbedding = await neonPool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'emails' AND column_name = 'embedding'
    `);

    console.log(`   LOCAL emails.embedding: ${localEmailsEmbedding.rows.length > 0 ? '⚠️  EXISTS' : '✅ NOT EXISTS (expected)'}`);
    console.log(`   NEON emails.embedding:  ${neonEmailsEmbedding.rows.length > 0 ? '✅ EXISTS' : '❌ NOT EXISTS'}`);

    console.log('\n' + '='.repeat(60) + '\n');

    // Final verdict
    console.log('🎯 VERDICT:\n');

    const localEmailCount = await localPool.query('SELECT COUNT(*) FROM emails');
    const localEmailsIntact = parseInt(localEmailCount.rows[0].count);

    if (localEmailsIntact >= 400) {
      console.log(`   ✅ LOCAL DATABASE IS INTACT`);
      console.log(`      ${localEmailsIntact} emails preserved`);
    } else {
      console.log(`   ⚠️  LOCAL DATABASE MAY HAVE BEEN MODIFIED`);
      console.log(`      Only ${localEmailsIntact} emails found`);
    }

  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
    throw error;
  } finally {
    await localPool.end();
    await neonPool.end();
  }
}

verifyDatabases().catch(console.error);
