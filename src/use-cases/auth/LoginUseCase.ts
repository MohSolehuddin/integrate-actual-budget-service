import { User } from '../../domain/entities/User';
import { AuthError } from '../../domain/errors/AuthError';
import type { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { JwtService } from '../../infrastructure/security/JwtService';

import * as argon2 from 'argon2';

export class LoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService
  ) {}

  public async execute(username: string, password: string): Promise<{ token: string; user: User }> {
    const user = await this.userRepository.findByUsername(username);

    if (!user || !user.password) {
      throw new AuthError('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(user.password, password);

    if (!isPasswordValid) {
      throw new AuthError('Invalid credentials');
    }

    const userForToken = { id: user.id, username: user.username, role: user.role };
    const token = this.jwtService.sign(userForToken);

    // Return user without password
    const userWithoutPassword = new User(user.id, user.username, user.role);

    return { token, user: userWithoutPassword };
  }
}