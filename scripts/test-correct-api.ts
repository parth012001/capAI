import { Composio } from '@composio/core';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test script to verify the CORRECT Composio SDK v0.2.4 API
 * This tests the actual working API to understand response formats
 */

async function testCorrectAPI() {
  console.log('='.repeat(80));
  console.log('Testing CORRECT Composio SDK v0.2.4 API');
  console.log('='.repeat(80));
  console.log();

  const composio = new Composio({
    apiKey: process.env.COMPOSIO_API_KEY!
  });

  console.log('✅ Composio instance created\n');

  // Test 1: Get available tools (list tools, not actions)
  console.log('TEST 1: Listing available tools');
  console.log('-'.repeat(80));
  try {
    // Check if tools has a list method
    if ('list' in composio.tools && typeof composio.tools.list === 'function') {
      console.log('✅ composio.tools.list() method EXISTS');

      // Try to get Gmail tools
      const tools: any = await composio.tools.list({
        apps: 'gmail'
      });

      console.log('Response structure:', Object.keys(tools));
      if (tools.items && Array.isArray(tools.items)) {
        console.log(`Found ${tools.items.length} Gmail tools`);
        console.log('First 3 tools:', tools.items.slice(0, 3).map((t: any) => t.slug || t.name));
      }
    } else {
      console.log('❌ composio.tools.list() method DOES NOT EXIST');
    }
  } catch (error: any) {
    console.error('Error listing tools:', error.message);
  }
  console.log();

  // Test 2: Execute a tool (if we have a connected account)
  console.log('TEST 2: Understanding execute() method signature');
  console.log('-'.repeat(80));
  console.log('Method signature from type definitions:');
  console.log('');
  console.log('execute(');
  console.log('  slug: string,                    // Tool name like "GMAIL_FETCH_EMAILS"');
  console.log('  body: {                          // ToolExecuteParams');
  console.log('    userId?: string,               // Entity/user ID');
  console.log('    connectedAccountId?: string,   // Optional connected account ID');
  console.log('    arguments?: Record<string, unknown>,  // Tool-specific parameters');
  console.log('    version?: string | "latest",   // Tool version');
  console.log('    allowTracing?: boolean,        // Optional tracing');
  console.log('    // ... other optional fields');
  console.log('  },');
  console.log('  modifiers?: ExecuteToolModifiers // Optional hooks');
  console.log('): Promise<ToolExecuteResponse>');
  console.log('');
  console.log('ToolExecuteResponse structure:');
  console.log('{');
  console.log('  data: Record<string, unknown>,   // The actual response data');
  console.log('  error: string | null,            // Error message if failed');
  console.log('  successful: boolean,             // Success flag');
  console.log('  logId?: string,                  // Optional log ID');
  console.log('  sessionInfo?: unknown            // Optional session info');
  console.log('}');
  console.log();

  // Test 3: Check connectedAccounts API
  console.log('TEST 3: Checking connectedAccounts methods');
  console.log('-'.repeat(80));
  const connectedAccountsMethods = Object.getOwnPropertyNames(
    Object.getPrototypeOf(composio.connectedAccounts)
  ).filter(m => !m.startsWith('_') && m !== 'constructor');

  console.log('Available methods on composio.connectedAccounts:');
  connectedAccountsMethods.forEach(method => {
    console.log(`  - ${method}()`);
  });
  console.log();

  // Test 4: Summary of API changes
  console.log('='.repeat(80));
  console.log('SUMMARY: API Changes from Old → New');
  console.log('='.repeat(80));
  console.log();
  console.log('OLD API (what the code currently uses):');
  console.log('─'.repeat(80));
  console.log('await composio.actions.execute({');
  console.log('  actionName: "GMAIL_FETCH_EMAILS",');
  console.log('  requestBody: {');
  console.log('    entityId: userId,');
  console.log('    input: {');
  console.log('      maxResults: 50,');
  console.log('      query: ""');
  console.log('    }');
  console.log('  }');
  console.log('});');
  console.log();
  console.log('NEW API (v0.2.4 correct usage):');
  console.log('─'.repeat(80));
  console.log('await composio.tools.execute(');
  console.log('  "GMAIL_FETCH_EMAILS",           // First param: tool slug');
  console.log('  {                               // Second param: config object');
  console.log('    userId: userId,               // Changed from entityId');
  console.log('    arguments: {                  // Changed from input');
  console.log('      maxResults: 50,');
  console.log('      query: ""');
  console.log('    }');
  console.log('  }');
  console.log(');');
  console.log();
  console.log('Response format (same for both):');
  console.log('─'.repeat(80));
  console.log('{');
  console.log('  data: { ... },          // Gmail API response data');
  console.log('  error: null,            // or error message string');
  console.log('  successful: true,       // boolean');
  console.log('  logId: "log_123"       // optional');
  console.log('}');
  console.log();
  console.log('='.repeat(80));
}

testCorrectAPI().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
