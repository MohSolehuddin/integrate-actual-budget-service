export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  role: string;
  created_at: Date;
  updated_at: Date;
}