import dotenv from 'dotenv';
dotenv.config();
import { Composio } from 'composio-core';

(async () => {
  const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY! });
  const conn: any = await composio.connectedAccounts.initiate({
    integrationId: 'googlecalendar',
    entityId: 'test_' + Date.now(),
    redirectUrl: process.env.FRONTEND_URL + '/integrations/callback',
    authConfig: 'ac_k53apWo91X9Y'
  });
  console.log('✅ Calendar connection works!');
  console.log('Redirect URL:', conn.redirectUrl);
})();
