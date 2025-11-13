import { Router, Request, Response } from 'express';
import { composioService } from '../services/composio';
import logger, { sanitizeUserId } from '../utils/pino-logger';
import { queryWithRetry } from '../database/connection';
const router = Router();

/**
 * POST /api/integrations/composio/entity
 * Create a Composio entity for the authenticated user
 */
router.post('/entity', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    logger.info({
      userId: sanitizeUserId(userId)
    }, 'composio.entity.create.request');

    // Create Composio entity
    const entityId = await composioService.createEntity(userId);

    // Update user record with Composio entity ID
    await queryWithRetry(
      'UPDATE user_gmail_tokens SET composio_entity_id = $1 WHERE user_id = $2',
      [entityId, userId]
    );

    logger.info({
      userId: sanitizeUserId(userId),
      entityId
    }, 'composio.entity.created');

    res.json({
      success: true,
      entityId
    });
  } catch (error: any) {
    logger.error({
      userId: sanitizeUserId(req.userId!),
      error: error instanceof Error ? error.message : String(error)
    }, 'composio.entity.create.failed');

    res.status(500).json({
      error: 'Failed to create Composio entity',
      message: error.message
    });
  }
});

/**
 * POST /api/integrations/gmail/connect
 * Initiate Gmail connection via Composio
 * Returns OAuth redirect URL for user to complete connection
 */
router.post('/gmail/connect', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    logger.info({
      userId: sanitizeUserId(userId)
    }, 'composio.gmail.connect.request');

    // Ensure user has Composio entity
    const userResult = await queryWithRetry(
      'SELECT composio_entity_id FROM user_gmail_tokens WHERE user_id = $1',
      [userId]
    );

    if (!userResult.rows[0]?.composio_entity_id) {
      // Create entity if doesn't exist
      const entityId = await composioService.createEntity(userId);
      await queryWithRetry(
        'UPDATE user_gmail_tokens SET composio_entity_id = $1 WHERE user_id = $2',
        [entityId, userId]
      );
    }

    // Initiate Gmail connection
    const { redirectUrl, connectionRequestId } = await composioService.initiateGmailConnection(userId);

    logger.info({
      userId: sanitizeUserId(userId),
      connectionRequestId
    }, 'composio.gmail.connect.initiated');

    res.json({
      success: true,
      redirectUrl,
      connectionRequestId
    });
  } catch (error: any) {
    logger.error({
      userId: sanitizeUserId(req.userId!),
      error: error instanceof Error ? error.message : String(error)
    }, 'composio.gmail.connect.failed');

    res.status(500).json({
      error: 'Failed to initiate Gmail connection',
      message: error.message
    });
  }
});

/**
 * POST /api/integrations/calendar/connect
 * Initiate Google Calendar connection via Composio
 * Returns OAuth redirect URL for user to complete connection
 */
router.post('/calendar/connect', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    logger.info({
      userId: sanitizeUserId(userId)
    }, 'composio.calendar.connect.request');

    // Ensure user has Composio entity
    const userResult = await queryWithRetry(
      'SELECT composio_entity_id FROM user_gmail_tokens WHERE user_id = $1',
      [userId]
    );

    if (!userResult.rows[0]?.composio_entity_id) {
      // Create entity if doesn't exist
      const entityId = await composioService.createEntity(userId);
      await queryWithRetry(
        'UPDATE user_gmail_tokens SET composio_entity_id = $1 WHERE user_id = $2',
        [entityId, userId]
      );
    }

    // Initiate Calendar connection
    const { redirectUrl, connectionRequestId } = await composioService.initiateCalendarConnection(userId);

    logger.info({
      userId: sanitizeUserId(userId),
      connectionRequestId
    }, 'composio.calendar.connect.initiated');

    res.json({
      success: true,
      redirectUrl,
      connectionRequestId
    });
  } catch (error: any) {
    logger.error({
      userId: sanitizeUserId(req.userId!),
      error: error instanceof Error ? error.message : String(error),
      stack: error?.stack,
      response: error?.response?.data
    }, 'composio.calendar.connect.failed');

    res.status(500).json({
      error: 'Failed to initiate Calendar connection',
      message: error.message || String(error),
      details: error?.response?.data || error?.message
    });
  }
});

/**
 * POST /api/integrations/connection/wait/:connectionRequestId
 * Wait for OAuth connection to complete and update database
 * This endpoint blocks until user completes OAuth (uses Composio SDK's waitForConnection)
 */
