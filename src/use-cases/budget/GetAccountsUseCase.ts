import type { IActualBudgetService } from '../../domain/interfaces/IActualBudgetService';
import type { Account } from '../../domain/entities';

export class GetAccountsUseCase {
  constructor(private actualBudgetService: IActualBudgetService) {}

  async execute(): Promise<Account[]> {
    const accounts = await this.actualBudgetService.getAccounts();
    return accounts;
  }
}