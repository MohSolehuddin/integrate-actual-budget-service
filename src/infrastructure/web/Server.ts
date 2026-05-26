import fastifyJwt from '@fastify/jwt';
import Fastify from 'fastify';
import * as argon2 from 'argon2';
import { setupRoutes } from '../../interfaces/http/routes';
import { ActualBudgetService } from '../actual-budget/ActualBudgetService';

export async function createServer() {
  const server = Fastify({
    logger: true,
  });

  // Register JWT plugin
  const jwtSecret = process.env.JWT_SECRET || 'super-secret-key-change-me-in-production';
  server.register(fastifyJwt, {
    secret: jwtSecret,
  });

  // Initialize Actual Budget Service
  const actualServerUrl = process.env.ACTUAL_SERVER_URL || '';
  const actualPassword = process.env.ACTUAL_PASSWORD;
  const actualSyncId = process.env.ACTUAL_SYNC_ID || '';
  const dataDir = process.env.ACTUAL_DATA_DIR || './budget-data';

  const actualBudgetService = new ActualBudgetService(
    actualServerUrl,
    actualPassword,
    actualSyncId,
    dataDir
  );

  try {
    if (actualServerUrl && actualSyncId) {
      server.log.info('Initializing Actual Budget...');
      await actualBudgetService.init();
      await actualBudgetService.downloadBudget();
      server.log.info('Actual Budget initialized successfully.');
    } else {
      server.log.warn('Actual Budget initialization skipped: ACTUAL_SERVER_URL or ACTUAL_SYNC_ID is missing.');
    }
  } catch (error) {
    server.log.error(`Failed to initialize Actual Budget ${error}`);
  }

  // Initialize Database
  const { sequelize } = await import('../database/sequelize');
  const { UserModel } = await import('../database/sequelize/models/UserModel');
  
  try {
    server.log.info('Syncing Database...');
    await sequelize.sync();
    server.log.info('Database synced successfully.');

    // Seed initial admin user if not exists
    const adminCount = await UserModel.count({ where: { username: 'admin' } });
    if (adminCount === 0) {
      server.log.info('Seeding initial admin user...');
      const hashedPassword = await argon2.hash('secret');
      await UserModel.create({
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
      });
      server.log.info('Admin user seeded with username "admin" and password "secret".');
    }
  } catch (error) {
    server.log.error(`Failed to sync database ${error}`);
  }

  // Setup Routes
  await setupRoutes(server, actualBudgetService);

  // Graceful shutdown for Actual Budget
  server.addHook('onClose', async () => {
    server.log.info('Shutting down Actual Budget...');
    await actualBudgetService.shutdown();
  });

  return server;
}
