// ──────────────────────────────────────────────
// Server entry point
// ──────────────────────────────────────────────

import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { config } from './config/index.js';
import { logger } from './config/logger.js';

async function main(): Promise<void> {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`🚀 CollectorHub API running on port ${config.port}`);
      logger.info(`   Environment: ${config.env}`);
      logger.info(`   Health check: http://localhost:${config.port}/api/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDatabase();
        logger.info('Server closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
