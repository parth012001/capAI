import { queryWithRetry, closePool } from '../src/database/connection';

async function main() {
  try {
    const result = await queryWithRetry(
      'SELECT user_id, gmail_address FROM user_gmail_tokens ORDER BY created_at DESC LIMIT 1',
      []
    );

    if (result.rows.length > 0) {
      console.log(result.rows[0].user_id);
    } else {
      console.log('NO_USERS');
    }
  } finally {
    await closePool();
  }
}

main();
