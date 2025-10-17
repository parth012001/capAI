/**
 * Centralized Pino Logger for Chief AI
 *
 * Provides structured logging with automatic metadata enrichment.
 * Optimized for Railway deployment with JSON output in production.
 *
 * Usage:
 *   import { logger } from '../utils/pino-logger';
 *
 *   logger.info({ userId, emailCount: 5 }, 'emails.fetched');
 *   logger.error({ userId, error: error.message }, 'email.fetch.failed');
 *
 *   const childLogger = logger.child({ service: 'GmailService' });
 *   childLogger.info({ operation: 'fetchEmails' }, 'operation.started');
 */

import pino from 'pino';

// Determine environment
const isDevelopment = process.env.NODE_ENV !== 'production';
const logLevel = (process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info')) as pino.Level;

// Create base logger configuration
const pinoConfig: pino.LoggerOptions = {
  level: logLevel,

  // Base configuration for all environments
  base: {
    pid: process.pid,
    hostname: process.env.HOSTNAME || 'chief-ai',
    env: process.env.NODE_ENV || 'development'
  },

  // Custom timestamp format (ISO 8601)
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,

  // Format error objects properly
  serializers: {
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },

  // Redact sensitive fields
  redact: {
    paths: [
      'password',
      'accessToken',
      'refreshToken',
      'access_token',
      'refresh_token',
      'authorization',
      'cookie',
      'JWT',
      '*.password',
      '*.token',
      '*.accessToken',
      '*.refreshToken'
    ],
    censor: '[REDACTED]'
  }
};

// Add pretty printing in development
const transport = isDevelopment
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname',
        singleLine: false,
        messageFormat: '{msg} {if context}| {context}{end}',
      }
    }
  : undefined;

// Create logger instance
export const logger = pino({
  ...pinoConfig,
  transport
});

/**
 * Create a child logger with default context
 * Useful for adding service-specific context to all logs
 *
 * @param context - Default context to include in all logs
 * @example
 *   const gmailLogger = createChildLogger({ service: 'GmailService' });
 *   gmailLogger.info({ userId: '123' }, 'user.initialized');
 */
export function createChildLogger(context: Record<string, any>) {
  return logger.child(context);
}

/**
 * Log an operation with timing
 * Automatically calculates and logs duration
 *
 * @param operation - Operation name
 * @param fn - Function to execute and time
 * @param context - Additional context to log
 * @example
 *   await logOperation('fetchEmails', async () => {
 *     return await gmail.fetchEmails();
 *   }, { userId: '123' });
 */
export async function logOperation<T>(
  operation: string,
  fn: () => Promise<T>,
  context: Record<string, any> = {}
): Promise<T> {
  const startTime = Date.now();

  logger.debug({ ...context, operation }, `${operation}.started`);

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    logger.info({ ...context, operation, duration, status: 'success' }, `${operation}.completed`);

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error({
      ...context,
      operation,
      duration,
      status: 'error',
      error: error instanceof Error ? {
        message: error.message,
        stack: isDevelopment ? error.stack : undefined,
        code: (error as any).code
      } : String(error)
    }, `${operation}.failed`);

    throw error;
  }
}

/**
 * Sanitize user ID for logging (shorten for readability)
 * @param userId - Full user ID
 * @returns Shortened user ID for logs
 */
export function sanitizeUserId(userId: string): string {
  if (!userId) return 'unknown';
  return userId.length > 16 ? `${userId.substring(0, 8)}...${userId.substring(userId.length - 4)}` : userId;
}

/**
 * Log levels explanation:
 *
 * - fatal: Application crash, cannot continue
 * - error: Operation failed, needs attention (e.g., API error, DB error)
 * - warn: Degraded performance, fallback used, retry attempted
 * - info: Important business events (email fetched, meeting detected, draft created)
 * - debug: Detailed operational info for debugging (only in dev by default)
 * - trace: Very verbose debugging (not used in this app)
 */

export default logger;
