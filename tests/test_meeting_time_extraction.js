/**
 * Test Meeting Time Extraction with OpenAI Fallback
 * Tests the fix for edge case where time is far from date mention
 */

const { MeetingDetectionService } = require('../dist/services/meetingDetection');

// Test emails
const testEmails = [
  {
    name: "Ted's Email (Edge Case - Time far from date)",
    email: {
      id: 'test_1',
      from: 'ted@example.com',
      subject: 'Quick chat about product roadmap',
      body: `Hey Parth,
Wanted to see if you've got a quick 15 minutes tomorrow afternoon to chat about the product direction and what's coming next in the roadmap. I just need your input before locking in a few priorities.

Would 3:30 PM work for you?

– Ted`,
      threadId: 'thread_1',
      receivedAt: new Date()
    },
    expectedTime: '3:30 PM',
    shouldFindTime: true
  },
  {
    name: "Normal Email (Time near date - should use 50-char window)",
    email: {
      id: 'test_2',
      from: 'alice@example.com',
      subject: 'Meeting request',
      body: `Hi, can we meet tomorrow at 2:30 PM to discuss the project?`,
      threadId: 'thread_2',
      receivedAt: new Date()
    },
    expectedTime: '2:30 PM',
    shouldFindTime: true
  },
  {
    name: "Email with no specific time",
    email: {
      id: 'test_3',
      from: 'bob@example.com',
      subject: 'Catch up',
      body: `Hey, let's catch up sometime next week when you're free.`,
      threadId: 'thread_3',
      receivedAt: new Date()
    },
    expectedTime: null,
    shouldFindTime: false
  },
  {
    name: "Email with Monday 3:30 PM",
    email: {
      id: 'test_4',
      from: 'carol@example.com',
      subject: 'Weekly sync',
      body: `Can we do our weekly sync on Monday at 3:30 PM?`,
      threadId: 'thread_4',
      receivedAt: new Date()
    },
    expectedTime: '3:30 PM',
    shouldFindTime: true
  }
];

async function runTests() {
  console.log('\n========================================');
  console.log('🧪 TESTING MEETING TIME EXTRACTION FIX');
  console.log('========================================\n');

  const meetingDetection = new MeetingDetectionService();
  let passed = 0;
  let failed = 0;

  for (const test of testEmails) {
    console.log(`\n📧 Testing: ${test.name}`);
    console.log(`   Email body: "${test.email.body.substring(0, 80)}..."`);

    try {
      const result = await meetingDetection.detectMeetingRequest(test.email, 'America/Los_Angeles');

      if (test.shouldFindTime) {
        // Should detect meeting with time
        if (!result) {
          console.log(`   ❌ FAILED: Expected to detect meeting but got null`);
          failed++;
          continue;
        }

        if (!result.preferredDates || result.preferredDates.length === 0) {
          console.log(`   ❌ FAILED: Expected to find time but preferredDates is empty`);
          console.log(`   Result:`, JSON.stringify(result, null, 2));
          failed++;
          continue;
        }

        const extractedDate = result.preferredDates[0];
        console.log(`   📅 Extracted date: "${extractedDate}"`);

        // Check if time component exists
        const hasTimeComponent = /\d{1,2}:\d{2}/.test(extractedDate);
        if (!hasTimeComponent) {
          console.log(`   ❌ FAILED: Date missing time component`);
          console.log(`   Expected: Date with time like "2025-10-14T15:30:00"`);
          console.log(`   Got: "${extractedDate}"`);
          failed++;
          continue;
        }

        // Check if it can be parsed as Date
        const parsedDate = new Date(extractedDate);
        if (isNaN(parsedDate.getTime())) {
          console.log(`   ❌ FAILED: Date cannot be parsed`);
          console.log(`   Got: "${extractedDate}"`);
          failed++;
          continue;
        }

        console.log(`   ✅ PASSED: Time extracted successfully`);
        console.log(`   Parsed to: ${parsedDate.toLocaleString()}`);
        passed++;

      } else {
        // Should not find specific time
        if (result && result.preferredDates && result.preferredDates.length > 0) {
          const hasTimeComponent = /\d{1,2}:\d{2}/.test(result.preferredDates[0]);
          if (hasTimeComponent) {
            console.log(`   ❌ FAILED: Should not find specific time but found: ${result.preferredDates[0]}`);
            failed++;
            continue;
          }
        }
        console.log(`   ✅ PASSED: Correctly did not extract specific time`);
        passed++;
      }

    } catch (error) {
      console.log(`   ❌ FAILED: Error during detection`);
      console.log(`   Error:`, error.message);
      failed++;
    }
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

  if (failed > 0) {
    console.log('❌ Some tests failed. Please review the output above.');
    process.exit(1);
  } else {
    console.log('✅ All tests passed! Time extraction is working correctly.');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test suite error:', error);
  process.exit(1);
});
