import { POLLING_CONFIG } from '../lib/constants';

/**
 * Hook to provide fixed polling configuration
 * Simplified from smart polling to use consistent intervals
 * This reduces unnecessary webhook status polling overhead
 */
export function useSmartPolling() {
  // Return fixed configuration - no webhook dependency needed
  return {
    refetchInterval: POLLING_CONFIG.FIXED_INTERVAL,
    staleTime: POLLING_CONFIG.FIXED_STALE_TIME,
    cacheTime: POLLING_CONFIG.CACHE_TIME,
    reason: 'fixed-interval'
  };
}

/**
 * Hook to get polling status for debugging/display
 * Simplified to return fixed status without webhook dependency
 */
export function usePollingStatus() {
  const pollingConfig = useSmartPolling();

  return {
    isActive: false, // No longer using "active" polling
    interval: pollingConfig.refetchInterval,
    reason: pollingConfig.reason,
    webhookHealth: 'not-monitored', // No longer monitoring webhook health via polling
    timeSinceLastWebhook: null
  };
}
