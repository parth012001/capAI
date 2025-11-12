import dotenv from 'dotenv';
dotenv.config();
import { Composio } from '@composio/core';

(async () => {
  const c = new Composio({apiKey: process.env.COMPOSIO_API_KEY!});
  const conn: any = await c.connectedAccounts.initiate({
    integrationId: 'googlecalendar',
    entityId: 'test_' + Date.now(),
    redirectUrl: 'http://localhost:5173/integrations/callback',
    authConfig: 'ac_k53apWo91X9Y'
  });
  console.log('✅ SUCCESS with @composio/core!');
  console.log('Redirect:', conn.redirectUrl);
})();
