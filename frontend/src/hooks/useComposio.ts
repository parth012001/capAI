import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { composioService } from '../services/composioService';
import { useSmartPolling } from './useSmartPolling';

/**
 * Hook to get user's Composio integration status
 * Uses smart polling to check for status updates
 */
export function useComposioStatus() {
  const pollingConfig = useSmartPolling();

  return useQuery({
    queryKey: ['composio-status'],
    queryFn: () => composioService.getUserStatus(),
    refetchInterval: pollingConfig.refetchInterval,
    staleTime: pollingConfig.staleTime,
    gcTime: pollingConfig.cacheTime,
  });
}

/**
 * Hook to initiate Gmail connection via Composio
 * Opens OAuth in popup and waits for connection completion using Composio SDK
 */
export function useConnectGmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Step 1: Initiate connection to get redirect URL and connection request ID
      const { redirectUrl, connectionRequestId } = await composioService.connectGmail();

      // Step 2: Open OAuth popup
      const popup = window.open(redirectUrl, 'composio-oauth', 'width=600,height=700');

      // Step 3: Wait for connection completion (backend uses Composio SDK's waitForConnection)
      try {
        const result = await composioService.waitForConnection(connectionRequestId);

        // Close popup on success
        popup?.close();

        return result;
      } catch (error) {
        popup?.close();
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['composio-status'] });
      alert('Gmail connected successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Connection failed';
      alert(`Failed to connect Gmail: ${errorMessage}`);
    }
  });
}

/**
 * Hook to initiate Calendar connection via Composio
 * Opens OAuth in popup and waits for connection completion using Composio SDK
 */
export function useConnectCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Step 1: Initiate connection to get redirect URL and connection request ID
      const { redirectUrl, connectionRequestId } = await composioService.connectCalendar();

      // Step 2: Open OAuth popup
      const popup = window.open(redirectUrl, 'composio-oauth', 'width=600,height=700');

      // Step 3: Wait for connection completion (backend uses Composio SDK's waitForConnection)
      try {
        const result = await composioService.waitForConnection(connectionRequestId);

        // Close popup on success
        popup?.close();

        return result;
      } catch (error) {
        popup?.close();
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['composio-status'] });
      alert('Calendar connected successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Connection failed';
      alert(`Failed to connect Calendar: ${errorMessage}`);
    }
  });
}

/**
 * Hook to create Composio entity for user
 */
export function useCreateComposioEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => composioService.createEntity(),
    onSuccess: () => {
      // Invalidate status to refetch after entity creation
      queryClient.invalidateQueries({ queryKey: ['composio-status'] });
    },
  });
}

/**
 * Hook to check specific connection status
 */
export function useConnectionStatus(connectionId: string | undefined) {
  return useQuery({
    queryKey: ['composio-connection', connectionId],
    queryFn: () => composioService.getConnectionStatus(connectionId!),
    enabled: !!connectionId, // Only run query if connectionId is provided
    refetchInterval: 5000, // Check every 5 seconds when active
  });
}

/**
 * Hook to test email fetching (for development/testing)
 */
export function useTestEmailFetch() {
  return useMutation({
    mutationFn: (params?: { maxResults?: number; query?: string }) =>
      composioService.testFetchEmails(params),
  });
}
