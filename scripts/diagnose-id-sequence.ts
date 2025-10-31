/**
 * COMPREHENSIVE diagnosis of the ID sequence problem
 */

import { pool } from '../src/database/connection';
import * as dotenv from 'dotenv';

dotenv.config();

async function diagnoseSequence() {
  const client = await pool.connect();

  try {
    console.log('🔍 COMPREHENSIVE SEQUENCE DIAGNOSIS\n');
    console.log('='.repeat(60) + '\n');

    // 1. Check sequence info
    console.log('1️⃣ SEQUENCE INFORMATION:');
    const seqInfo = await client.query(`
      SELECT last_value, is_called
      FROM emails_id_seq;
    `);
    console.log(`   Last Value: ${seqInfo.rows[0].last_value}`);
    console.log(`   Is Called: ${seqInfo.rows[0].is_called}`);
    const nextValue = seqInfo.rows[0].is_called ? parseInt(seqInfo.rows[0].last_value) + 1 : parseInt(seqInfo.rows[0].last_value);
    console.log(`   Next Value Will Be: ${nextValue}\n`);

    // 2. Check max ID in table
    console.log('2️⃣ TABLE MAX ID:');
    const maxId = await client.query(`SELECT MAX(id) as max_id, COUNT(*) as total FROM emails;`);
    console.log(`   Max ID: ${maxId.rows[0].max_id}`);
    console.log(`   Total Rows: ${maxId.rows[0].total}\n`);

    // 3. Check if ID 696 exists
    console.log('3️⃣ CHECKING ID 696:');
    const id696 = await client.query(`SELECT id, gmail_id, subject, user_id FROM emails WHERE id = 696;`);
    if (id696.rows.length > 0) {
      console.log(`   ✅ EXISTS: "${id696.rows[0].subject}"`);
      console.log(`   Gmail ID: ${id696.rows[0].gmail_id}`);
      console.log(`   User: ${id696.rows[0].user_id}\n`);
    } else {
      console.log(`   ❌ Does NOT exist\n`);
    }

    // 4. Check new email from logs
    console.log('4️⃣ CHECKING NEW EMAIL (19a2fd1bfe36a7fc):');
    const newEmail = await client.query(`
      SELECT id, gmail_id, subject, user_id
      FROM emails
      WHERE gmail_id = '19a2fd1bfe36a7fc';
    `);
    if (newEmail.rows.length > 0) {
      console.log(`   ✅ EXISTS in database:`);
      console.log(`   ID: ${newEmail.rows[0].id}`);
      console.log(`   Subject: "${newEmail.rows[0].subject}"`);
      console.log(`   User: ${newEmail.rows[0].user_id}\n`);
    } else {
      console.log(`   ❌ NOT in database (should be inserted)\n`);
    }

    // 5. Find gaps in ID sequence
    console.log('5️⃣ CHECKING FOR ID GAPS:');
    const gaps = await client.query(`
      SELECT id + 1 AS gap_start
      FROM emails
      WHERE id + 1 NOT IN (SELECT id FROM emails)
      AND id < (SELECT MAX(id) FROM emails)
      ORDER BY gap_start
      LIMIT 10;
    `);
    if (gaps.rows.length > 0) {
      console.log(`   Found ${gaps.rows.length} gaps in ID sequence:`);
      gaps.rows.forEach(row => {
        console.log(`   - Gap at ID ${row.gap_start}`);
      });
      console.log('');
    } else {
      console.log(`   ✅ No gaps found\n`);
    }

    // 6. Test what nextval would return
    console.log('6️⃣ TESTING NEXTVAL():');
    const nextVal = await client.query(`SELECT nextval('emails_id_seq') as next_id;`);
    console.log(`   Next ID from sequence: ${nextVal.rows[0].next_id}\n`);

    // 7. Check if that ID exists
    const testId = nextVal.rows[0].next_id;
    const testExists = await client.query(`SELECT id FROM emails WHERE id = $1;`, [testId]);
    if (testExists.rows.length > 0) {
      console.log(`   ⚠️  ID ${testId} ALREADY EXISTS!`);
      console.log(`   This is why we get duplicate key errors!\n`);
    } else {
      console.log(`   ✅ ID ${testId} is available\n`);
    }

    // 8. Check column default
    console.log('7️⃣ TABLE COLUMN DEFAULTS:');
    const columnDefault = await client.query(`
      SELECT column_name, column_default
      FROM information_schema.columns
      WHERE table_name = 'emails' AND column_name = 'id';
    `);
    console.log(`   Column: ${columnDefault.rows[0].column_name}`);
    console.log(`   Default: ${columnDefault.rows[0].column_default}\n`);

    // 9. Show recent failed attempts
    console.log('8️⃣ RECENT EMAILS (last 10):');
    const recent = await client.query(`
      SELECT id, gmail_id, subject, created_at
      FROM emails
      ORDER BY created_at DESC
      LIMIT 10;
    `);
    recent.rows.forEach(row => {
      console.log(`   ID ${row.id}: ${row.subject?.substring(0, 40)}`);
    });
    console.log('');

    // 10. Calculate fix
    console.log('='.repeat(60));
    console.log('\n📊 DIAGNOSIS SUMMARY:\n');

    const currentSeq = nextValue;
    const currentMax = parseInt(maxId.rows[0].max_id);

    if (currentSeq <= currentMax) {
      console.log('❌ PROBLEM CONFIRMED: Sequence is behind!');
      console.log(`   Sequence next value: ${currentSeq}`);
      console.log(`   Max ID in table: ${currentMax}`);
      console.log(`   Sequence should be: ${currentMax + 1}\n`);

      console.log('🔧 FIX COMMAND:');
      console.log(`   SELECT setval('emails_id_seq', ${currentMax + 1}, false);\n`);
    } else {
      console.log('✅ Sequence is ahead of max ID');
      console.log('   The duplicate error might be from a race condition\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

diagnoseSequence();
