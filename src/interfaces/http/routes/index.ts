import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { IActualBudgetService } from '../../../domain/interfaces/IActualBudgetService';
import type { IUserRepository } from '../../../domain/interfaces/IUserRepository';
import { JwtService } from '../../../infrastructure/security/JwtService';
import { LoginUseCase } from '../../../use-cases/auth/LoginUseCase';
import { RegisterUseCase } from '../../../use-cases/auth/RegisterUseCase';
import { GetAccountsUseCase } from '../../../use-cases/budget/GetAccountsUseCase';
import { GetCategoriesUseCase } from '../../../use-cases/budget/GetCategoriesUseCase';
import { AddTransactionUseCase } from '../../../use-cases/budget/AddTransactionUseCase';
import { AuthController } from '../controllers/AuthController';
import { BudgetController } from '../controllers/BudgetController';
import type { BudgetService } from '../../../application/services/BudgetService';
import type { Pool } from 'pg';

export async function setupRoutes(
  server: FastifyInstance,
  actualBudgetService: IActualBudgetService,
  budgetService: BudgetService,
  userRepository: IUserRepository,
  pgPool: Pool
) {
  // Setup dependencies
  const jwtService = new JwtService(server);
  const loginUseCase = new LoginUseCase(userRepository, jwtService);
  const registerUseCase = new RegisterUseCase(userRepository, jwtService);
  const authController = new AuthController(loginUseCase, registerUseCase);

  const getAccountsUseCase = new GetAccountsUseCase(actualBudgetService);
  const getCategoriesUseCase = new GetCategoriesUseCase(actualBudgetService);
  const addTransactionUseCase = new AddTransactionUseCase(actualBudgetService);
  const budgetController = new BudgetController(getAccountsUseCase, getCategoriesUseCase, addTransactionUseCase);

  // JWT auth preValidation hook
  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  };

  // ─── Healthcheck ───
  server.get('/', async () => {
    return { status: 'ok', service: 'Actual Budget Integration Service' };
  });

  // ─── Public Auth Routes ───
  server.post('/login', async (request, reply) => {
    return authController.login(request, reply);
  });

  server.post('/register', async (request, reply) => {
    return authController.register(request, reply);
  });

  // ─── Protected Base ───
  server.get('/api/v1', { preValidation: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    return { message: 'Welcome to Actual Budget Integration Service', user: request.user };
  });

  server.get('/protected', { preValidation: authenticate }, async (request) => {
    return { message: 'This is a protected route', user: request.user };
  });

  // ─── Actual Budget API Routes (v1 — requires JWT) ───
  server.get('/api/v1/budget/accounts', { preValidation: authenticate }, async (request, reply) => {
    return budgetController.getAccounts(request, reply);
  });

  server.get('/api/v1/budget/categories', { preValidation: authenticate }, async (request, reply) => {
    return budgetController.getCategories(request, reply);
  });

  server.post('/api/v1/budget/transactions', { preValidation: authenticate }, async (request, reply) => {
    return budgetController.addTransaction(request, reply);
  });

  // ─── Telegram / External API Routes (X-Telegram-Sender header) ───
  server.get('/api/budget/status', async (req, reply) => {
    try {
      const senderId = (req.headers['x-telegram-sender'] as string) || 'default';
      const user = await budgetService.getOrCreateBudget(senderId);
      return reply.send({
        success: true,
        exists: true,
        budgetId: user.budgetId,
        email: user.email,
        createdAt: new Date(),
      });
    } catch (error: any) {
      console.error('Error checking budget status:', error);
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  server.get('/api/budget/accounts', async (req, reply) => {
    try {
      const senderId = (req.headers['x-telegram-sender'] as string) || 'default';
      const accounts = await budgetService.getAccounts(senderId);
      return reply.send({ success: true, data: accounts });
    } catch (error: any) {
      console.error('Error fetching accounts:', error);
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  server.get('/api/budget/categories', async (req, reply) => {
    try {
      const categories = await budgetService.getCategories();
      return reply.send({ success: true, data: categories });
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  server.post('/api/budget/transactions', async (req, reply) => {
    try {
      const senderId = (req.headers['x-telegram-sender'] as string) || 'default';
      const body = req.body as any;
      const accountId = body?.accountId;
      const transactions = body?.transactions;
      const transaction = transactions ? transactions[0] : body;

      const result = await budgetService.processTransaction(senderId, {
        ...transaction,
        accountId,
        senderId,
      });

      return reply.status(200).send({ success: true, data: result });
    } catch (error: any) {
      console.error('Error adding transaction:', error);
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  server.get('/api/budget/export/csv', async (req, reply) => {
    try {
      const senderId = (req.headers['x-telegram-sender'] as string) || '7133351898';
      const budgetInfo = await budgetService.getOrCreateBudget(senderId);
      const result = await budgetService.exportTransactionsToCSV(budgetInfo.budgetId);

      if (result.error) {
        return reply.status(404).send({ success: false, error: result.error });
      }

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename=actual-budget-export.csv');
      return reply.send(result.csv);
    } catch (error: any) {
      console.error('Error exporting CSV:', error);
      return reply.status(500).send({ success: false, error: error.message });
    }
  });
}