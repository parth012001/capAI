// Phase 1 Testing: AI vs Template Comparison
// This script tests the parallel AI generation without affecting production

const { MeetingResponseGeneratorService } = require('./dist/services/meetingResponseGenerator.js');

// Mock data for testing
const mockEmail = {
  subject: "Quick 30-min sync: Q4 budget planning",
  body: "Hey! Hope you're doing well. Could we schedule a quick 30-minute meeting this Tuesday at 2 PM to discuss our Q4 budget planning? I'd love to get your input on the marketing spend allocation. Let me know if this time works for you!",
  from: "john.smith@acme.com"
};

const mockMeetingRequest = {
  senderEmail: "john.smith@acme.com",
  subject: "Q4 budget planning",
  preferredDates: ["Tuesday at 2 PM"],
  requestedDuration: 30,
  meetingType: "business_meeting",
  urgencyLevel: "medium"
};

const mockContext = {
  senderRelationship: 'known_contact',
  isAvailable: true,
  suggestedTimes: [],
  userTone: 'friendly',
  meetingType: 'business_meeting',
  urgencyLevel: 'medium'
};

async function testPhase1() {
  try {
    console.log('🧪 [PHASE 1 TEST] Starting AI vs Template comparison test...\n');

    const generator = new MeetingResponseGeneratorService();

    // Test the new generateAcceptanceText method (which now runs AI in parallel)
    const timeFormatted = "Tuesday, December 31 at 2:00 PM PST";

    console.log('📋 Test Scenario:');
    console.log('  Email Subject:', mockEmail.subject);
    console.log('  Meeting Request:', mockMeetingRequest.subject);
    console.log('  Sender Relationship:', mockContext.senderRelationship);
    console.log('  User Tone:', mockContext.userTone);
    console.log('  Action: Accept (available time)\n');

    // This will generate both template and AI responses and log the comparison
    const response = await generator.generateAcceptanceText(
      mockMeetingRequest,
      mockContext,
      timeFormatted,
      true, // calendar event created
      mockEmail
    );

    console.log('\n✅ [PHASE 1 TEST] Final response (template - safe):', response.substring(0, 150) + '...\n');
    console.log('🎯 Phase 1 test completed successfully!');
    console.log('📝 Check the logs above to see template vs AI comparison');

  } catch (error) {
    console.error('❌ [PHASE 1 TEST] Error:', error);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testPhase1();
}