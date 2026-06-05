import { User } from "../../domain/entities/User";
import type { IUserRepository } from "../../domain/interfaces/IUserRepository";
import { JwtService } from "../../infrastructure/security/JwtService";

import * as argon2 from 'argon2';

export class RegisterUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService
    ) {}

  public async execute(username: string, password: string, role: string = 'user'): Promise<{ token: string; user: User }> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByUsername(username);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash the password
    const hashedPassword = await argon2.hash(password);

    // Create the user (id will be generated automatically by User class)
    const newUser = new User(undefined as unknown as string, username, role, hashedPassword);
    const user = await this.userRepository.create(newUser);

    // Generate JWT token
    const userForToken = { id: user.id, username: user.username, role: user.role };
    const token = this.jwtService.sign(userForToken);

    return { token, user };
  }
}
