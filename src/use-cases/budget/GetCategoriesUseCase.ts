import type { IActualBudgetService } from '../../domain/interfaces/IActualBudgetService';
import type { Category } from '../../domain/entities';

export class GetCategoriesUseCase {
  constructor(private actualBudgetService: IActualBudgetService) {}

  async execute(): Promise<Category[]> {
    const categories = await this.actualBudgetService.getCategories();
    return categories;
  }
}