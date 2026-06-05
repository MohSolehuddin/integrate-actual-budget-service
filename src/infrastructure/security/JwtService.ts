import type { FastifyInstance } from 'fastify';

export class JwtService {
  constructor(private readonly server: FastifyInstance) {}

  public sign(payload: object): string {
    return this.server.jwt.sign(payload);
  }

  public verify(token: string): object {
    return this.server.jwt.verify(token);
  }
}
