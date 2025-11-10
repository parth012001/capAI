/**
 * Check user_profiles table structure and data
 */

import { pool } from '../src/database/connection';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkUserProfiles() {
  try {
    console.log('🔍 Checking user_profiles table...\n');

    // Check columns
    const columnsQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'user_profiles'
      ORDER BY ordinal_position;
    `;
    const columns = await pool.query(columnsQuery);

    console.log('Columns in user_profiles:');
    columns.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type}`);
    });
    console.log('');

    // Get all data
    const dataQuery = `SELECT * FROM user_profiles;`;
    const data = await pool.query(dataQuery);

    console.log(`Total rows: ${data.rows.length}\n`);

    if (data.rows.length > 0) {
      console.log('Data:');
      data.rows.forEach((row, i) => {
        console.log(`${i+1}. User ID: ${row.user_id}`);
        console.log(`   Data: ${JSON.stringify(row, null, 2)}\n`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkUserProfiles();
