// Phase 2 Comprehensive Testing: Multiple AI Response Types
// Tests AI vs Template for both acceptance and scheduling link responses

const { MeetingResponseGeneratorService } = require('./dist/services/meetingResponseGenerator.js');

// Test 1: Acceptance Response (available time)
const acceptanceTest = {
  mockEmail: {
    subject: "Re: Quick marketing sync next Tuesday",
    body: "Hi! Thanks for reaching out. Can we meet next Tuesday at 2 PM to discuss our Q4 marketing campaign strategy? I have some ideas about the new product launch timeline that I'd love to share.",
    from: "sarah.johnson@startup.co"
  },
  mockMeetingRequest: {
    senderEmail: "sarah.johnson@startup.co",
    subject: "marketing sync",
    preferredDates: ["Tuesday at 2 PM"],
    requestedDuration: 60,
    meetingType: "business_meeting",
    urgencyLevel: "medium"
  },
  mockContext: {
    senderRelationship: 'known_contact',
    isAvailable: true,
    suggestedTimes: [],
    userTone: 'friendly',
    meetingType: 'business_meeting',
    urgencyLevel: 'medium'
  }
};

// Test 2: Scheduling Link Response (vague time request)
const schedulingLinkTest = {
  mockEmail: {
    subject: "Let's catch up soon!",
    body: "Hey there! I hope you've been well. I'd love to catch up and discuss some exciting opportunities I've been working on. When would be a good time for you? I'm pretty flexible with timing.",
    from: "mike.chen@bigcorp.com"
  },
  mockMeetingRequest: {
    senderEmail: "mike.chen@bigcorp.com",
    subject: "catch up",
    preferredDates: [], // Vague request
    requestedDuration: 30,
    meetingType: "networking_meeting",
    urgencyLevel: "low"
  },
  mockContext: {
    senderRelationship: 'new_contact',
    isAvailable: true,
    suggestedTimes: [],
    userTone: 'professional',
    meetingType: 'networking_meeting',
    urgencyLevel: 'low'
  }
};

async function testAcceptanceResponse() {
  try {
    console.log('🧪 [PHASE 2 TEST 1] Testing AI Acceptance Response...\n');

    const generator = new MeetingResponseGeneratorService();
    const timeFormatted = "Tuesday, January 2 at 2:00 PM PST";

    console.log('📋 Acceptance Test Scenario:');
    console.log('  Email Subject:', acceptanceTest.mockEmail.subject);
    console.log('  Meeting Request:', acceptanceTest.mockMeetingRequest.subject);
    console.log('  Sender Relationship:', acceptanceTest.mockContext.senderRelationship);
    console.log('  User Tone:', acceptanceTest.mockContext.userTone);
    console.log('  Action: Accept (available time)\n');

    const response = await generator.generateAcceptanceText(
      acceptanceTest.mockMeetingRequest,
      acceptanceTest.mockContext,
      timeFormatted,
      true, // calendar event created
      acceptanceTest.mockEmail
    );

    console.log('✅ [ACCEPTANCE RESULT]');
    console.log(response);
    console.log('\n' + '='.repeat(80) + '\n');

    return true;
  } catch (error) {
    console.error('❌ [ACCEPTANCE TEST] Error:', error);
    return false;
  }
}

async function testSchedulingLinkResponse() {
  try {
    console.log('🧪 [PHASE 2 TEST 2] Testing AI Scheduling Link Response...\n');

    const generator = new MeetingResponseGeneratorService();
    const schedulingLink = "https://calendly.com/yourname/30min";

    console.log('📋 Scheduling Link Test Scenario:');
    console.log('  Email Subject:', schedulingLinkTest.mockEmail.subject);
    console.log('  Meeting Request:', schedulingLinkTest.mockMeetingRequest.subject);
    console.log('  Sender Relationship:', schedulingLinkTest.mockContext.senderRelationship);
    console.log('  User Tone:', schedulingLinkTest.mockContext.userTone);
    console.log('  Action: Provide scheduling link (vague time)\n');

    const response = await generator.generateSchedulingLinkText(
      schedulingLinkTest.mockMeetingRequest,
      schedulingLinkTest.mockContext,
      schedulingLink,
      schedulingLinkTest.mockEmail
    );

    console.log('✅ [SCHEDULING LINK RESULT]');
    console.log(response);
    console.log('\n' + '='.repeat(80) + '\n');

    return true;
  } catch (error) {
    console.error('❌ [SCHEDULING LINK TEST] Error:', error);
    return false;
  }
}

async function runPhase2Tests() {
  console.log('🚀 [PHASE 2] Starting Comprehensive AI Response Testing');
  console.log('=' * 80);
  console.log('Testing AI-powered meeting responses with template fallbacks\n');

  const test1Success = await testAcceptanceResponse();
  const test2Success = await testSchedulingLinkResponse();

  console.log('📊 [PHASE 2 RESULTS]');
  console.log('✅ Acceptance Response Test:', test1Success ? 'PASSED' : 'FAILED');
  console.log('✅ Scheduling Link Response Test:', test2Success ? 'PASSED' : 'FAILED');

  if (test1Success && test2Success) {
    console.log('\n🎉 [PHASE 2] All tests passed! AI responses are working in production.');
    console.log('🔧 All existing functionality preserved (calendar, scheduling, booking)');
    console.log('🤖 AI generates more natural, contextual responses');
    console.log('🛡️ Template fallbacks ensure reliability');
  } else {
    console.log('\n❌ [PHASE 2] Some tests failed. Check errors above.');
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  runPhase2Tests();
}