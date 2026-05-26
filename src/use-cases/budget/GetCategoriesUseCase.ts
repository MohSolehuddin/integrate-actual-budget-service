import type { IActualBudgetService } from '../../domain/interfaces/IActualBudgetService';

export class GetCategoriesUseCase {
  constructor(private actualBudgetService: IActualBudgetService) {}

  async execute(): Promise<any[]> {
    try {
      const categories = await this.actualBudgetService.getCategories();
      return categories;
    } catch (error) {
      console.error('Failed to get categories:', error);
      throw error;
    }
  }
}
