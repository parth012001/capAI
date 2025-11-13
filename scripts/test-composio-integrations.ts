import dotenv from 'dotenv';
dotenv.config();
import { composioService } from '../src/services/composio';

(async () => {
  const userId = '09d94485bd9a445d373044011f7cdc2b';

  console.log('🧪 Testing Composio Integrations\n');
  console.log(`User ID: ${userId}\n`);
  console.log('═'.repeat(60));

  // Test 1: Fetch Gmail Emails
  console.log('\n📧 Test 1: Fetching Gmail Emails...\n');
  try {
    const emails = await composioService.fetchEmails(userId, {
      maxResults: 5,
      query: ''
    });

    if (emails?.messages && emails.messages.length > 0) {
      console.log(`✅ Gmail fetch successful! Found ${emails.messages.length} emails\n`);
      emails.messages.forEach((email: any, i: number) => {
        console.log(`  ${i + 1}. ${email.subject || '(no subject)'}`);
        console.log(`     From: ${email.from || 'unknown'}`);
        console.log(`     Date: ${email.date || 'unknown'}`);
        console.log('');
      });
    } else {
      console.log('✅ Gmail fetch successful but no emails found');
    }
  } catch (error: any) {
    console.error('❌ Gmail fetch failed:', error.message);
    console.error('Error details:', error);
  }

  console.log('═'.repeat(60));

  // Test 2: Fetch Calendar Events
  console.log('\n📅 Test 2: Fetching Calendar Events...\n');
  try {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const events = await composioService.listCalendarEvents(userId, {
      timeMin: now,
      timeMax: nextWeek,
      maxResults: 5
    });

    if (events && events.length > 0) {
      console.log(`✅ Calendar fetch successful! Found ${events.length} events\n`);
      events.forEach((event: any, i: number) => {
        console.log(`  ${i + 1}. ${event.summary || '(no title)'}`);
        console.log(`     Start: ${event.start?.dateTime || event.start?.date || 'unknown'}`);
        console.log(`     End: ${event.end?.dateTime || event.end?.date || 'unknown'}`);
        console.log('');
      });
    } else {
      console.log('✅ Calendar fetch successful but no events found in next 7 days');
    }
  } catch (error: any) {
    console.error('❌ Calendar fetch failed:', error.message);
    console.error('Error details:', error);
  }

  console.log('═'.repeat(60));
  console.log('\n✅ Integration tests complete!\n');
})();
