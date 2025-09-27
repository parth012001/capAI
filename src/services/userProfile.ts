import { Pool } from 'pg';

export interface UserProfile {
  userId: string;
  gmailAddress: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  onboardingCompleted: boolean;
  schedulingLink?: string;
  schedulingLinkVerified?: boolean;
  schedulingLinkAddedAt?: Date;
}

export class UserProfileService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get user profile by user ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const query = `
        SELECT user_id, gmail_address, first_name, last_name, full_name, onboarding_completed,
               scheduling_link, scheduling_link_verified, scheduling_link_added_at
        FROM user_gmail_tokens
        WHERE user_id = $1
      `;
      
      const result = await this.pool.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        userId: row.user_id,
        gmailAddress: row.gmail_address,
        firstName: row.first_name,
        lastName: row.last_name,
        fullName: row.full_name,
        onboardingCompleted: row.onboarding_completed,
        schedulingLink: row.scheduling_link,
        schedulingLinkVerified: row.scheduling_link_verified,
        schedulingLinkAddedAt: row.scheduling_link_added_at
      };
    } catch (error) {
      console.error('❌ Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Get user signature for AI draft generation
   */
  async getUserSignature(userId: string): Promise<string> {
    try {
      const profile = await this.getUserProfile(userId);
      
      if (!profile || !profile.firstName) {
        // Fallback to email-based name extraction
        const emailName = profile?.gmailAddress?.split('@')[0] || 'User';
        return `Best regards,\n${emailName}`;
      }
      
      // Use the actual name from onboarding
      return `Best regards,\n${profile.firstName}`;
    } catch (error) {
      console.error('❌ Error getting user signature:', error);
      return 'Best regards,\nUser';
    }
  }

  /**
   * Check if user has completed profile setup (has name data)
   */
  async hasCompleteProfile(userId: string): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(userId);
      return profile?.onboardingCompleted === true && !!profile?.firstName;
    } catch (error) {
      console.error('❌ Error checking profile completion:', error);
      return false;
    }
  }

  /**
   * Update user's scheduling link
   */
  async updateSchedulingLink(userId: string, schedulingLink: string, isVerified: boolean = false): Promise<boolean> {
    try {
      const query = `
        UPDATE user_gmail_tokens
        SET scheduling_link = $2,
            scheduling_link_verified = $3,
            scheduling_link_added_at = CASE
              WHEN scheduling_link IS NULL THEN NOW()
              ELSE scheduling_link_added_at
            END,
            updated_at = NOW()
        WHERE user_id = $1
      `;

      const result = await this.pool.query(query, [userId, schedulingLink, isVerified]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('❌ Error updating scheduling link:', error);
      return false;
    }
  }

  /**
   * Get user's scheduling link if available
   */
  async getSchedulingLink(userId: string): Promise<string | null> {
    try {
      const profile = await this.getUserProfile(userId);
      return profile?.schedulingLink || null;
    } catch (error) {
      console.error('❌ Error getting scheduling link:', error);
      return null;
    }
  }

  /**
   * Check if user has a verified scheduling link
   */
  async hasVerifiedSchedulingLink(userId: string): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(userId);
      return !!(profile?.schedulingLink && profile?.schedulingLinkVerified);
    } catch (error) {
      console.error('❌ Error checking verified scheduling link:', error);
      return false;
    }
  }
}
