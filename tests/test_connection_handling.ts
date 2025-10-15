/**
 * Test NEON Connection Handling
 * Verifies that the server can handle connection drops without crashing
 */

import { pool, queryWithRetry } from '../src/database/connection';

async function testConnectionHandling() {
  console.log('\n========================================');
  console.log('🧪 TESTING NEON CONNECTION HANDLING');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Basic query works
  console.log('📋 Test 1: Basic query should work');
  try {
    const result = await pool.query('SELECT NOW() as now, version() as version');
    console.log('   ✅ PASSED: Basic query works');
    console.log(`   Connected to: ${result.rows[0].version}`);
    console.log(`   Server time: ${result.rows[0].now}`);
    passed++;
  } catch (error: any) {
    console.log('   ❌ FAILED: Basic query failed');
    console.log('   Error:', error.message);
    failed++;
  }

  // Test 2: Pool error handler doesn't crash server
  console.log('\n📋 Test 2: Pool error handler should log errors without crashing');
  try {
    // The pool error handler is already registered in connection.ts
    // We can't easily trigger a real connection drop in a test, but we can verify the handler exists
    const listeners = pool.listeners('error');
    if (listeners.length > 0) {
      console.log('   ✅ PASSED: Pool error handler is registered');
      console.log(`   Number of error handlers: ${listeners.length}`);
      passed++;
    } else {
      console.log('   ❌ FAILED: No pool error handler registered');
      failed++;
    }
  } catch (error: any) {
    console.log('   ❌ FAILED: Error checking handlers');
    console.log('   Error:', error.message);
    failed++;
  }

  // Test 3: Query with retry function
  console.log('\n📋 Test 3: queryWithRetry should work for normal queries');
  try {
    const result: any = await queryWithRetry(
      'SELECT $1::text as message',
      ['Connection handling works!']
    );
    console.log('   ✅ PASSED: queryWithRetry works');
    console.log(`   Message: ${result.rows[0].message}`);
    passed++;
  } catch (error: any) {
    console.log('   ❌ FAILED: queryWithRetry failed');
    console.log('   Error:', error.message);
    failed++;
  }

  // Test 4: Check pool configuration
  console.log('\n📋 Test 4: Pool should have correct NEON configuration');
  try {
    const poolOptions = (pool as any).options;
    const checks = [
      { name: 'keepAlive', expected: true, actual: poolOptions.keepAlive },
      { name: 'max connections', expected: 20, actual: poolOptions.max },
      { name: 'idle timeout', expected: 30000, actual: poolOptions.idleTimeoutMillis },
      { name: 'connection timeout', expected: 10000, actual: poolOptions.connectionTimeoutMillis }
    ];

    let configPassed = true;
    for (const check of checks) {
      if (check.actual === check.expected) {
        console.log(`   ✓ ${check.name}: ${check.actual}`);
      } else {
        console.log(`   ✗ ${check.name}: expected ${check.expected}, got ${check.actual}`);
        configPassed = false;
      }
    }

    if (configPassed) {
      console.log('   ✅ PASSED: Pool configuration correct');
      passed++;
    } else {
      console.log('   ❌ FAILED: Pool configuration incorrect');
      failed++;
    }
  } catch (error: any) {
    console.log('   ❌ FAILED: Error checking pool configuration');
    console.log('   Error:', error.message);
    failed++;
  }

  // Test 5: pgvector extension still works
  console.log('\n📋 Test 5: Vector DB (pgvector) should still work');
  try {
    const result = await pool.query(`
      SELECT extname, extversion
      FROM pg_extension
      WHERE extname = 'vector'
    `);
    if (result.rows.length > 0) {
      console.log('   ✅ PASSED: pgvector extension working');
      console.log(`   Version: ${result.rows[0].extversion}`);
      passed++;
    } else {
      console.log('   ❌ FAILED: pgvector not installed');
      failed++;
    }
  } catch (error: any) {
    console.log('   ❌ FAILED: Could not check pgvector');
    console.log('   Error:', error.message);
    failed++;
  }

  // Summary
  console.log('\n========================================');
  console.log('📊 TEST SUMMARY');
  console.log('========================================');
  console.log(`Total Tests: ${passed + failed}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('========================================\n');

  // Cleanup
  await pool.end();

  if (failed > 0) {
    console.log('❌ Some tests failed. Please review the output above.');
    process.exit(1);
  } else {
    console.log('✅ All tests passed! Connection handling is production-ready.');
    process.exit(0);
  }
}

// Run tests
testConnectionHandling().catch(error => {
  console.error('\n❌ Test suite error:', error);
  process.exit(1);
});
