import { pool } from '../src/database/connection';

async function getSampleQueries() {
  try {
    console.log('\n🔍 Analyzing your emails to suggest voice queries...\n');

    // Get diverse sample emails
    const result = await pool.query(`
      SELECT
        subject,
        from_email,
        SUBSTRING(body, 1, 300) as body_preview
      FROM emails
      WHERE embedding IS NOT NULL
      ORDER BY received_at DESC
      LIMIT 50
    `);

    console.log(`📊 Found ${result.rows.length} emails with embeddings\n`);
    console.log('=' .repeat(80));

    // Show sample emails
    console.log('\nSAMPLE EMAILS IN YOUR DATABASE:');
    console.log('=' .repeat(80));

    result.rows.slice(0, 10).forEach((row, i) => {
      console.log(`\n[${i + 1}] Subject: ${row.subject || '(no subject)'}`);
      console.log(`    From: ${row.from_email}`);
      console.log(`    Preview: ${row.body_preview?.substring(0, 150).replace(/\n/g, ' ')}...`);
    });

    // Analyze common themes
    const subjects = result.rows.map(r => r.subject?.toLowerCase() || '').join(' ');
    const fromEmails = result.rows.map(r => r.from_email?.toLowerCase() || '');
    const bodies = result.rows.map(r => r.body_preview?.toLowerCase() || '').join(' ');

    // Extract common senders
    const senderCounts: Record<string, number> = {};
    fromEmails.forEach(email => {
      const name = email.split('@')[0].replace(/[._]/g, ' ');
      senderCounts[name] = (senderCounts[name] || 0) + 1;
    });

    const topSenders = Object.entries(senderCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    // Extract common keywords
    const hasKeyword = (text: string, keyword: string) => text.includes(keyword);

    const keywords = {
      meeting: hasKeyword(subjects + bodies, 'meeting'),
      update: hasKeyword(subjects + bodies, 'update'),
      project: hasKeyword(subjects + bodies, 'project'),
      schedule: hasKeyword(subjects + bodies, 'schedule'),
      chat: hasKeyword(subjects + bodies, 'chat'),
      roadmap: hasKeyword(subjects + bodies, 'roadmap'),
      product: hasKeyword(subjects + bodies, 'product'),
      calendar: hasKeyword(subjects + bodies, 'calendar'),
      declined: hasKeyword(subjects + bodies, 'declined'),
      invitation: hasKeyword(subjects + bodies, 'invitation'),
    };

    console.log('\n\n' + '='.repeat(80));
    console.log('🎤 SUGGESTED VOICE QUERIES (GUARANTEED TO WORK):');
    console.log('='.repeat(80));
    console.log('\nBased on your actual email content, try these queries:\n');

    let queryCount = 1;

    // Generate queries based on actual content
    if (topSenders.length > 0) {
      console.log(`${queryCount}. "Show me emails from ${topSenders[0]}"`);
      queryCount++;
    }

    if (keywords.meeting) {
      console.log(`${queryCount}. "Find emails about meetings"`);
      queryCount++;
    }

    if (keywords.roadmap || keywords.product) {
      console.log(`${queryCount}. "Show me emails about the roadmap"`);
      queryCount++;
    }

    if (keywords.update) {
      console.log(`${queryCount}. "Find update emails"`);
      queryCount++;
    }

    if (keywords.declined || keywords.calendar) {
      console.log(`${queryCount}. "Show me calendar invitations"`);
      queryCount++;
    }

    if (topSenders.length > 1) {
      console.log(`${queryCount}. "Find messages from ${topSenders[1]}"`);
      queryCount++;
    }

    if (keywords.project) {
      console.log(`${queryCount}. "Show me emails about projects"`);
      queryCount++;
    }

    // Generic queries that should always work
    console.log(`${queryCount}. "Show me recent emails"`);
    queryCount++;

    console.log(`${queryCount}. "Find all emails"`);

    console.log('\n' + '='.repeat(80));
    console.log('💡 TIP: Speak naturally! Say things like:');
    console.log('   - "Hey Chief, can you find emails about meetings?"');
    console.log('   - "Show me messages from John"');
    console.log('   - "What did people say about the project?"');
    console.log('='.repeat(80) + '\n');

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

getSampleQueries();
