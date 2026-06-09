import { User } from "../../../../domain/entities/User";
import type { IUserRepository } from "../../../../domain/interfaces/IUserRepository";
import { UserModel } from "../models/UserModel";

export class UserRepository implements IUserRepository {
  async findByUsername(username: string): Promise<User | null> {
    const userModel = await UserModel.findOne({ where: { username } });
    console.log('UserRepository.findByUsername', { username, userModel });
    if (!userModel) return null;

    // Get password from dataValues directly
    const password = (userModel as any).dataValues?.password || (userModel as any).password;
    console.log('UserRepository password from dataValues', password);
    return new User(userModel.id!, userModel.username, userModel.role, password);
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
