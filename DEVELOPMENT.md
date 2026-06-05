# Development Guide

## Setup for Development

### Prerequisites

- Node.js v20+ or Bun
- TypeScript v5+
- npm or bun

### Install Dependencies

```bash
# Using npm
npm install

# Using bun (recommended)
bun install
```

### Build & Type Check

```bash
# Type check only
npx tsc --noEmit

# Watch mode for development
bun run --watch src/index.ts
```

## Project Structure

```
src/
├── domain/              # Core business logic
│   ├── entities/       # Domain models (User, Transaction)
│   ├── errors/         # Custom exceptions
│   └── interfaces/     # Domain interfaces (SOLID DIP)
├── infrastructure/     # Technical details
│   ├── actual-budget/  # ETAPI client wrapper
│   ├── database/       # ORM and repositories
│   └── security/       # JWT and auth
├── interfaces/         # HTTP layer
│   └── http/
│       ├── controllers/
│       └── routes/
├── use-cases/          # Business operations
│   ├── auth/
│   └── budget/
└── index.ts           # Entry point
```

## Running in Development

### Using Bun (Recommended)

```bash
# Development with hot reload
bun run --watch src/index.ts

# Type check
npx tsc --noEmit

# Lint (if ESLint configured)
npx eslint src/
```

### Using Node.js

```bash
# Start server
npm run start

# Type check
npx tsc --noEmit
```

## Testing

### Manual Testing

1. Start the server
2. Use curl or Postman to test endpoints
3. Check logs for any errors

### Example Test Flow

```bash
# 1. Start server
bun run src/index.ts

# 2. In another terminal, test login
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"secret"}'
```

## Adding New Features

### 1. Create Entity

```typescript
// src/domain/entities/YourEntity.ts
export class YourEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    // ... other properties
  ) {}
}
```

### 2. Create Interface

```typescript
// src/domain/interfaces/IYourService.ts
export interface IYourService {
  getYourData(): Promise<YourEntity[]>;
}
```

### 3. Implement Use Case

```typescript
// src/use-cases/your/GetYourDataUseCase.ts
import type { IYourService } from '../../domain/interfaces/IYourService';

export class GetYourDataUseCase {
  constructor(private readonly yourService: IYourService) {}

  async execute(): Promise<YourEntity[]> {
    return await this.yourService.getYourData();
  }
}
```

### 4. Create Controller

```typescript
// src/interfaces/http/controllers/YourController.ts
import type { FastifyReply, FastifyRequest } from 'fastify';
import { GetYourDataUseCase } from '../../../use-cases/your/GetYourDataUseCase';

export class YourController {
  constructor(private readonly getYourDataUseCase: GetYourDataUseCase) {}

  async getYourData(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = await this.getYourDataUseCase.execute();
      return reply.send({ data });
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to get data' });
    }
  }
}
```

### 5. Register Route

```typescript
// src/interfaces/http/routes/index.ts
server.get('/your-endpoint', { preValidation: authenticate }, async (request, reply) => {
  return yourController.getYourData(request, reply);
});
```

## Code Style

### Naming Conventions

- **Classes:** PascalCase (e.g., `UserRepository`, `GetAccountsUseCase`)
- **Interfaces:** PascalCase with `I` prefix (e.g., `IUserRepository`, `IActualBudgetService`)
- **Variables/Functions:** camelCase (e.g., `userRepository`, `getAccounts`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `JWT_SECRET`)

### Type Imports

Always use type-only imports when possible:

```typescript
// ✅ Good
import type { FastifyInstance } from 'fastify';

// ❌ Bad
import { FastifyInstance } from 'fastify';
```

### Error Handling

```typescript
// ✅ Good
try {
  const result = await this.service.execute();
  return reply.send({ data: result });
} catch (error) {
  console.error('Failed to execute:', error);
  return reply.status(500).send({ error: 'Operation failed', details: error.message });
}

// ❌ Bad
const result = await this.service.execute(); // No try/catch
return reply.send({ data: result });
```

## Debugging

### Enable Debug Logs

```bash
# Set log level
export LOG_LEVEL=debug
npm run start
```

### VS Code Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Program",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/src/index.ts",
      "runtimeArgs": ["--require", "ts-node/register"],
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

## Git Workflow

### Branch Naming

- `feature/your-feature-name`
- `fix/your-bug-fix`
- `docs/your-documentation`

### Commit Messages

```
feat: add new transaction import feature
fix: resolve authentication issue
docs: update API documentation
refactor: clean up use case structure
```

## Continuous Integration

### Pre-commit Checks

```bash
# Run these before committing
npx tsc --noEmit
npm run lint  # if ESLint configured
```

### Docker Build

```bash
# Build image
docker build -t integrate-actual-budget-service .

# Run container
docker run -p 3001:3001 integrate-actual-budget-service
```

## Performance Optimization

### Production Tips

1. Use **bun** for faster startup and runtime
2. Enable **production build** with proper environment
3. Configure **connection pooling** for database
4. Use **Redis** for token caching (optional)
5. Implement **rate limiting** for API endpoints

### Environment Variables for Production

```env
NODE_ENV=production
LOG_LEVEL=info
JWT_SECRET=your-secure-secret-key-here
```

## Security Best Practices

1. **Never commit secrets** - Use `.env` and add to `.gitignore`
2. **Use strong JWT secrets** - Minimum 32 characters
3. **Enable HTTPS** - Use reverse proxy (nginx, Caddy) in production
4. **Rate limit API** - Prevent abuse
5. **Input validation** - Always validate request payloads

---

**For production deployment, see [Docker Deployment](README.md#docker-deployment)**