router.post('/connection/wait/:connectionRequestId', async (req: Request, res: Response) => {
  try {
    const { connectionRequestId } = req.params;
    const userId = req.userId!;

    logger.info({
      userId: sanitizeUserId(userId),
      connectionRequestId
    }, 'composio.connection.wait.request');

    // Wait for OAuth completion (this blocks until complete or timeout)
    const { connectedAccountId, status } = await composioService.waitForConnectionCompletion(
      connectionRequestId,
      userId
    );

    // Update database with connected account details
    await queryWithRetry(
      `UPDATE user_gmail_tokens
       SET composio_connected_account_id = $1,
           composio_connected_at = NOW(),
           auth_method = 'composio',
           migration_status = 'completed'
       WHERE user_id = $2`,
      [connectedAccountId, userId]
    );

    logger.info({
      userId: sanitizeUserId(userId),
      connectedAccountId,
      status
    }, 'composio.connection.wait.completed');

    res.json({
      success: true,
      connectedAccountId,
      status
    });
  } catch (error: any) {
    logger.error({
      userId: sanitizeUserId(req.userId!),
      connectionRequestId: req.params.connectionRequestId,
      error: error instanceof Error ? error.message : String(error)
    }, 'composio.connection.wait.failed');

    res.status(500).json({
      error: 'Failed to wait for connection',
      message: error.message
    });
  }
});

/**
 * GET /api/integrations/callback
 * Handle OAuth callback from Composio after user completes connection
 * Query params: connection_status, connectedAccountId
 * NOTE: This is now deprecated in favor of waitForConnection approach
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { connection_status, connectedAccountId } = req.query;

    logger.info({
      connectionStatus: connection_status,
      connectedAccountId
    }, 'composio.callback.received');

    if (connection_status === 'active' && connectedAccountId) {
      // Get connection details to determine which integration was connected
      const connectionStatus = await composioService.getConnectionStatus(connectedAccountId as string);

      logger.info({
        connectedAccountId,
        status: connectionStatus.status
      }, 'composio.callback.connection.verified');

      // Redirect to frontend success page
      res.redirect(`${process.env.FRONTEND_URL}/integrations/success?connection=${connectedAccountId}&status=${connection_status}`);
    } else {
      // Connection failed or cancelled
      logger.warn({
        connectionStatus: connection_status,
        connectedAccountId
      }, 'composio.callback.connection.failed');

      res.redirect(`${process.env.FRONTEND_URL}/integrations/error?reason=${connection_status}`);
    }
  } catch (error: any) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      query: req.query
    }, 'composio.callback.processing.failed');

    res.redirect(`${process.env.FRONTEND_URL}/integrations/error?reason=processing_failed`);
  }
});

/**
 * GET /api/integrations/status/:connectionId
 * Check the status of a specific connection
 */
router.get('/status/:connectionId', async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const userId = req.userId!;

    logger.info({
      userId: sanitizeUserId(userId),
      connectionId
    }, 'composio.status.check.request');

    const connectionStatus = await composioService.getConnectionStatus(connectionId);

    logger.info({
      userId: sanitizeUserId(userId),
      connectionId,
      status: connectionStatus.status
    }, 'composio.status.checked');

    res.json({
      success: true,
      connectionId,
      status: connectionStatus.status,
      connectedAccountId: connectionStatus.connectedAccountId
    });
  } catch (error: any) {
    logger.error({
      userId: sanitizeUserId(req.userId!),
      connectionId: req.params.connectionId,
      error: error instanceof Error ? error.message : String(error)
    }, 'composio.status.check.failed');

    res.status(500).json({
      error: 'Failed to check connection status',
      message: error.message
    });
  }
});

/**
 * GET /api/integrations/user/status
 * Get connection status for the authenticated user
 */
router.get('/user/status', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    logger.info({
      userId: sanitizeUserId(userId)
    }, 'composio.user.status.request');

    // Get user's Composio entity and connection status from database
    const userResult = await queryWithRetry(
      'SELECT composio_entity_id, composio_connected_account_id, auth_method, migration_status FROM user_gmail_tokens WHERE user_id = $1',
      [userId]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    logger.info({
      userId: sanitizeUserId(userId),
      hasEntity: !!user.composio_entity_id,
      authMethod: user.auth_method,
      migrationStatus: user.migration_status
    }, 'composio.user.status.retrieved');

    res.json({
      success: true,
      hasComposioEntity: !!user.composio_entity_id,
      entityId: user.composio_entity_id,
      connectedAccountId: user.composio_connected_account_id,
      authMethod: user.auth_method || 'google_oauth',
      migrationStatus: user.migration_status || 'pending'
    });
  } catch (error: any) {
    logger.error({
      userId: sanitizeUserId(req.userId!),
      error: error instanceof Error ? error.message : String(error)
    }, 'composio.user.status.failed');

    res.status(500).json({
      error: 'Failed to get user integration status',
      message: error.message
    });
  }
});

