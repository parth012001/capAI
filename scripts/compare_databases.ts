/**
 * Compare local and Neon database schemas
 */

import { Pool } from 'pg';

const localPool = new Pool({
  connectionString: 'postgresql://parthahir@localhost:5432/chief_ai',
});

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_ilnjXht8p4zK@ep-empty-feather-adpyzdiz-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
});

async function compareSchemas() {
  console.log('🔍 Comparing Local vs Neon Database Schemas\n');

  try {
    // Get tables from both databases
    const tableQuery = `
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    console.log('📊 Fetching local database schema...');
    const localTables = await localPool.query(tableQuery);

    console.log('📊 Fetching Neon database schema...');
    const neonTables = await neonPool.query(tableQuery);

    console.log('\n=== TABLES COMPARISON ===\n');
    console.log(`Local tables: ${localTables.rows.length}`);
    console.log(`Neon tables: ${neonTables.rows.length}\n`);

    // Compare table lists
    const localTableNames = localTables.rows.map(r => r.table_name).sort();
    const neonTableNames = neonTables.rows.map(r => r.table_name).sort();

    const onlyInLocal = localTableNames.filter(t => !neonTableNames.includes(t));
    const onlyInNeon = neonTableNames.filter(t => !localTableNames.includes(t));
    const inBoth = localTableNames.filter(t => neonTableNames.includes(t));

    if (onlyInLocal.length > 0) {
      console.log('⚠️  Tables ONLY in LOCAL:');
      onlyInLocal.forEach(t => console.log(`   - ${t}`));
      console.log('');
    }

    if (onlyInNeon.length > 0) {
      console.log('⚠️  Tables ONLY in NEON:');
      onlyInNeon.forEach(t => console.log(`   - ${t}`));
      console.log('');
    }

    console.log(`✅ Tables in BOTH databases: ${inBoth.length}`);
    inBoth.forEach(t => console.log(`   - ${t}`));
    console.log('');

    // For each common table, compare columns
    console.log('\n=== COLUMN COMPARISON FOR COMMON TABLES ===\n');

    for (const tableName of inBoth) {
      const columnQuery = `
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `;

      const localColumns = await localPool.query(columnQuery, [tableName]);
      const neonColumns = await neonPool.query(columnQuery, [tableName]);

      const localColNames = localColumns.rows.map(r => r.column_name);
      const neonColNames = neonColumns.rows.map(r => r.column_name);

      const colOnlyInLocal = localColNames.filter(c => !neonColNames.includes(c));
      const colOnlyInNeon = neonColNames.filter(c => !localColNames.includes(c));

      if (colOnlyInLocal.length > 0 || colOnlyInNeon.length > 0) {
        console.log(`\n📋 Table: ${tableName}`);

        if (colOnlyInLocal.length > 0) {
          console.log('   ⚠️  Columns ONLY in LOCAL:');
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
      }
    }

    // Count rows in critical tables
    console.log('\n=== ROW COUNTS ===\n');

    const criticalTables = ['users', 'emails', 'promotional_emails', 'drafts', 'meetings'];

    for (const table of criticalTables) {
      if (inBoth.includes(table)) {
        try {
          const localCount = await localPool.query(`SELECT COUNT(*) FROM ${table}`);
          const neonCount = await neonPool.query(`SELECT COUNT(*) FROM ${table}`);

          const localRows = parseInt(localCount.rows[0].count);
          const neonRows = parseInt(neonCount.rows[0].count);

          const status = localRows === neonRows ? '✅' : '⚠️';
          console.log(`${status} ${table}: Local=${localRows}, Neon=${neonRows}`);
        } catch (error) {
          console.log(`❌ ${table}: Error counting rows`);
        }
      }
    }

    console.log('\n=== SUMMARY ===\n');

    if (onlyInLocal.length === 0 && onlyInNeon.length === 0) {
      console.log('✅ All tables exist in both databases');
    } else {
      console.log('⚠️  Schema differences detected - see above');
    }

    console.log('\n💡 Recommendation:');
    if (onlyInLocal.length > 0) {
      console.log('   You need to migrate missing tables to Neon before switching');
    } else if (onlyInNeon.length > 0) {
      console.log('   Neon has extra tables - should be safe to switch');
    } else {
      console.log('   Schemas match - safe to switch to Neon for vector setup');
    }

  } catch (error: any) {
    console.error('❌ Error comparing databases:', error.message);
    console.error(error);
  } finally {
    await localPool.end();
    await neonPool.end();
  }
}

compareSchemas().catch(console.error);
