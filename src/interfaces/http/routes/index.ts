import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { IActualBudgetService } from '../../../domain/interfaces/IActualBudgetService';
import { JwtService } from '../../../infrastructure/security/JwtService';
import { LoginUseCase } from '../../../use-cases/auth/LoginUseCase';
import { GetAccountsUseCase } from '../../../use-cases/budget/GetAccountsUseCase';
import { GetCategoriesUseCase } from '../../../use-cases/budget/GetCategoriesUseCase';
import { AddTransactionUseCase } from '../../../use-cases/budget/AddTransactionUseCase';
import { AuthController } from '../controllers/AuthController';
import { BudgetController } from '../controllers/BudgetController';

import { UserRepository } from '../../../infrastructure/database/sequelize/repositories/UserRepository';

export async function setupRoutes(server: FastifyInstance, actualBudgetService: IActualBudgetService) {
  // Setup dependencies
  const jwtService = new JwtService(server);
  const userRepository = new UserRepository();
  const loginUseCase = new LoginUseCase(userRepository, jwtService);
  const authController = new AuthController(loginUseCase);

  const getAccountsUseCase = new GetAccountsUseCase(actualBudgetService);
  const getCategoriesUseCase = new GetCategoriesUseCase(actualBudgetService);
  const addTransactionUseCase = new AddTransactionUseCase(actualBudgetService);
  const budgetController = new BudgetController(getAccountsUseCase, getCategoriesUseCase, addTransactionUseCase);

  // JWT auth preValidation hook (reusable)
  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  };

  // Healthcheck route
  server.get('/', async () => {
    return { status: 'ok', service: 'Actual Budget Integration Service' };
  });

  // Public Auth Route
  server.post('/login', async (request, reply) => {
    return authController.login(request, reply);
  });

  // base api endpoint
  server.get('/api/v1', { preValidation: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    return { message: 'Welcome to Actual Budget Integration Service', user: request.user };
  });

  // Protected Route Example
  server.get('/protected', { preValidation: authenticate }, async (request) => {
    return { message: 'This is a protected route', user: request.user };
  });

  // Budget Routes
  server.get('/budget/accounts', { preValidation: authenticate }, async (request, reply) => {
    return budgetController.getAccounts(request, reply);
  });

  server.get('/budget/categories', { preValidation: authenticate }, async (request, reply) => {
    return budgetController.getCategories(request, reply);
  });

  server.post('/budget/transactions', { preValidation: authenticate }, async (request, reply) => {
    return budgetController.addTransaction(request, reply);
  });
}
