import { User } from '../../../../domain/entities/User';
import type { IUserRepository } from '../../../../domain/interfaces/IUserRepository';
import { UserModel } from '../models/UserModel';

export class UserRepository implements IUserRepository {
  async findByUsername(username: string): Promise<User | null> {
    const userModel = await UserModel.findOne({ where: { username } });
    if (!userModel) return null;

    return new User(userModel.id, userModel.username, userModel.role, userModel.password);
  }

  async create(user: User): Promise<User> {
    const created = await UserModel.create({
      id: user.id, // optional, sequelize can auto-generate if we pass null/undefined or omit it depending on config
      username: user.username,
      password: user.password,
      role: user.role,
    });

    return new User(created.id, created.username, created.role, created.password);
  }

  async count(): Promise<number> {
    return await UserModel.count();
  }
}
