import * as api from '@actual-app/api';
import type { IActualBudgetService } from '../../domain/interfaces/IActualBudgetService';
import type { TransactionInput, ImportTransactionsResult } from '../../domain/entities/Transaction';

export class ActualBudgetService implements IActualBudgetService {
  private serverUrl: string;
  private password?: string;
  private syncId: string;
  private dataDir: string;
  private isInitialized = false;

  constructor(serverUrl: string, password: string | undefined, syncId: string, dataDir: string = './budget-data') {
    this.serverUrl = serverUrl;
    this.password = password;
    this.syncId = syncId;
    this.dataDir = dataDir;
  }

  async init(): Promise<void> {
    if (this.isInitialized) {
      console.log('Actual Budget already initialized, skipping...');
      return;
    }

    if (!this.serverUrl || !this.password || !this.syncId) {
      throw new Error('Missing serverUrl, password, or syncId for Actual Budget');
    }

    await api.init({
      serverURL: this.serverUrl,
      password: this.password,
      dataDir: this.dataDir,
    });

    this.isInitialized = true;
  }

  async downloadBudget(): Promise<void> {
    this.ensureInitialized();
    await api.downloadBudget(this.syncId);
  }

  async getAccounts(): Promise<any[]> {
    this.ensureInitialized();
    return await api.getAccounts();
  }

  async getCategories(): Promise<any[]> {
    this.ensureInitialized();
    return await api.getCategories();
  }

  async addTransactions(accountId: string, transactions: TransactionInput[]): Promise<void> {
    this.ensureInitialized();
    await api.addTransactions(accountId, transactions);
  }

  async importTransactions(accountId: string, transactions: TransactionInput[]): Promise<ImportTransactionsResult> {
    this.ensureInitialized();
    // importTransactions requires `account` field on each transaction
    const transactionsWithAccount = transactions.map(tx => ({ ...tx, account: accountId }));
    const result = await api.importTransactions(accountId, transactionsWithAccount);
    return {
      added: result?.added?.length ?? 0,
      updated: result?.updated?.length ?? 0,
    };
  }

  async shutdown(): Promise<void> {
    if (!this.isInitialized) return;
    try {
      await api.shutdown();
      this.isInitialized = false;
      console.log('Actual Budget shut down cleanly.');
    } catch (error) {
      console.error('Error shutting down Actual Budget:', error);
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('ActualBudgetService is not initialized. Call init() first.');
    }
  }
}
