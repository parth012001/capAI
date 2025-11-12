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
 * Opens OAuth in popup and polls for connection completion
 */
export function useConnectGmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => composioService.connectGmail(),
    onSuccess: (data) => {
      if (data.redirectUrl) {
        // Open Composio OAuth in popup
        const popup = window.open(data.redirectUrl, 'composio-oauth', 'width=600,height=700');

        // Poll for connection status
        const pollInterval = setInterval(async () => {
          try {
            const status = await composioService.getUserStatus();
            if (status.connectedAccountId) {
              // Connection successful!
              clearInterval(pollInterval);
              popup?.close();
              queryClient.invalidateQueries({ queryKey: ['composio-status'] });
              alert('Gmail connected successfully!');
            }
          } catch (error) {
            // Continue polling
          }
        }, 2000); // Poll every 2 seconds

        // Stop polling after 2 minutes
        setTimeout(() => clearInterval(pollInterval), 120000);
      }
    },
  });
}

/**
 * Hook to initiate Calendar connection via Composio
 * Opens OAuth in popup and polls for connection completion
 */
export function useConnectCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => composioService.connectCalendar(),
    onSuccess: (data) => {
      if (data.redirectUrl) {
        // Open Composio OAuth in popup
        const popup = window.open(data.redirectUrl, 'composio-oauth', 'width=600,height=700');

        // Poll for connection status
        const pollInterval = setInterval(async () => {
          try {
            const status = await composioService.getUserStatus();
            if (status.connectedAccountId) {
              // Connection successful!
              clearInterval(pollInterval);
              popup?.close();
              queryClient.invalidateQueries({ queryKey: ['composio-status'] });
              alert('Calendar connected successfully!');
            }
          } catch (error) {
            // Continue polling
          }
        }, 2000); // Poll every 2 seconds

        // Stop polling after 2 minutes
        setTimeout(() => clearInterval(pollInterval), 120000);
      }
    },
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
