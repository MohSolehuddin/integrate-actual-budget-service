import fastifyJwt from '@fastify/jwt';
import Fastify from 'fastify';
import * as argon2 from 'argon2';
import { setupRoutes } from '../../interfaces/http/routes';
import { ActualBudgetService } from '../actual-budget/ActualBudgetService';
import { MockBudgetService } from '../actual-budget/MockBudgetService';
import { createPostgresPool, initPostgresTables } from '../database/postgres';
import { BudgetRepository } from '../database/postgres/repositories/BudgetRepository';
import { BudgetService } from '../../application/services/BudgetService';
import { TelegramBotService } from '../telegram/TelegramBotService';

export async function createServer() {
  const server = Fastify({
    logger: true,
  });

  // Register JWT plugin
  const jwtSecret = process.env.JWT_SECRET || 'super-secret-key-change-me-in-production';
  server.register(fastifyJwt, {
    secret: jwtSecret,
  });

  // ─── Initialize Actual Budget Service ───
  const actualServerUrl = process.env.ACTUAL_SERVER_URL || '';
  const actualPassword = process.env.ACTUAL_PASSWORD;
  const actualSyncId = process.env.ACTUAL_SYNC_ID || '';
  const dataDir = process.env.ACTUAL_DATA_DIR || './budget-data';

  let actualBudgetService;
  if (actualServerUrl && actualSyncId) {
    actualBudgetService = new ActualBudgetService(actualServerUrl, actualPassword, actualSyncId, dataDir);
    try {
      server.log.info('Initializing Actual Budget...');
      await actualBudgetService.init();
      await actualBudgetService.downloadBudget();
      server.log.info('Actual Budget initialized successfully.');
    } catch (error) {
      server.log.error(`Failed to initialize Actual Budget ${error}`);
      actualBudgetService = new MockBudgetService();
      server.log.warn('Falling back to MockBudgetService');
    }
  } else {
    actualBudgetService = new MockBudgetService();
    server.log.info('Using MockBudgetService (no actual budget connection)');
  }

  // ─── Initialize PostgreSQL ───
  const pgPool = createPostgresPool();
  const budgetRepo = new BudgetRepository(pgPool);
  const budgetService = new BudgetService(pgPool, budgetRepo);

  try {
    server.log.info('Initializing PostgreSQL tables...');
    await initPostgresTables(pgPool);
    server.log.info('PostgreSQL tables initialized.');
  } catch (error) {
    server.log.error(`Failed to initialize PostgreSQL: ${error}`);
  }

  // ─── Initialize SQLite/Sequelize (existing auth) ───
  const { sequelize } = await import('../database/sequelize');
  const { UserModel } = await import('../database/sequelize/models/UserModel');

  try {
    server.log.info('Syncing SQLite Database...');
    await sequelize.sync();
    server.log.info('SQLite Database synced successfully.');

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
    server.log.error(`Failed to sync SQLite database ${error}`);
  }

  // ─── Setup HTTP Routes ───
  await setupRoutes(server, actualBudgetService, budgetService);

  // ─── Initialize Telegram Bot (non-blocking) ───
  const telegramBot = new TelegramBotService(pgPool);
  telegramBot.initialize().catch((err) => {
    server.log.warn(`Telegram Bot failed to initialize: ${err.message}`);
  });

  // ─── Graceful shutdown ───
  server.addHook('onClose', async () => {
    server.log.info('Shutting down Actual Budget...');
    await actualBudgetService.shutdown();
    server.log.info('Closing PostgreSQL pool...');
    await pgPool.end();
  });

  return server;
}
