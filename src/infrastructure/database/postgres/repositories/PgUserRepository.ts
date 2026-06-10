import { User } from '../../../../domain/entities/User';
import type { IUserRepository } from '../../../../domain/interfaces/IUserRepository';
import type { Pool } from 'pg';

export class PgUserRepository implements IUserRepository {
  constructor(private pool: Pool) {}

  async findByUsername(username: string): Promise<User | null> {
    const result = await this.pool.query(
      'SELECT id, username, password_hash, role FROM users WHERE username = $1',
      [username]
    );
    const row = result.rows[0];
    if (!row) return null;
    return new User(String(row.id), row.username, row.role, row.password_hash);
  }

  async create(user: User): Promise<User> {
    const result = await this.pool.query(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, username, password_hash, role`,
      [user.username, user.password, user.role]
    );
    const row = result.rows[0];
    return new User(String(row.id), row.username, row.role, row.password_hash);
  }

  async count(): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*)::int as count FROM users');
    return result.rows[0].count;
  }
}