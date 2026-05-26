import { IActualBudgetService } from '../../domain/interfaces/IActualBudgetService';

export class GetAccountsUseCase {
  constructor(private actualBudgetService: IActualBudgetService) {}

  async execute(): Promise<any[]> {
    try {
      const accounts = await this.actualBudgetService.getAccounts();
      return accounts;
    } catch (error) {
      console.error('Failed to get accounts:', error);
      throw error;
    }
  }
}
