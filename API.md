# API Reference

## Authentication

### POST `/login`

Authenticates user and returns JWT token.

**Request:**
```http
POST /login HTTP/1.1
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

**Success Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "string",
    "role": "string"
  }
}
```

**Error Responses:**
| Code | Body | Description |
|------|------|-------------|
| `400` | `{"error": "Username and password are required"}` | Missing credentials |
| `401` | `{"error": "Invalid credentials"}` | Wrong username/password |
| `500` | `{"error": "Internal Server Error"}` | Server error |

---

### POST `/register`

Register a new user (optional).

**Request:**
```http
POST /register HTTP/1.1
Content-Type: application/json

{
  "username": "string",
  "password": "string",
  "role": "string"
}
```

**Success Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "string",
    "role": "string"
  }
}
```

**Error Responses:**
| Code | Body | Description |
|------|------|-------------|
| `400` | `{"error": "Username and password are required"}` | Missing credentials |
| `400` | `{"error": "User already exists"}` | Duplicate username |
| `500` | `{"error": "Internal Server Error"}` | Server error |

---

## Budget Data

### GET `/budget/accounts`

Retrieves all accounts from Actual Budget.

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Success Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {
      "id": "string",
      "name": "string",
      "type": "checking|savings|credit_card|cash|brokerage|mortgage|other",
      "onBudget": "boolean"
    }
  ]
}
```

**Error Responses:**
| Code | Body | Description |
|------|------|-------------|
| `401` | `{"error": "Unauthorized"}` | Missing/invalid token |
| `500` | `{"error": "Failed to fetch accounts", "details": "..."}` | Actual Budget API error |

---

### GET `/budget/categories`

Retrieves all categories and category groups.

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Success Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {
      "id": "string",
      "name": "string",
      "categories": [
        {
          "id": "string",
          "name": "string",
          "groupId": "string"
        }
      ]
    }
  ]
}
```

**Error Responses:**
| Code | Body | Description |
|------|------|-------------|
| `401` | `{"error": "Unauthorized"}` | Missing/invalid token |
| `500` | `{"error": "Failed to fetch categories", "details": "..."}` | Actual Budget API error |

---

### POST `/budget/transactions`

Adds transactions to an account.

**Headers:**
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "accountId": "string",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "amount": -1250,
      "payee_name": "string",
      "category": "string",
      "notes": "string",
      "imported_payee": "string"
    }
  ]
}
```

**Success Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Successfully added X transaction(s)"
}
```

**Error Responses:**
| Code | Body | Description |
|------|------|-------------|
| `400` | `{"error": "accountId and transactions are required"}` | Missing request body |
| `400` | `{"error": "At least one transaction is required"}` | Empty transactions array |
| `400` | `{"error": "Each transaction must have..."}"` | Invalid transaction data |
| `401` | `{"error": "Unauthorized"}` | Missing/invalid token |
| `500` | `{"error": "Failed to add transaction", "details": "..."}` | Actual Budget API error |

---

## Utility Endpoints

### GET `/`

Health check endpoint.

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "ok",
  "service": "Actual Budget Integration Service"
}
```

---

### GET `/api/v1`

API info with user context.

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "Welcome to Actual Budget Integration Service",
  "user": {
    "id": "string",
    "username": "string",
    "role": "string"
  }
}
```

---

### GET `/protected`

Protected route example.

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "This is a protected route",
  "user": {
    "id": "string",
    "username": "string",
    "role": "string"
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `400` | Bad Request - Invalid input |
| `401` | Unauthorized - Invalid/missing token |
| `404` | Not Found - Resource doesn't exist |
| `500` | Internal Server Error - Server bug |
| `501` | Not Implemented - Feature disabled |

## Rate Limiting

Currently no rate limiting is enforced. Consider adding rate limiting for production deployments.

## Authentication

All protected endpoints use JWT authentication. Tokens are valid for 7 days by default.

### Token Format

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzQ5MTk5MDAwLCJleHAiOjE3NDk4MDM4MDB9.SIGNATURE
```

### Token Usage

```bash
curl -X GET http://localhost:3001/budget/accounts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
