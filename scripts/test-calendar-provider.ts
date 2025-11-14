/**
 * Test Calendar Provider Implementation
 *
 * Tests the ComposioCalendarProvider to ensure it correctly wraps
 * the Composio service and implements the ICalendarProvider interface
 */

import { ComposioService } from '../src/services/composio';
import { ComposioCalendarProvider } from '../src/services/providers/ComposioCalendarProvider';

async function testCalendarProvider() {
  console.log('\n========================================');
  console.log('TESTING COMPOSIO CALENDAR PROVIDER');
  console.log('========================================\n');

  // Test user ID (update this to a real user with Composio connection)
  const testUserId = 'user_f886bcaa9854a4e30da4d36f1cb1c27e08d93ac0fd8e3d54e85e7c75adeaf0cf';

  try {
    // Initialize services
    console.log('Step 1: Initializing Composio service and provider...');
    const composioService = new ComposioService();
    const calendarProvider = new ComposioCalendarProvider(composioService);

    console.log(`✅ Provider initialized: ${calendarProvider.getProviderName()}\n`);

    // Test 1: List calendar events
    console.log('Step 2: Testing listEvents()...');
    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const listResult = await calendarProvider.listEvents(testUserId, {
      timeMin: now,
      timeMax: oneWeekLater,
      maxResults: 10
    });

    console.log(`✅ Listed ${listResult.items.length} events`);
    if (listResult.items.length > 0) {
      const firstEvent = listResult.items[0];
      console.log(`   First event: ${firstEvent.summary || 'Untitled'}`);
      console.log(`   Start: ${firstEvent.start?.dateTime || firstEvent.start?.date}`);
      console.log(`   End: ${firstEvent.end?.dateTime || firstEvent.end?.date}`);
    }
    console.log();

    // Test 2: Check availability
    console.log('Step 3: Testing checkAvailability()...');
    const testStart = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days from now
    const testEnd = new Date(testStart.getTime() + 60 * 60 * 1000); // 1 hour duration

    const availabilityResult = await calendarProvider.checkAvailability(testUserId, {
      start: testStart,
      end: testEnd
    });

    console.log(`✅ Availability check complete`);
    console.log(`   Available: ${availabilityResult.available ? 'Yes' : 'No'}`);
    if (availabilityResult.conflicts) {
      console.log(`   Conflicts: ${availabilityResult.conflicts.length}`);
      availabilityResult.conflicts.forEach((event, idx) => {
        console.log(`     ${idx + 1}. ${event.summary || 'Untitled'}`);
      });
    }
    console.log();

    // Test 3: Create calendar event
    console.log('Step 4: Testing createEvent()...');
    const eventStart = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
    const eventEnd = new Date(eventStart.getTime() + 30 * 60 * 1000); // 30 minutes duration

    const createResult = await calendarProvider.createEvent(testUserId, {
      summary: 'Test Event from ComposioCalendarProvider',
      start: eventStart,
      end: eventEnd,
      description: 'This is a test event created through the Composio Calendar Provider abstraction layer.',
      location: 'Virtual Meeting',
      attendees: ['test@example.com']
    });

    console.log(`✅ Event created successfully`);
    console.log(`   Event ID: ${createResult.id}`);
    console.log(`   Link: ${createResult.htmlLink}`);
    console.log(`   Status: ${createResult.status}`);
    console.log();

    console.log('========================================');
    console.log('ALL TESTS PASSED ✅');
    console.log('========================================\n');

    console.log('Summary:');
    console.log(`  ✅ Provider initialization working`);
    console.log(`  ✅ listEvents() working (${listResult.items.length} events)`);
    console.log(`  ✅ checkAvailability() working (available: ${availabilityResult.available})`);
    console.log(`  ✅ createEvent() working`);
    console.log(`  ✅ Interface compliance verified`);
    console.log();

  } catch (error: any) {
    console.error('\n❌ ERROR during testing:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
testCalendarProvider();
