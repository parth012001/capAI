import { Composio } from '@composio/core';

/**
 * Test script to verify Composio SDK v0.2.4 API structure
 *
 * This script checks:
 * 1. Whether composio.actions property exists
 * 2. Whether composio.tools property exists
 * 3. The correct method signature for executing actions
 */

async function testComposioSDKStructure() {
  console.log('='.repeat(80));
  console.log('Testing Composio SDK v0.2.4 Structure');
  console.log('='.repeat(80));
  console.log();

  // Initialize Composio SDK
  const composio = new Composio({
    apiKey: process.env.COMPOSIO_API_KEY || 'test-key'
  });

  console.log('✅ Composio instance created');
  console.log();

  // Check for 'actions' property
  console.log('1. Checking for composio.actions property:');
  if ('actions' in composio) {
    console.log('   ✅ composio.actions EXISTS');
    console.log(`   Type: ${typeof (composio as any).actions}`);
  } else {
    console.log('   ❌ composio.actions DOES NOT EXIST');
  }
  console.log();

  // Check for 'tools' property
  console.log('2. Checking for composio.tools property:');
  if ('tools' in composio) {
    console.log('   ✅ composio.tools EXISTS');
    console.log(`   Type: ${typeof composio.tools}`);

    // Check for execute method
    if ('execute' in composio.tools && typeof composio.tools.execute === 'function') {
      console.log('   ✅ composio.tools.execute() method EXISTS');
    } else {
      console.log('   ❌ composio.tools.execute() method DOES NOT EXIST');
    }
  } else {
    console.log('   ❌ composio.tools DOES NOT EXIST');
  }
  console.log();

  // Check for connectedAccounts property
  console.log('3. Checking for composio.connectedAccounts property:');
  if ('connectedAccounts' in composio) {
    console.log('   ✅ composio.connectedAccounts EXISTS');
    console.log(`   Type: ${typeof composio.connectedAccounts}`);
  } else {
    console.log('   ❌ composio.connectedAccounts DOES NOT EXIST');
  }
  console.log();

  // List all properties of composio instance
  console.log('4. All available properties on Composio instance:');
  const properties = Object.keys(composio);
  properties.forEach(prop => {
    console.log(`   - ${prop}: ${typeof (composio as any)[prop]}`);
  });
  console.log();

  // Check the constructor/prototype properties (class members)
  console.log('5. Public properties from Composio class:');
  const proto = Object.getPrototypeOf(composio);
  const classProps = Object.getOwnPropertyNames(composio).concat(
    Object.getOwnPropertyNames(proto).filter(p => p !== 'constructor')
  );
  const uniqueProps = [...new Set(classProps)];
  uniqueProps.forEach(prop => {
    if (!prop.startsWith('_') && prop !== 'constructor') {
      console.log(`   - ${prop}: ${typeof (composio as any)[prop]}`);
    }
  });
  console.log();

  // Conclusion
  console.log('='.repeat(80));
  console.log('CONCLUSION:');
  console.log('='.repeat(80));

  const hasActions = 'actions' in composio;
  const hasTools = 'tools' in composio;
  const hasToolsExecute = hasTools && 'execute' in composio.tools;

  if (!hasActions && hasToolsExecute) {
    console.log('✅ The finding is CORRECT:');
    console.log('   - composio.actions does NOT exist');
    console.log('   - composio.tools.execute() DOES exist');
    console.log();
    console.log('CORRECT API (v0.2.4):');
    console.log('```typescript');
    console.log('const result = await composio.tools.execute(');
    console.log('  "GMAIL_FETCH_EMAILS",');
    console.log('  {');
    console.log('    userId: "user_id",');
    console.log('    arguments: {');
    console.log('      maxResults: 50,');
    console.log('      query: ""');
    console.log('    }');
    console.log('  }');
    console.log(');');
    console.log('```');
  } else if (hasActions) {
    console.log('❌ The finding is INCORRECT:');
    console.log('   - composio.actions EXISTS');
    console.log('   - The current code may be correct');
  } else {
    console.log('⚠️  Unexpected SDK structure - need manual review');
  }
  console.log('='.repeat(80));
}

// Run the test
testComposioSDKStructure().catch(error => {
  console.error('Error running test:', error);
  process.exit(1);
});
