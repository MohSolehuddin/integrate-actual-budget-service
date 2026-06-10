import type { TransactionInput, ImportTransactionsResult, Account, Category } from '../entities';

export interface IActualBudgetService {
  init(): Promise<void>;
  downloadBudget(): Promise<void>;
  getAccounts(): Promise<Account[]>;
  getCategories(): Promise<Category[]>;
  addTransactions(accountId: string, transactions: TransactionInput[]): Promise<void>;
  importTransactions(accountId: string, transactions: TransactionInput[]): Promise<ImportTransactionsResult>;
  shutdown(): Promise<void>;
}