/**
 * POST /api/integrations/sync
 * Sync connected accounts from Composio API to database
 * This fetches the actual connected account IDs from Composio and updates the database
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    logger.info({
      userId: sanitizeUserId(userId)
    }, 'composio.sync.request');

    // Fetch all connected accounts for this user from Composio
    const accounts = await composioService.getConnectedAccountsForUser(userId);

    if (!accounts || accounts.length === 0) {
      logger.warn({
        userId: sanitizeUserId(userId)
      }, 'composio.sync.no.accounts');

      return res.json({
        success: true,
        message: 'No connected accounts found in Composio',
        accounts: []
      });
    }

    // Find the most recent active Gmail and Calendar connections
    const gmailAccounts = accounts.filter((acc: any) =>
      acc.toolkit?.slug === 'gmail' && acc.status === 'ACTIVE'
    ).sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const calendarAccounts = accounts.filter((acc: any) =>
      acc.toolkit?.slug === 'googlecalendar' && acc.status === 'ACTIVE'
    ).sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const latestGmail = gmailAccounts[0];
    const latestCalendar = calendarAccounts[0];

    // Update database with the most recent connected account ID
    const connectedAccountId = latestGmail?.id || latestCalendar?.id;

    if (connectedAccountId) {
      await queryWithRetry(
        `UPDATE user_gmail_tokens
         SET composio_connected_account_id = $1,
             composio_connected_at = NOW(),
             auth_method = 'composio',
             migration_status = 'completed'
         WHERE user_id = $2`,
        [connectedAccountId, userId]
      );

      logger.info({
        userId: sanitizeUserId(userId),
        connectedAccountId,
        gmailAccounts: gmailAccounts.length,
        calendarAccounts: calendarAccounts.length
      }, 'composio.sync.completed');

      res.json({
        success: true,
        message: 'Connected accounts synced successfully',
        connectedAccountId,
        accounts: {
          gmail: gmailAccounts.map((a: any) => ({ id: a.id, status: a.status, createdAt: a.createdAt })),
          calendar: calendarAccounts.map((a: any) => ({ id: a.id, status: a.status, createdAt: a.createdAt }))
        }
      });
    } else {
      logger.warn({
        userId: sanitizeUserId(userId),
        totalAccounts: accounts.length
      }, 'composio.sync.no.active.accounts');

      res.json({
        success: false,
        message: 'No active Gmail or Calendar accounts found',
        accounts: accounts.map((a: any) => ({
          id: a.id,
          toolkit: a.toolkit?.slug,
          status: a.status,
          createdAt: a.createdAt
        }))
      });
    }
  } catch (error: any) {
    logger.error({
      userId: sanitizeUserId(req.userId!),
      error: error instanceof Error ? error.message : String(error)
    }, 'composio.sync.failed');

    res.status(500).json({
      error: 'Failed to sync connected accounts',
      message: error.message
    });
  }
});

/**
 * POST /api/integrations/test/fetch-emails
 * Test endpoint to verify Composio Gmail integration works
 */
router.post('/test/fetch-emails', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { maxResults = 10, query = '' } = req.body;

    logger.info({
      userId: sanitizeUserId(userId),
      maxResults,
      query
    }, 'composio.test.fetch.request');

    const emails = await composioService.fetchEmails(userId, { maxResults, query });

    logger.info({
      userId: sanitizeUserId(userId),
      emailCount: Array.isArray(emails?.messages) ? emails.messages.length : 0
    }, 'composio.test.fetch.success');

    res.json({
      success: true,
      emails
    });
  } catch (error: any) {
    logger.error({
      userId: sanitizeUserId(req.userId!),
      error: error instanceof Error ? error.message : String(error)
    }, 'composio.test.fetch.failed');

    res.status(500).json({
      error: 'Failed to fetch emails via Composio',
      message: error.message
    });
  }
});

export default router;
