export interface Account {
  id: string;
  name: string;
  offbudget?: boolean;
  closed?: boolean;
  balance_current?: number | null;
}

export interface Category {
  id: string;
  name: string;
  group_id?: string;
  is_income?: boolean;
  hidden?: boolean;
}