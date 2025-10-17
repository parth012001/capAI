/**
 * Feature Flags Configuration
 *
 * Centralized feature toggle system for managing beta/experimental features.
 * Senior Engineer Pattern: Easy to enable/disable features without code changes.
 *
 * Usage:
 * - Set to `false` to disable feature in production
 * - Set to `true` to enable feature after testing
 * - Can be overridden by environment variables in the future
 */

export interface FeatureFlags {
  /** Voice-based email search and commands (Beta) */
  voiceSearch: boolean;

  /** Advanced semantic email search (Beta) */
  semanticSearch: boolean;
}

/**
 * Default feature flags
 * Change these values to enable/disable features globally
 */
export const features: FeatureFlags = {
  // Voice Search - DISABLED for initial launch
  // TODO: Re-enable after voice UX improvements and testing
  voiceSearch: false,

  // Semantic Search - DISABLED for initial launch
  // TODO: Re-enable after search performance optimization
  semanticSearch: false,
};

/**
 * Helper function to check if a feature is enabled
 * Future: Can add user-specific overrides or A/B testing logic here
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  // Future enhancement: Check environment variables
  // const envOverride = process.env[`REACT_APP_FEATURE_${feature.toUpperCase()}`];
  // if (envOverride !== undefined) return envOverride === 'true';

  return features[feature];
}

/**
 * Get user-friendly message for disabled features
 */
export function getFeatureMessage(feature: keyof FeatureFlags): string {
  const messages: Record<keyof FeatureFlags, string> = {
    voiceSearch: 'Voice Search is coming soon! We\'re working on improvements.',
    semanticSearch: 'Advanced Search is coming soon! We\'re optimizing performance.',
  };

  return messages[feature] || 'This feature is currently unavailable.';
}
