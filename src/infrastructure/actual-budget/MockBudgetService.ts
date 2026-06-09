import type { TransactionInput, ImportTransactionsResult } from '../../domain/entities/Transaction';
import type { IActualBudgetService } from '../../domain/interfaces/IActualBudgetService';

export class MockBudgetService implements IActualBudgetService {
  private transactions: Array<{ id: string; accountId: string; date: string; amount: number; payee?: string | null; category?: string | null; notes?: string | null }> = [];

  async init(): Promise<void> {
    console.log('MockBudgetService: Initialized');
  }

  async downloadBudget(): Promise<void> {
    console.log('MockBudgetService: Budget downloaded (mock)');
  }

  async getAccounts(): Promise<any[]> {
    return [{ id: 'local_1', name: 'Local Wallet', type: 'credit' }];
  }

  async getCategories(): Promise<any[]> {
    return [
      { id: 'cat_food', name: 'Food', type: 'expense' },
      { id: 'cat_transport', name: 'Transport', type: 'expense' },
      { id: 'cat_utilities', name: 'Utilities', type: 'expense' }
    ];
  }

  async addTransactions(accountId: string, transactions: TransactionInput[]): Promise<void> {
    console.log(`MockBudgetService: Adding ${transactions.length} transactions to accountId=${accountId}`);
    for (const tx of transactions) {
      const newTx = {
        id: 'mock_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
        accountId,
        date: tx.date,
        amount: tx.amount ?? 0,
        payee: tx.payee ?? null,
        category: tx.category ?? null,
        notes: tx.notes ?? null
      };
      this.transactions.push(newTx);
      console.log(`MockBudgetService: Added transaction`, newTx);
    }
    console.log(`MockBudgetService: Total transactions in memory: ${this.transactions.length}`);
  }

  async importTransactions(accountId: string, transactions: TransactionInput[]): Promise<ImportTransactionsResult> {
    await this.addTransactions(accountId, transactions);
    return {
      added: transactions.length,
      updated: 0,
      skipped: 0,
      errors: []
    };
  }

  async shutdown(): Promise<void> {
    console.log('MockBudgetService: Shut down');
  }
}
