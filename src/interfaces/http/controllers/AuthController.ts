import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthError } from '../../../domain/errors/AuthError';
import { LoginUseCase } from '../../../use-cases/auth/LoginUseCase';

export class AuthController {
  constructor(private readonly loginUseCase: LoginUseCase) {}

  public async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.body) return reply.status(400).send({ error: 'Username and password are required' });
      const { username, password } = request.body as any;

      if (!username || !password) {
        return reply.status(400).send({ error: 'Username and password are required' });
      }

      const result = await this.loginUseCase.execute(username, password);
      return reply.send({ success: true, token: result.token, user: result.user });
    } catch (error) {
      console.log('error from login', error);
      if (error instanceof AuthError) {
        return reply.status(401).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  }
}
