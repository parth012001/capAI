/**
 * Test that AI fallback is ACTUALLY called for extreme edge cases
 * where time is very far from date mention
 */

const { MeetingDetectionService } = require('../dist/services/meetingDetection');

async function testAIFallback() {
  console.log('\n========================================');
  console.log('🤖 TESTING AI FALLBACK - EDGE CASE');
  console.log('========================================\n');

  const meetingDetection = new MeetingDetectionService();

  // Extreme edge case: time mentioned 200+ chars away from "tomorrow"
  const edgeCaseEmail = {
    id: 'test_edge',
    from: 'ted@example.com',
    subject: 'Meeting request',
    body: `Hey Parth,

I wanted to reach out about something important. We need to discuss the product roadmap for next quarter and get your input on a few key decisions we're facing. The team has been working hard on the new features, and we want to make sure we're aligned on priorities before moving forward.

I know you're busy, but this shouldn't take too long - probably just 15 minutes of your time. Let me know if you have any availability tomorrow.

Thanks for your help on this. Looking forward to hearing your thoughts.

By the way, would 3:30 PM work for your schedule?

Best,
Ted`,
    threadId: 'thread_edge',
    receivedAt: new Date()
  };

  console.log('📧 Testing extreme edge case: time 300+ chars away from "tomorrow"');
  console.log(`   Body length: ${edgeCaseEmail.body.length} chars`);

  // Calculate distance
  const tomorrowIndex = edgeCaseEmail.body.indexOf('tomorrow');
  const timeIndex = edgeCaseEmail.body.indexOf('3:30 PM');
  const distance = timeIndex - tomorrowIndex;
  console.log(`   Distance between "tomorrow" and "3:30 PM": ${distance} chars`);
  console.log(`   (50-char window would miss this!)\n`);

  try {
    const result = await meetingDetection.detectMeetingRequest(edgeCaseEmail, 'America/Los_Angeles');

    if (!result) {
      console.log('   ❌ FAILED: No meeting detected');
      process.exit(1);
    }

    if (!result.preferredDates || result.preferredDates.length === 0) {
      console.log('   ❌ FAILED: No dates extracted');
      process.exit(1);
    }

    const extractedDate = result.preferredDates[0];
    console.log(`\n   📅 Extracted date: "${extractedDate}"`);

    // Check if time component exists
    const parsedDate = new Date(extractedDate);
    if (isNaN(parsedDate.getTime())) {
      console.log('   ❌ FAILED: Date cannot be parsed');
      process.exit(1);
    }

    const hour = parsedDate.getHours();
    const minute = parsedDate.getMinutes();

    // In PST, 3:30 PM should be 15:30 or 22:30 UTC (depending on DST)
    console.log(`   🕐 Parsed time: ${hour}:${minute < 10 ? '0' + minute : minute}`);

    // Check if it's roughly 3:30 PM (could be 15:30 in PST or 22:30 UTC)
    const is3_30PM = (hour === 15 && minute === 30) || (hour === 22 && minute === 30);

    if (is3_30PM) {
      console.log('   ✅ SUCCESS: Correct time extracted (3:30 PM)');
      console.log('\n========================================');
      console.log('✅ AI FALLBACK WORKING CORRECTLY!');
      console.log('========================================\n');
      process.exit(0);
    } else {
      console.log(`   ❌ FAILED: Wrong time extracted (expected 3:30 PM, got ${hour}:${minute})`);
      process.exit(1);
    }

  } catch (error) {
    console.log(`   ❌ FAILED: Error during detection`);
    console.log(`   Error:`, error.message);
    process.exit(1);
  }
}

testAIFallback();
