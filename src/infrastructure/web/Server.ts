import fastifyJwt from '@fastify/jwt';
import Fastify from 'fastify';
import * as argon2 from 'argon2';
import { setupRoutes } from '../../interfaces/http/routes';
import { ActualBudgetService } from '../actual-budget/ActualBudgetService';
import { MockBudgetService } from '../actual-budget/MockBudgetService';
import { createPostgresPool, initPostgresTables } from '../database/postgres';
import { BudgetRepository } from '../database/postgres/repositories/BudgetRepository';
import { PgUserRepository } from '../database/postgres/repositories/PgUserRepository';
import { BudgetService } from '../../application/services/BudgetService';
import { TelegramBotService } from '../../interfaces/telegram/TelegramBotService';
import { AddTransactionUseCase } from '../../use-cases/budget/AddTransactionUseCase';
import { User } from '../../domain/entities/User';

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

  let actualBudgetService: ActualBudgetService | MockBudgetService;
  if (actualServerUrl && actualSyncId) {
    actualBudgetService = new ActualBudgetService(actualServerUrl, actualPassword, actualSyncId, dataDir);
    try {
      server.log.info('Initializing Actual Budget...');
      await actualBudgetService.init();
      await actualBudgetService.downloadBudget();
      server.log.info('Actual Budget initialized successfully.');
    } catch (error) {
      server.log.error(`Failed to initialize Actual Budget: ${error}`);
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
  const userRepository = new PgUserRepository(pgPool);

  try {
    server.log.info('Initializing PostgreSQL tables...');
    await initPostgresTables(pgPool);
    server.log.info('PostgreSQL tables initialized.');

    // Seed admin user if not exists
    const adminCount = await userRepository.count();
    if (adminCount === 0) {
      server.log.info('Seeding initial admin user...');
      const hashedPassword = await argon2.hash('secret');
      await userRepository.create(new User('', 'admin', 'admin', hashedPassword));
      server.log.info('Admin user seeded with username "admin" and password "secret".');
    }
  } catch (error) {
    server.log.error(`Failed to initialize PostgreSQL: ${error}`);
  }

  // ─── Setup HTTP Routes ───
  await setupRoutes(server, actualBudgetService, budgetService, userRepository, pgPool);

  // ─── Initialize Telegram Bot (non-blocking) ───
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (token) {
    const addTransactionUseCase = new AddTransactionUseCase(actualBudgetService);
    const telegramBot = new TelegramBotService(token, actualBudgetService, addTransactionUseCase);
    telegramBot.setup();
    telegramBot.startPolling();
    server.log.info('Telegram Bot started');
  } else {
    server.log.warn('TELEGRAM_BOT_TOKEN not set. Skipping Telegram bot.');
  }

  // ─── Graceful shutdown ───
  server.addHook('onClose', async () => {
    server.log.info('Shutting down...');
    await actualBudgetService.shutdown();
    await pgPool.end();
  });

  return server;
}