/**
 * Redis Connection Utility
 *
 * Provides Redis client for:
 * - Webhook idempotency locks
 * - Distributed rate limiting
 * - Caching (future)
 *
 * Gracefully degrades if Redis is unavailable (dev mode)
 */

import Redis from 'ioredis';
import { logger } from './logger';
import { env } from '../config/environment';

class RedisClient {
  private client: Redis | null = null;
  private isAvailable: boolean = false;

  constructor() {
    this.connect();
  }

  /**
   * Connect to Redis with graceful degradation
   */
  private connect(): void {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          // Stop retrying after 3 attempts
          if (times > 3) {
            return null;
          }
          // Wait 1 second between retries
          return 1000;
        },
        lazyConnect: true, // Don't connect immediately
      });

      // Handle connection events
      this.client.on('connect', () => {
        this.isAvailable = true;
        logger.info('✅ [REDIS] Connected successfully');
      });

      this.client.on('error', (err) => {
        this.isAvailable = false;

        if (env.NODE_ENV === 'development') {
          logger.warn('⚠️  [REDIS] Not available (optional in development):', err.message);
        } else {
          logger.error('❌ [REDIS] Connection error (required in production):', err);
        }
      });

      this.client.on('close', () => {
        this.isAvailable = false;
        logger.warn('⚠️  [REDIS] Connection closed');
      });

      // Attempt connection
      this.client.connect().catch((err) => {
        this.isAvailable = false;
        if (env.NODE_ENV === 'development') {
          logger.warn('⚠️  [REDIS] Not available - continuing without Redis (webhook locks disabled)');
          logger.warn('   To enable Redis: Install Redis locally or set REDIS_URL environment variable');
        } else {
          logger.error('❌ [REDIS] Failed to connect (production requires Redis):', err);
        }
      });

    } catch (error) {
      this.isAvailable = false;
      logger.error('❌ [REDIS] Initialization failed:', error);
    }
  }

  /**
   * Check if Redis is available
   */
  isConnected(): boolean {
    return this.isAvailable && this.client !== null;
  }

  /**
   * Acquire a distributed lock (for webhook idempotency)
   * Returns true if lock was acquired, false if already locked
   */
  async acquireLock(key: string, ttlSeconds: number = 60): Promise<boolean> {
    if (!this.isConnected()) {
      // Graceful degradation: allow operation if Redis unavailable
      logger.debug('[REDIS] Lock check skipped (Redis unavailable)');
      return true;
    }

    try {
      const result = await this.client!.set(
        key,
        '1',
        'EX', ttlSeconds,
        'NX' // Only set if not exists
      );

      return result === 'OK';
    } catch (error) {
      logger.error('[REDIS] Failed to acquire lock:', error);
      // Allow operation on Redis error (fail open, not fail closed)
      return true;
    }
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(key: string): Promise<void> {
    if (!this.isConnected()) {
      return;
    }

    try {
      await this.client!.del(key);
    } catch (error) {
      logger.error('[REDIS] Failed to release lock:', error);
    }
  }

  /**
   * Set a value with expiration
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected()) {
      return;
    }

    try {
      if (ttlSeconds) {
        await this.client!.setex(key, ttlSeconds, value);
      } else {
        await this.client!.set(key, value);
      }
    } catch (error) {
      logger.error('[REDIS] Failed to set value:', error);
    }
  }

  /**
   * Get a value
   */
  async get(key: string): Promise<string | null> {
    if (!this.isConnected()) {
      return null;
    }

    try {
      return await this.client!.get(key);
    } catch (error) {
      logger.error('[REDIS] Failed to get value:', error);
      return null;
    }
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<void> {
    if (!this.isConnected()) {
      return;
    }

    try {
      await this.client!.del(key);
    } catch (error) {
      logger.error('[REDIS] Failed to delete key:', error);
    }
  }

  /**
   * Gracefully close Redis connection
   */
  async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        logger.info('✅ [REDIS] Connection closed gracefully');
      } catch (error) {
        logger.error('❌ [REDIS] Error closing connection:', error);
      }
    }
  }
}

// Export singleton instance
export const redis = new RedisClient();
export default redis;
