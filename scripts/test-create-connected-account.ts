import dotenv from 'dotenv';
dotenv.config();
import { Composio } from '@composio/core';

(async () => {
  const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY! });

  const connectionRequest = await composio.createConnectedAccount(
    'test_user_' + Date.now(),
    'ac_k53apWo91X9Y',
    {
      redirectUrl: 'http://localhost:5173/integrations/callback'
    }
  );

  console.log('✅ SUCCESS with createConnectedAccount!');
  console.log('Redirect URL:', connectionRequest.redirectUrl);
})();
