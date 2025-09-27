/**
 * Scheduling Link Validation Utilities
 * Validates scheduling platform links (Calendly, Cal.com, etc.)
 */

export interface ValidationResult {
  isValid: boolean;
  isSchedulingPlatform: boolean;
  isAccessible?: boolean;
  platform?: string;
  error?: string;
}

export class SchedulingLinkValidator {

  // Known scheduling platforms
  private static readonly SCHEDULING_PLATFORMS = [
    { name: 'Calendly', patterns: ['calendly.com'] },
    { name: 'Cal.com', patterns: ['cal.com'] },
    { name: 'Acuity Scheduling', patterns: ['acuityscheduling.com'] },
    { name: 'Microsoft Bookings', patterns: ['bookings.microsoft.com'] },
    { name: 'TidyCal', patterns: ['tidycal.com'] },
    { name: 'YouCanBook.me', patterns: ['youcanbook.me'] },
    { name: 'Koalendar', patterns: ['koalendar.com'] },
    { name: 'SimplyBook.me', patterns: ['simplybook.me'] },
    { name: 'Appointlet', patterns: ['appt.link'] }
  ];

  /**
   * Validate if the provided URL is a valid format
   */
  private static isValidURL(url: string): boolean {
    try {
      const urlObject = new URL(url);
      return urlObject.protocol === 'http:' || urlObject.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Check if URL belongs to a known scheduling platform
   */
  private static getSchedulingPlatform(url: string): { isSchedulingPlatform: boolean; platform?: string } {
    const urlLower = url.toLowerCase();

    for (const platform of this.SCHEDULING_PLATFORMS) {
      const isMatch = platform.patterns.some(pattern =>
        urlLower.includes(pattern.toLowerCase())
      );

      if (isMatch) {
        return { isSchedulingPlatform: true, platform: platform.name };
      }
    }

    return { isSchedulingPlatform: false };
  }

  /**
   * Test if the scheduling link is accessible (optional check)
   */
  private static async isLinkAccessible(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ChiefAI/1.0; +https://chief-ai.com)'
        }
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn('Link accessibility check failed:', error);
      return false; // Don't fail validation if we can't check accessibility
    }
  }

  /**
   * Main validation method
   */
  static async validateSchedulingLink(url: string, checkAccessibility: boolean = true): Promise<ValidationResult> {
    // Step 1: Basic URL format validation
    if (!this.isValidURL(url)) {
      return {
        isValid: false,
        isSchedulingPlatform: false,
        error: 'Invalid URL format'
      };
    }

    // Step 2: Check if it's a scheduling platform
    const platformCheck = this.getSchedulingPlatform(url);
    if (!platformCheck.isSchedulingPlatform) {
      return {
        isValid: false,
        isSchedulingPlatform: false,
        error: 'URL is not from a recognized scheduling platform'
      };
    }

    // Step 3: Optional accessibility check
    let isAccessible = undefined;
    if (checkAccessibility) {
      isAccessible = await this.isLinkAccessible(url);
    }

    return {
      isValid: true,
      isSchedulingPlatform: true,
      isAccessible,
      platform: platformCheck.platform
    };
  }

  /**
   * Quick validation without accessibility check
   */
  static validateSchedulingLinkQuick(url: string): ValidationResult {
    if (!this.isValidURL(url)) {
      return {
        isValid: false,
        isSchedulingPlatform: false,
        error: 'Invalid URL format'
      };
    }

    const platformCheck = this.getSchedulingPlatform(url);
    if (!platformCheck.isSchedulingPlatform) {
      return {
        isValid: false,
        isSchedulingPlatform: false,
        error: 'URL is not from a recognized scheduling platform'
      };
    }

    return {
      isValid: true,
      isSchedulingPlatform: true,
      platform: platformCheck.platform
    };
  }

  /**
   * Get list of supported scheduling platforms
   */
  static getSupportedPlatforms(): string[] {
    return this.SCHEDULING_PLATFORMS.map(platform => platform.name);
  }
}