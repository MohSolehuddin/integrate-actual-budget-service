# Actual Budget Integration Service

> A Fastify-based API service that integrates with Actual Budget via ETAPI, providing authentication and budget data management.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Setup & Installation](#setup--installation)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Running the Service](#running-the-service)
- [Docker Deployment](#docker-deployment)
- [Project Structure](#project-structure)
- [Error Handling](#error-handling)
- [Development](#development)
- [License](#license)

## Overview

This service acts as a bridge between Actual Budget and external applications. It provides:

- **Authentication System** with JWT tokens
- **Budget Data Access** (accounts, categories)
- **Transaction Management** (add and import transactions)
- **Type-safe API** with Fastify and TypeScript

## Features

| Feature | Description |
|---------|-------------|
| 🔐 JWT Authentication | Secure login/register with Argon2 password hashing |
| 📊 Budget Data | Fetch accounts, categories, and manage transactions |
| 🔄 Transaction Import | Batch import transactions with deduplication support |
| 📝 Type Safety | Full TypeScript support with strict typing |
| 🐳 Docker Ready | Pre-configured for Docker Compose deployment |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Fastify HTTP Server                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐     │
│  │ AuthController│  │BudgetController││  AuthController │     │
│  └─────────────┘  └──────────────┘  └─────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Use Cases Layer                           │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐     │
│  │ LoginUseCase│  │RegisterUseCase││BudgetUseCases   │     │
│  └─────────────┘  └──────────────┘  └─────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Infrastructure Layer                        │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐     │
│  │ UserRepository││ ActualBudgetService││ JwtService   │     │
│  └─────────────┘  └──────────────┘  └─────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun / Node.js |
| Framework | Fastify |
| Database | SQLite (Sequelize ORM) |
| Authentication | JWT, Argon2 |
| Budget API | `@actual-app/api` |
| Language | TypeScript (ESNext) |
| Container | Docker |

## Setup & Installation

### Prerequisites

- Node.js v20+ or Bun
- Actual Budget Server (local or remote)
- npm or bun

### Clone the Repository

```bash
cd /home/moh_solehuddin190805/projects/integrate-actual-budget-service
```

### Install Dependencies

```bash
# Using npm
npm install

# Using bun (recommended)
bun install
```

### Configure Environment

Copy the example env file and update with your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Server Configuration
PORT=3001
HOST=0.0.0.0
JWT_SECRET=your-super-secret-jwt-key-change-me-in-production

# Actual Budget Configuration
ACTUAL_SERVER_URL=http://localhost:5006
ACTUAL_PASSWORD=your-actual-budget-password
ACTUAL_SYNC_ID=your-budget-sync-id
ACTUAL_DATA_DIR=./budget-data
```

### Seed Initial Admin User

When you first run the server, an admin user will be created automatically:

- **Username:** `admin`
- **Password:** `secret`

> ⚠️ **Change the password immediately in production!**

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | API port (default: `3001`) |
| `HOST` | No | API host (default: `0.0.0.0`) |
| `JWT_SECRET` | Yes | Secret key for JWT signing |
| `ACTUAL_SERVER_URL` | Yes | URL of your Actual Budget server |
| `ACTUAL_PASSWORD` | Yes | Password for Actual Budget API |
| `ACTUAL_SYNC_ID` | Yes | Budget sync ID from Actual Budget |
| `ACTUAL_DATA_DIR` | No | Directory for budget data (default: `./budget-data`) |

### JWT Configuration

JWT tokens expire in 7 days. Configure in `src/infrastructure/security/JwtService.ts`:

```typescript
const token = this.server.jwt.sign(payload, {
  expiresIn: '7d' // Change this to your preferred expiry
});
```

## API Reference

### Authentication Endpoints

#### POST `/login`

Authenticate and receive a JWT token.

**Request:**
```json
POST /login
Content-Type: application/json

{
  "username": "admin",
  "password": "secret"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "admin"
  }
}
```

#### POST `/register`

Register a new user (optional endpoint).

**Request:**
```json
POST /register
Content-Type: application/json

{
  "username": "john_doe",
  "password": "secure_password",
  "role": "user"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "john_doe",
    "role": "user"
  }
}
```

### Protected Endpoints (Require JWT Token)

All protected endpoints require the `Authorization: Bearer <token>` header.

#### GET `/budget/accounts`

Retrieve all accounts from Actual Budget.

**Response:**
```json
{
  "data": [
    {
      "id": "account-uuid-1",
      "name": "Checking",
      "type": "checking",
      "onBudget": true
    }
  ]
}
```

#### GET `/budget/categories`

Retrieve all categories and category groups.

**Response:**
```json
{
  "data": [
    {
      "id": "category-group-uuid",
      "name": "Essentials",
      "categories": [
        {
          "id": "category-uuid-1",
          "name": "Groceries",
          "groupId": "category-group-uuid"
        }
      ]
    }
  ]
}
```

#### POST `/budget/transactions`

Add transactions to a specific account.

**Request:**
```json
POST /budget/transactions
Authorization: Bearer <token>
Content-Type: application/json

{
  "accountId": "account-uuid-1",
  "transactions": [
    {
      "date": "2026-06-05",
      "amount": -1250,
      "payee_name": "Supermarket",
      "category": "category-uuid-groceries",
      "notes": "Weekly groceries"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully added 1 transaction(s)"
}
```

#### GET `/api/v1`

Check API status.

**Response:**
```json
{
  "message": "Welcome to Actual Budget Integration Service",
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "admin"
  }
}
```

## Running the Service

### Development Mode

```bash
# Using bun (recommended)
bun run src/index.ts

# Using Node.js
npm run start
```

### Production Mode

```bash
# Build TypeScript (if needed)
npx tsc --noEmit

# Run production server
npm run start
```

### Check Server Status

```bash
curl http://localhost:3001/
# Expected: {"status":"ok","service":"Actual Budget Integration Service"}
```

## Docker Deployment

### Prerequisites

- Docker
- Docker Compose

### Start Services

```bash
cd /home/moh_solehuddin190805/projects/integrate-actual-budget-service

# Copy env file
cp .env.example .env

# Edit .env with your Actual Budget credentials

# Start services
docker-compose up -d
```

### View Logs

```bash
docker-compose logs -f budget-integration-service
```

### Stop Services

```bash
docker-compose down
```

### Docker Compose Architecture

```
┌─────────────────────────────┐      ┌──────────────────────────────┐
│  actual-server              │◄────►│  budget-integration-service   │
│  (Actual Budget API)        │      │  (Fastify API Service)        │
│  Port: 5006                 │      │  Port: 3001                   │
│  Volume: actual-data        │      │  Volume: integration-db       │
│                             │      │  Volume: integration-budget   │
└─────────────────────────────┘      └──────────────────────────────┘
         │                                       │
         ▼                                       ▼
┌──────────────────────────────────────────────────────────────┐
│                        budget-network                         │
│                     (Docker Bridge Network)                   │
└──────────────────────────────────────────────────────────────┘
```

## Project Structure

```
integrate-actual-budget-service/
├── src/
│   ├── domain/
│   │   ├── entities/        # Domain models (User, Transaction)
│   │   ├── errors/          # Custom error classes
│   │   └── interfaces/      # Domain interfaces (SOLID DIP)
│   ├── infrastructure/
│   │   ├── actual-budget/   # Actual Budget API client wrapper
│   │   ├── database/        # Database ORM (Sequelize)
│   │   └── security/        # JWT and auth utilities
│   ├── interfaces/
│   │   └── http/            # HTTP controllers and routes
│   ├── use-cases/           # Business logic (Usecases)
│   └── index.ts             # Application entry point
├── prisma/                  # Database migrations (optional)
├── .env.example             # Environment variables template
├── docker-compose.yml       # Docker deployment config
├── Dockerfile               # Container build config
└── package.json
```

### Layer Structure (Clean Architecture)

```
Domain Layer (Pure Business Logic)
    │
    ├── Entities: User, Transaction, etc.
    ├── Interfaces: Contracts for services/repositories
    └── Errors: Custom exception classes
    │
Infrastructure Layer (Technical Details)
    │
    ├── Database: ORM, repositories, models
    ├── Security: JWT, password hashing
    └── Actual Budget: ETAPI client wrapper
    │
Application Layer (Use Cases)
    │
    └── Business operations: Login, Register, Budget operations
    │
Interface Layer (HTTP Layer)
    │
    ├── Controllers: Request/Response handling
    └── Routes: Fastify route definitions
```

## Error Handling

### Authentication Errors

| Status Code | Error | Description |
|-------------|-------|-------------|
| `400` | "Username and password are required" | Missing credentials |
| `401` | "Invalid credentials" | Wrong username/password |
| `401` | "Unauthorized" | Missing/invalid JWT token |

### Business Logic Errors

| Status Code | Error | Description |
|-------------|-------|-------------|
| `400` | "accountId and transactions are required" | Missing request body |
| `400` | "At least one transaction is required" | Empty transactions array |
| `500` | "Failed to..." | Internal server error |

### Database Errors

| Status Code | Error | Description |
|-------------|-------|-------------|
| `500` | "User already exists" | Duplicate username |
| `500` | "Failed to..." | Database connectivity issues |

## Development

### TypeScript Configuration

The project uses strict TypeScript settings:

```json
{
  "strict": true,
  "skipLibCheck": true,
  "noUnusedLocals": false,
  "noUnusedParameters": false,
  "moduleResolution": "bundler"
}
```

### Adding New Features

1. Update domain entities in `src/domain/entities/`
2. Add interfaces in `src/domain/interfaces/`
3. Implement use cases in `src/use-cases/`
4. Create controllers in `src/interfaces/http/controllers/`
5. Register routes in `src/interfaces/http/routes/`

### Code Style

- Follow Clean Architecture principles
- Use TypeScript strict mode
- Import types with `type` keyword where possible
- Use async/await for all async operations
- Implement proper error handling with try/catch

## License

This project is provided as-is for educational and personal use.

---

**Built with ❤️ using Fastify, TypeScript, and Clean Architecture**
