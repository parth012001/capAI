/**
 * Check if pgvector is available on Neon
 */

import { Pool } from 'pg';

const neonPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkPgvector() {
  console.log('🔍 Checking pgvector availability on Neon...\n');

  try {
    // Check available extensions
    const availableExt = await neonPool.query(`
      SELECT name, default_version, comment
      FROM pg_available_extensions
      WHERE name LIKE '%vector%'
      ORDER BY name
    `);

    console.log('📦 Available extensions with "vector":');
    if (availableExt.rows.length > 0) {
      availableExt.rows.forEach(ext => {
        console.log(`   - ${ext.name} (v${ext.default_version}): ${ext.comment}`);
      });
    } else {
      console.log('   ⚠️  No vector extensions found');
    }
    console.log('');

    // Check installed extensions
    const installedExt = await neonPool.query(`
      SELECT extname, extversion
      FROM pg_extension
      WHERE extname = 'vector'
    `);

    if (installedExt.rows.length > 0) {
      console.log('✅ pgvector is installed:');
      console.log(`   Version: ${installedExt.rows[0].extversion}\n`);
    } else {
      console.log('⚠️  pgvector is NOT installed yet\n');
    }

    // Check PostgreSQL version
    const versionResult = await neonPool.query('SELECT version()');
    console.log('📊 PostgreSQL version:');
    console.log(`   ${versionResult.rows[0].version}\n`);

  } catch (error: any) {
    console.error('❌ Check failed:', error.message);
  } finally {
    await neonPool.end();
  }
}

checkPgvector().catch(console.error);
