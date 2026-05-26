import type { TransactionInput, ImportTransactionsResult } from '../entities/Transaction';

export interface IActualBudgetService {
  init(): Promise<void>;
  downloadBudget(): Promise<void>;
  getAccounts(): Promise<any[]>;
  getCategories(): Promise<any[]>;
  addTransactions(accountId: string, transactions: TransactionInput[]): Promise<void>;
  importTransactions(accountId: string, transactions: TransactionInput[]): Promise<ImportTransactionsResult>;
  shutdown(): Promise<void>;
}
