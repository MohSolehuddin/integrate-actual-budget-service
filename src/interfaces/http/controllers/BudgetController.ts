import type { FastifyReply, FastifyRequest } from 'fastify';
import { GetAccountsUseCase } from '../../../use-cases/budget/GetAccountsUseCase';
import { GetCategoriesUseCase } from '../../../use-cases/budget/GetCategoriesUseCase';
import { AddTransactionUseCase } from '../../../use-cases/budget/AddTransactionUseCase';

export class BudgetController {
  constructor(
    private getAccountsUseCase: GetAccountsUseCase,
    private getCategoriesUseCase: GetCategoriesUseCase,
    private addTransactionUseCase: AddTransactionUseCase
  ) {}

  async getAccounts(request: FastifyRequest, reply: FastifyReply) {
    try {
      const accounts = await this.getAccountsUseCase.execute();
      return reply.send({ data: accounts });
    } catch (error: any) {
      return reply.status(500).send({ error: 'Failed to fetch accounts', details: error.message });
    }
  }

  async getCategories(request: FastifyRequest, reply: FastifyReply) {
    try {
      const categories = await this.getCategoriesUseCase.execute();
      return reply.send({ data: categories });
    } catch (error: any) {
      return reply.status(500).send({ error: 'Failed to fetch categories', details: error.message });
    }
  }

  async addTransaction(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { accountId, transactions } = request.body as any;

      if (!accountId || !transactions) {
        return reply.status(400).send({ error: '"accountId" and "transactions" are required' });
      }

      const result = await this.addTransactionUseCase.execute(accountId, transactions);
      return reply.send({ success: true, ...result });
    } catch (error: any) {
      return reply.status(500).send({ error: 'Failed to add transaction', details: error.message });
    }
  }
}
