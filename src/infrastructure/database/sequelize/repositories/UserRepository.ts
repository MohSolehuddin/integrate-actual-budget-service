import { User } from "../../../../domain/entities/User";
import type { IUserRepository } from "../../../../domain/interfaces/IUserRepository";
import { UserModel } from "../models/UserModel";

export class UserRepository implements IUserRepository {
  async findByUsername(username: string): Promise<User | null> {
    const userModel = await UserModel.findOne({ where: { username } });
    if (!userModel) return null;

    return new User(userModel.id!, userModel.username, userModel.role, userModel.password);
  }

  async create(user: User): Promise<User> {
    const created = await UserModel.create({
      id: user.id || undefined, // let database auto-generate if id not provided
      username: user.username,
      password: user.password,
      role: user.role,
    });

    return new User(created.id!, created.username, created.role, created.password);
  }

  async count(): Promise<number> {
    return await UserModel.count();
  }
}
