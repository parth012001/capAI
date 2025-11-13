import { api } from './api';

export interface ComposioConnectionResponse {
  success: boolean;
  redirectUrl: string;
  connectionRequestId: string;
}

export interface ComposioStatusResponse {
  success: boolean;
  hasComposioEntity: boolean;
  entityId?: string;
  connectedAccountId?: string;
  authMethod: 'google_oauth' | 'composio';
  migrationStatus: 'pending' | 'in_progress' | 'completed';
}

export interface ComposioConnectionStatusResponse {
  success: boolean;
  connectionId: string;
  status: string;
  connectedAccountId?: string;
}

export const composioService = {
  /**
   * Create Composio entity for current user
   */
  createEntity: async () => {
    const response = await api.post('/api/integrations/composio/entity');
    return response.data;
  },

  /**
   * Initiate Gmail connection via Composio OAuth
   * Returns redirect URL for user to complete OAuth
   */
  connectGmail: async (): Promise<ComposioConnectionResponse> => {
    const response = await api.post('/api/integrations/gmail/connect');
    return response.data;
  },

  /**
   * Initiate Calendar connection via Composio OAuth
   * Returns redirect URL for user to complete OAuth
   */
  connectCalendar: async (): Promise<ComposioConnectionResponse> => {
    const response = await api.post('/api/integrations/calendar/connect');
    return response.data;
  },

  /**
   * Get user's Composio integration status
   */
  getUserStatus: async (): Promise<ComposioStatusResponse> => {
    const response = await api.get('/api/integrations/user/status');
    return response.data;
  },

  /**
   * Check specific connection status
   */
  getConnectionStatus: async (connectionId: string): Promise<ComposioConnectionStatusResponse> => {
    const response = await api.get(`/api/integrations/status/${connectionId}`);
    return response.data;
  },

  /**
   * Wait for connection completion
   */
  waitForConnection: async (connectionRequestId: string) => {
    const response = await api.post(`/api/integrations/connection/wait/${connectionRequestId}`);
    return response.data;
  },

  /**
   * Test email fetching via Composio (development/testing)
   */
  testFetchEmails: async (params?: { maxResults?: number; query?: string }) => {
    const response = await api.post('/api/integrations/test/fetch-emails', params);
    return response.data;
  },
};
