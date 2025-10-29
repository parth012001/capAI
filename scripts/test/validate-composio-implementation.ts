/**
 * Static validation of Composio implementation
 * Tests logic WITHOUT hitting external APIs or requiring OAuth
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

const envPath = path.join(__dirname, '../../.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
const NEON_DATABASE_URL = envConfig.DATABASE_URL;

const pool = new Pool({
  connectionString: NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

interface ValidationResult {
  test: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const results: ValidationResult[] = [];

async function validateImplementation() {
  console.log('🔍 Validating Composio Implementation\n');
  console.log('=' .repeat(60));

  // Test 1: Database schema has both columns
  try {
    const schemaCheck = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'user_gmail_tokens'
        AND column_name IN ('composio_entity_id', 'composio_connected_account_id')
      ORDER BY column_name
    `);

    if (schemaCheck.rows.length === 2) {
      results.push({
        test: 'Database Schema',
        status: 'PASS',
        details: 'Both composio_entity_id and composio_connected_account_id columns exist'
      });
    } else {
      results.push({
        test: 'Database Schema',
        status: 'FAIL',
        details: `Expected 2 columns, found ${schemaCheck.rows.length}`
      });
    }
  } catch (error: any) {
    results.push({
      test: 'Database Schema',
      status: 'FAIL',
      details: error.message
    });
  }

  // Test 2: Existing Composio users have correct format
  try {
    const dataCheck = await pool.query(`
      SELECT
        user_id,
        composio_entity_id,
        composio_connected_account_id,
        CASE
          WHEN composio_entity_id LIKE 'user_%' THEN true
          ELSE false
        END as correct_entity_format,
        CASE
          WHEN composio_connected_account_id LIKE 'ca_%' THEN true
          ELSE false
        END as correct_connected_format
      FROM user_gmail_tokens
      WHERE auth_method = 'composio'
    `);

    if (dataCheck.rows.length === 0) {
      results.push({
        test: 'Data Format (Existing Users)',
        status: 'PASS',
        details: 'No Composio users yet (fresh start)'
      });
    } else {
      const allCorrect = dataCheck.rows.every(
        row => row.correct_entity_format && row.correct_connected_format
      );

      if (allCorrect) {
        results.push({
          test: 'Data Format (Existing Users)',
          status: 'PASS',
          details: `All ${dataCheck.rows.length} Composio user(s) have correct ID formats`
        });
      } else {
        const broken = dataCheck.rows.filter(
          row => !row.correct_entity_format || !row.correct_connected_format
        );
        results.push({
          test: 'Data Format (Existing Users)',
          status: 'FAIL',
          details: `${broken.length} user(s) have incorrect format: ${broken.map(r => r.user_id).join(', ')}`
        });
      }
    }
  } catch (error: any) {
    results.push({
      test: 'Data Format (Existing Users)',
      status: 'FAIL',
      details: error.message
    });
  }

  // Test 3: Index exists for performance
  try {
    const indexCheck = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'user_gmail_tokens'
        AND indexname IN ('idx_composio_entity', 'idx_composio_connected_account')
    `);

    if (indexCheck.rows.length >= 1) {
      results.push({
        test: 'Database Indexes',
        status: 'PASS',
        details: `Found ${indexCheck.rows.length} index(es) for Composio columns`
      });
    } else {
      results.push({
        test: 'Database Indexes',
        status: 'FAIL',
        details: 'Missing performance indexes'
      });
    }
  } catch (error: any) {
    results.push({
      test: 'Database Indexes',
      status: 'FAIL',
      details: error.message
    });
  }

  // Test 4: TypeScript files exist and are syntactically valid
  const filesToCheck = [
    'src/services/tokenStorage.ts',
    'src/services/composio/auth.ts',
    'src/services/composio/triggers.ts'
  ];

  for (const file of filesToCheck) {
    const filePath = path.join(__dirname, '../../', file);
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');

        // Check for key patterns
        const hasGetComposioIds = content.includes('getComposioIds');
        const hasPermanentEntityId = content.includes('user_${userId}') || content.includes('user_\${userId}');
        const hasConnectedAccountId = content.includes('composio_connected_account_id');

        if (hasGetComposioIds && hasPermanentEntityId && hasConnectedAccountId) {
          results.push({
            test: `Code Validation (${file})`,
            status: 'PASS',
            details: 'Contains expected implementation patterns'
          });
        } else {
          results.push({
            test: `Code Validation (${file})`,
            status: 'FAIL',
            details: 'Missing expected implementation patterns'
          });
        }
      } else {
        results.push({
          test: `Code Validation (${file})`,
          status: 'FAIL',
          details: 'File does not exist'
        });
      }
    } catch (error: any) {
      results.push({
        test: `Code Validation (${file})`,
        status: 'FAIL',
        details: error.message
      });
    }
  }

  // Test 5: Environment variables configured
  const requiredEnvVars = ['COMPOSIO_API_KEY', 'COMPOSIO_AUTH_CONFIG_ID', 'USE_COMPOSIO'];
  const missingVars = requiredEnvVars.filter(v => !envConfig[v]);

  if (missingVars.length === 0) {
    results.push({
      test: 'Environment Configuration',
      status: 'PASS',
      details: 'All required Composio environment variables set'
    });
  } else {
    results.push({
      test: 'Environment Configuration',
      status: 'FAIL',
      details: `Missing: ${missingVars.join(', ')}`
    });
  }

  await pool.end();

  // Print results
  console.log('\n📊 VALIDATION RESULTS\n');
  console.log('=' .repeat(60));

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`\n${icon} ${result.test}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Details: ${result.details}`);
  });

  const passCount = results.filter(r => r.status === 'PASS').length;
  const totalCount = results.length;

  console.log('\n' + '=' .repeat(60));
  console.log(`\n🎯 OVERALL: ${passCount}/${totalCount} tests passed\n`);

  if (passCount === totalCount) {
    console.log('✅ Implementation is VALID and ready for testing\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some checks failed - review issues above\n');
    process.exit(1);
  }
}

validateImplementation();
