/**
 * Check for triggers on emails table
 */

import { pool } from '../src/database/connection';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkTriggers() {
  try {
    console.log('🔍 Checking for triggers on emails table...\n');

    const triggersQuery = `
      SELECT
        trigger_name,
        event_manipulation,
        action_statement,
        action_timing
      FROM information_schema.triggers
      WHERE event_object_table = 'emails';
    `;

    const triggers = await pool.query(triggersQuery);

    if (triggers.rows.length > 0) {
      console.log(`Found ${triggers.rows.length} trigger(s):\n`);
      triggers.rows.forEach(trigger => {
        console.log(`   Trigger: ${trigger.trigger_name}`);
        console.log(`   Event: ${trigger.event_manipulation}`);
        console.log(`   Timing: ${trigger.action_timing}`);
        console.log(`   Action: ${trigger.action_statement}\n`);
      });
    } else {
      console.log('✅ No triggers found on emails table\n');
    }

    // Check for rules
    console.log('🔍 Checking for rules on emails table...\n');
    const rulesQuery = `
      SELECT rulename, definition
      FROM pg_rules
      WHERE tablename = 'emails';
    `;

    const rules = await pool.query(rulesQuery);

    if (rules.rows.length > 0) {
      console.log(`Found ${rules.rows.length} rule(s):\n`);
      rules.rows.forEach(rule => {
        console.log(`   Rule: ${rule.rulename}`);
        console.log(`   Definition: ${rule.definition}\n`);
      });
    } else {
      console.log('✅ No rules found on emails table\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkTriggers();
