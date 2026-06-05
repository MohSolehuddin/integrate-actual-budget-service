import crypto from 'crypto';

export class User {
  constructor(
    public readonly id: string = crypto.randomUUID(),
    public readonly username: string,
    public readonly role: string,
    public password?: string
  ) {}
}
