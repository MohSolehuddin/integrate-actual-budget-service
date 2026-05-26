import type { IActualBudgetService } from '../../domain/interfaces/IActualBudgetService';
import type { TransactionInput } from '../../domain/entities/Transaction';

export class AddTransactionUseCase {
  constructor(private actualBudgetService: IActualBudgetService) {}

  async execute(accountId: string, transactions: TransactionInput[]): Promise<{ message: string }> {
    if (!accountId) {
      throw new Error('accountId is required');
    }
    if (!transactions || transactions.length === 0) {
      throw new Error('At least one transaction is required');
    }

    // Validate each transaction
    for (const tx of transactions) {
      if (!tx.date || typeof tx.amount !== 'number') {
        throw new Error('Each transaction must have a valid "date" (YYYY-MM-DD) and "amount" (number in cents)');
      }
    }

    await this.actualBudgetService.addTransactions(accountId, transactions);

    return { message: `Successfully added ${transactions.length} transaction(s)` };
  }
}
