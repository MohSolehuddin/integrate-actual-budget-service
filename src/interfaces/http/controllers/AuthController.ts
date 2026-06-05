import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthError } from '../../../domain/errors/AuthError';
import { LoginUseCase } from '../../../use-cases/auth/LoginUseCase';
import { RegisterUseCase } from '../../../use-cases/auth/RegisterUseCase';

export class AuthController {
  constructor(private readonly loginUseCase: LoginUseCase, private readonly registerUseCase?: RegisterUseCase) {}

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

  public async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!this.registerUseCase) {
        return reply.status(501).send({ error: 'Registration is not enabled' });
      }
      if (!request.body) return reply.status(400).send({ error: 'Username and password are required' });
      const { username, password, role } = request.body as any;

      if (!username || !password) {
        return reply.status(400).send({ error: 'Username and password are required' });
      }

      const result = await this.registerUseCase.execute(username, password, role);
      return reply.send({ success: true, token: result.token, user: result.user });
    } catch (error) {
      console.log('error from register', error);
      if (error instanceof AuthError) {
        return reply.status(401).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  }
}
