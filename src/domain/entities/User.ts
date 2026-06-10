export class User {
  constructor(
    public readonly id: string,
    public readonly username: string,
    public readonly role: string,
    public readonly password?: string
  ) {}
}