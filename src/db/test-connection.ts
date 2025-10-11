/**
 * Test script to verify Drizzle ORM setup
 * Run with: npx tsx src/db/test-connection.ts
 */

import { db, closeDatabase, user_profiles, emails } from './client';
import { sql } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

async function testConnection() {
  console.log('🔍 Testing Drizzle ORM connection...\n');

  try {
    // Test 1: Raw SQL query
    console.log('Test 1: Raw SQL query');
    const result = await db.execute(sql`SELECT NOW() as current_time`);
    console.log('✅ Database connection successful');
    console.log('   Current time:', result.rows[0]);

    // Test 2: Count users
    console.log('\nTest 2: Count user profiles');
    const userCount = await db.select({ count: sql<number>`count(*)` }).from(user_profiles);
    console.log('✅ User profiles count:', userCount[0].count);

    // Test 3: Count emails
    console.log('\nTest 3: Count emails');
    const emailCount = await db.select({ count: sql<number>`count(*)` }).from(emails);
    console.log('✅ Emails count:', emailCount[0].count);

    // Test 4: Fetch one user profile (if exists)
    console.log('\nTest 4: Fetch sample user profile');
    const sampleUser = await db.select().from(user_profiles).limit(1);
    if (sampleUser.length > 0) {
      console.log('✅ Sample user found:');
      console.log('   User ID:', sampleUser[0].user_id);
      console.log('   Display name:', sampleUser[0].display_name);
    } else {
      console.log('ℹ️  No users found (empty table)');
    }

    console.log('\n✅ All tests passed! Drizzle ORM is working correctly.\n');
  } catch (error) {
    console.error('❌ Error testing Drizzle connection:', error);
    throw error;
  } finally {
    await closeDatabase();
  }
}

// Run tests
testConnection().catch(console.error);
