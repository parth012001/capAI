/**
 * Deep schema comparison - every table, every column
 */

import { Pool } from 'pg';

const localPool = new Pool({
  connectionString: 'postgresql://parthahir@localhost:5432/chief_ai',
});

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_ilnjXht8p4zK@ep-empty-feather-adpyzdiz-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function deepCompare() {
  console.log('🔬 DEEP SCHEMA COMPARISON\n');
  console.log('='.repeat(70) + '\n');

  try {
    // Get all tables
    const tableQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    const localTables = await localPool.query(tableQuery);
    const neonTables = await neonPool.query(tableQuery);

    const localTableNames = localTables.rows.map(r => r.table_name).sort();
    const neonTableNames = neonTables.rows.map(r => r.table_name).sort();

    // Check for missing tables
    const onlyInLocal = localTableNames.filter(t => !neonTableNames.includes(t));
    const onlyInNeon = neonTableNames.filter(t => !localTableNames.includes(t));

    console.log('📋 TABLES:\n');
    console.log(`   LOCAL: ${localTableNames.length} tables`);
    console.log(`   NEON:  ${neonTableNames.length} tables\n`);

    if (onlyInLocal.length > 0) {
      console.log('   ❌ MISSING FROM NEON:');
      onlyInLocal.forEach(t => console.log(`      - ${t}`));
      console.log('');
    }

    if (onlyInNeon.length > 0) {
      console.log('   ⚠️  EXTRA IN NEON (not in local):');
      onlyInNeon.forEach(t => console.log(`      - ${t}`));
      console.log('');
    }

    if (onlyInLocal.length === 0 && onlyInNeon.length === 0) {
      console.log('   ✅ PERFECT MATCH - All tables exist in both\n');
    }

    console.log('='.repeat(70) + '\n');

    // Now compare columns for common tables
    const commonTables = localTableNames.filter(t => neonTableNames.includes(t));

    console.log('🔍 COLUMN COMPARISON FOR ALL TABLES:\n');

    let totalMismatches = 0;

    for (const tableName of commonTables) {
      const columnQuery = `
        SELECT column_name, data_type, character_maximum_length, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `;

      const localColumns = await localPool.query(columnQuery, [tableName]);
      const neonColumns = await neonPool.query(columnQuery, [tableName]);

      const localColNames = localColumns.rows.map(r => r.column_name);
      const neonColNames = neonColumns.rows.map(r => r.column_name);

      const colOnlyInLocal = localColNames.filter(c => !neonColNames.includes(c));
      const colOnlyInNeon = neonColNames.filter(c => !localColNames.includes(c));

      if (colOnlyInLocal.length > 0 || colOnlyInNeon.length > 0) {
        totalMismatches++;
        console.log(`📋 ${tableName}:`);

        if (colOnlyInLocal.length > 0) {
          console.log('   ❌ Columns MISSING from NEON:');
          colOnlyInLocal.forEach(c => {
            const col = localColumns.rows.find(r => r.column_name === c);
            console.log(`      - ${c} (${col?.data_type})`);
          });
        }

        if (colOnlyInNeon.length > 0) {
          console.log('   ⚠️  Columns ONLY in NEON:');
          colOnlyInNeon.forEach(c => {
            const col = neonColumns.rows.find(r => r.column_name === c);
            console.log(`      - ${c} (${col?.data_type})`);
          });
        }

        console.log('');
      }
    }

    console.log('='.repeat(70) + '\n');

    // Final summary
    console.log('📊 SUMMARY:\n');
    console.log(`   Tables in LOCAL:  ${localTableNames.length}`);
    console.log(`   Tables in NEON:   ${neonTableNames.length}`);
    console.log(`   Tables analyzed:  ${commonTables.length}`);
    console.log(`   Tables with mismatched columns: ${totalMismatches}\n`);

    if (onlyInLocal.length === 0 && onlyInNeon.length === 0 && totalMismatches === 0) {
      console.log('   ✅✅✅ SCHEMAS ARE IDENTICAL ✅✅✅');
      console.log('   All tables and columns match perfectly!\n');
    } else {
      console.log('   ⚠️  SCHEMAS HAVE DIFFERENCES\n');

      if (onlyInLocal.length > 0) {
        console.log(`   ❌ ${onlyInLocal.length} table(s) missing from Neon`);
      }
      if (onlyInNeon.length > 0) {
        console.log(`   ⚠️  ${onlyInNeon.length} extra table(s) in Neon`);
      }
      if (totalMismatches > 0) {
        console.log(`   ⚠️  ${totalMismatches} table(s) have different columns`);
      }
    }

  } catch (error: any) {
    console.error('❌ Comparison failed:', error.message);
    throw error;
  } finally {
    await localPool.end();
    await neonPool.end();
  }
}

deepCompare().catch(console.error);
