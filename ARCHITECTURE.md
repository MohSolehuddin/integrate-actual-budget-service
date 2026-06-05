# Architecture Overview

## Clean Architecture Principles

This project follows Clean Architecture principles with clear separation of concerns:

```
┌──────────────────────────────────────────────────────────────────┐
│                        INTERFACE LAYER                           │
│  (HTTP Controllers, Routes, Middlewares)                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐   │
│  │  AuthController  │  │BudgetController  │  │   Routes     │   │
│  └──────────────────┘  └──────────────────┘  └──────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                         USE CASES LAYER                          │
│  (Business Logic - Application Core)                            │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐     │
│  │ LoginUseCase  │  │RegisterUseCase│  │BudgetUseCases  │     │
│  └───────────────┘  └───────────────┘  └────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                     INFRASTRUCTURE LAYER                         │
│  (Technical Details - DB, APIs, Frameworks)                     │
│  ┌────────────────┐  ┌─────────────────┐  ┌───────────────┐    │
│  │ UserRepository │  │ActualBudgetServi│  │  JwtService   │    │
│  └────────────────┘  └─────────────────┘  └───────────────┘    │
└──────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                      DOMAIN LAYER                                │
│  (Pure Business Logic - Independent of Frameworks)              │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────────────┐     │
│  │   User.ts    │  │Transaction.ts   │  │   Errors       │     │
│  └──────────────┘  └────────────────┘  └─────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

## Layer Details

### Domain Layer (Core)

**Purpose:** Pure business logic, independent of frameworks

**Files:**
- `src/domain/entities/User.ts` - User model
- `src/domain/entities/Transaction.ts` - Transaction model
- `src/domain/interfaces/IUserRepository.ts` - Repository contract
- `src/domain/interfaces/IActualBudgetService.ts` - Service contract
- `src/domain/errors/AuthError.ts` - Custom exceptions

**Responsibilities:**
- Define business rules
- Define data structures (entities)
- Define interfaces for services/repositories
- No framework dependencies

**Key Principles:**
- **No imports** from outer layers
- No database queries
- No HTTP logic
- Pure functions where possible

### Use Cases Layer (Application Core)

**Purpose:** Business operations orchestrated by use cases

**Files:**
- `src/use-cases/auth/LoginUseCase.ts`
- `src/use-cases/auth/RegisterUseCase.ts`
- `src/use-cases/budget/GetAccountsUseCase.ts`
- `src/use-cases/budget/GetCategoriesUseCase.ts`
- `src/use-cases/budget/AddTransactionUseCase.ts`

**Responsibilities:**
- Orchestrate business operations
- Coordinate between domain entities and infrastructure
- Handle validation
- Return results to controllers

**Key Principles:**
- Inject interfaces (not implementations)
- Use domain entities
- Handle business validation
- Return domain results

### Infrastructure Layer (Technical Details)

**Purpose:** Implement interfaces from domain layer

**Files:**
- `src/infrastructure/database/sequelize/repositories/UserRepository.ts`
- `src/infrastructure/actual-budget/ActualBudgetService.ts`
- `src/infrastructure/security/JwtService.ts`

**Responsibilities:**
- Implement database operations (Sequelize)
- Implement external API clients (Actual Budget ETAPI)
- Implement authentication (JWT)

**Key Principles:**
- Implement domain interfaces
- Handle technical details
- Abstract framework specifics
- Return domain types

### Interface Layer (HTTP)

**Purpose:** Handle HTTP requests and responses

**Files:**
- `src/interfaces/http/controllers/AuthController.ts`
- `src/interfaces/http/controllers/BudgetController.ts`
- `src/interfaces/http/routes/index.ts`

**Responsibilities:**
- Parse HTTP requests
- Validate inputs
- Call use cases
- Format HTTP responses
- Handle HTTP errors

**Key Principles:**
- Thin controllers (business logic in use cases)
- Validate input data
- Use proper HTTP status codes
- Return consistent response format

## Dependency Rule

```
Dependencies point INWARD

Infrastructure → Use Cases → Domain
     ↑             ↑             ↑
     └── Interface Layer ────────┘

Higher layers depend on lower layers
Lower layers are independent of higher layers
```

## SOLID Principles

### S - Single Responsibility

Each class has one reason to change:
- `UserRepository` → Database operations only
- `LoginUseCase` → Login business logic only
- `AuthController` → HTTP request handling only

### O - Open/Closed

Open for extension, closed for modification:
- Add new use cases without changing existing code
- Add new controllers without changing domain logic

### L - Liskov Substitution

Subtypes must be substitutable:
- `UserRepository` can substitute `IUserRepository`
- `ActualBudgetService` can substitute `IActualBudgetService`

### I - Interface Segregation

Clients shouldn't depend on methods they don't use:
- Separate interfaces for different concerns
- Minimal interfaces for specific needs

### D - Dependency Inversion

High-level modules should not depend on low-level modules:
- Use cases depend on interfaces (not implementations)
- Controllers depend on use cases (not infrastructure)

## Data Flow Example

### Login Flow

```
HTTP Request (POST /login)
        ↓
AuthController.login()
        ↓
LoginUseCase.execute()
        ↓
UserRepository.findByUsername()
        ↓
Sequelize (database query)
        ↓
Return User entity
        ↓
Validate password (argon2)
        ↓
Generate JWT token
        ↓
Return { token, user }
        ↓
HTTP Response (JSON)
```

### Get Accounts Flow

```
HTTP Request (GET /budget/accounts)
        ↓
BudgetController.getAccounts()
        ↓
GetAccountsUseCase.execute()
        ↓
ActualBudgetService.getAccounts()
        ↓
ETAPI (Actual Budget API call)
        ↓
Return accounts array
        ↓
HTTP Response (JSON)
```

## Testing Strategy

### Unit Tests (Domain Layer)

```typescript
// Test: User entity creation
test('create user with valid data', () => {
  const user = new User('123', 'john', 'user');
  expect(user.username).toBe('john');
  expect(user.role).toBe('user');
});
```

### Integration Tests (Use Cases)

```typescript
// Test: Login with valid credentials
test('login returns token for valid user', async () => {
  const result = await loginUseCase.execute('admin', 'secret');
  expect(result.token).toBeDefined();
  expect(result.user.username).toBe('admin');
});
```

### API Tests (Interface Layer)

```bash
# Test login endpoint
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"secret"}'
```

## Error Handling Strategy

### Layer-Specific Errors

- **Domain Layer:** Custom exceptions (`AuthError`, etc.)
- **Use Cases:** Handle and wrap domain errors
- **Controllers:** Convert errors to HTTP responses
- **Infrastructure:** Handle external API errors

### Error Flow

```
Domain Error
    ↓
Use Case (catch and wrap)
    ↓
Controller (convert to HTTP)
    ↓
HTTP Response (400/500)
```

## Future Architecture Improvements

### Potential Enhancements

1. **Microservices Split**
   - Auth service (separate)
   - Budget service (current)
   - Notification service (new)

2. **Event Sourcing**
   - Domain events for changes
   - Event store for audit trail

3. **CQRS Pattern**
   - Separate read/write models
   - Optimized queries

4. **Caching Layer**
   - Redis for frequent queries
   - Token caching for auth

5. **GraphQL API**
   - Replace REST with GraphQL
   - Better client flexibility

---

**For implementation details, see:**
- [API Reference](API.md)
- [Development Guide](DEVELOPMENT.md)
- [Docker Deployment](README.md#docker-deployment)
