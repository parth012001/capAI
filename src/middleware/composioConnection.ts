import { Request, Response, NextFunction } from 'express';
import { queryWithRetry } from '../database/connection';
import { logger, sanitizeUserId } from '../utils/pino-logger';

/**
 * Composio Connection Middleware
 *
 * Ensures that the user has connected their account via Composio before
 * accessing protected API routes that require email/calendar access.
 *
 * This middleware is applied to routes that use the provider abstraction
 * (EmailProvider, CalendarProvider) which require Composio connection.
 *
 * Usage:
 * app.get('/api/emails', authMiddleware.authenticate, requireComposioConnection, handler);
 *
 * Returns 403 with needsConnection: true if user hasn't connected via Composio.
 */
export async function requireComposioConnection(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // User ID is set by authMiddleware.authenticate which runs before this
    const userId = (req as any).userId;

    if (!userId) {
      logger.error({ path: req.path }, 'composio.middleware.no_user_id');
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
      return;
    }

    // Check if user has Composio connection
    const result = await queryWithRetry(
      `SELECT composio_connected_account_id, auth_method, migration_status
       FROM user_gmail_tokens
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      logger.warn({
        userId: sanitizeUserId(userId),
        path: req.path
      }, 'composio.middleware.user_not_found');

      res.status(403).json({
        error: 'Connection required',
        message: 'User record not found',
        needsConnection: true
      });
      return;
    }

    const user = result.rows[0];
    const hasComposioConnection = user.composio_connected_account_id !== null;

    if (!hasComposioConnection) {
      logger.info({
        userId: sanitizeUserId(userId),
        authMethod: user.auth_method,
        migrationStatus: user.migration_status,
        path: req.path
      }, 'composio.middleware.connection_required');

      res.status(403).json({
        error: 'Connection required',
        message: 'Please connect your account via Composio to access this feature',
        needsConnection: true,
        authMethod: user.auth_method,
        migrationStatus: user.migration_status
      });
      return;
    }

    // User has Composio connection - allow through
    logger.debug({
      userId: sanitizeUserId(userId),
      connectedAccountId: user.composio_connected_account_id,
      path: req.path
    }, 'composio.middleware.connection_verified');

    next();
  } catch (error: any) {
    logger.error({
      error: error.message,
      path: req.path
    }, 'composio.middleware.error');

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify connection status'
    });
  }
}

/**
 * Optional Composio Connection Middleware
 *
 * Similar to requireComposioConnection but doesn't block the request.
 * Instead, it sets req.hasComposioConnection flag for conditional logic.
 *
 * Usage:
 * app.get('/api/settings', authMiddleware.authenticate, checkComposioConnection, handler);
 *
 * Handler can check: if (req.hasComposioConnection) { ... }
 */
export async function checkComposioConnection(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      (req as any).hasComposioConnection = false;
      next();
      return;
    }

    const result = await queryWithRetry(
      `SELECT composio_connected_account_id
       FROM user_gmail_tokens
       WHERE user_id = $1`,
      [userId]
    );

    const hasConnection = result.rows.length > 0 &&
                         result.rows[0].composio_connected_account_id !== null;

    (req as any).hasComposioConnection = hasConnection;

    logger.debug({
      userId: sanitizeUserId(userId),
      hasConnection,
      path: req.path
    }, 'composio.middleware.check_completed');

    next();
  } catch (error: any) {
    logger.error({
      error: error.message,
      path: req.path
    }, 'composio.middleware.check_error');

    // Don't block request on error - assume no connection
    (req as any).hasComposioConnection = false;
    next();
  }
}
