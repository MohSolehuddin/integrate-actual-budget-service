# Actual Budget Integration Service - Quick Start Guide

## 🚀 Fast Setup (5 minutes)

### 1. Clone & Install

```bash
cd /home/moh_solehuddin190805/projects/integrate-actual-budget-service
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your Actual Budget details:

```env
JWT_SECRET=your-secure-secret-key-here
ACTUAL_SERVER_URL=http://localhost:5006
ACTUAL_PASSWORD=your-actual-budget-password
ACTUAL_SYNC_ID=your-budget-sync-id
```

### 3. Run the Server

```bash
npm run start
```

Server will start at `http://localhost:3001`

### 4. Test the Service

```bash
# Health check
curl http://localhost:3001/

# Login (admin user auto-created on first run)
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"secret"}'
```

### 5. Get Budget Data

```bash
# Get token from login response, then:
curl http://localhost:3001/budget/accounts \
  -H "Authorization: Bearer YOUR_TOKEN"

curl http://localhost:3001/budget/categories \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🐳 Docker Quick Start

```bash
# Configure
cp .env.example .env
# Edit .env with your Actual Budget credentials

# Run
docker-compose up -d

# Check logs
docker-compose logs -f budget-integration-service

# Access API at http://localhost:3001
```

## 🔑 Default Credentials (Auto-Created)

On first run, an admin user is created:

- **Username:** `admin`
- **Password:** `secret`
- **Role:** `admin`

> ⚠️ **Change this password immediately!**

## 📝 Quick API Examples

### Login
```bash
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"secret"}'
```

### Add Transaction
```bash
curl -X POST http://localhost:3001/budget/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "ACCOUNT_ID",
    "transactions": [{
      "date": "2026-06-05",
      "amount": -1250,
      "payee_name": "Store",
      "category": "CATEGORY_ID"
    }]
  }'
```

### Get Accounts
```bash
curl http://localhost:3001/budget/accounts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🛠️ Troubleshooting

### Connection to Actual Budget fails

- Check Actual Budget server is running: `curl http://localhost:5006/`
- Verify `ACTUAL_SERVER_URL`, `ACTUAL_PASSWORD`, and `ACTUAL_SYNC_ID` in `.env`
- Ensure budget sync ID is correct (found in Actual Budget UI)

### Database errors

- The SQLite database will be created automatically at `database.sqlite`
- Check file permissions: `ls -la database.sqlite`

### JWT errors

- Verify `JWT_SECRET` is set in `.env`
- Never use the default secret in production!

## 📚 Next Steps

1. Read the full [README.md](README.md) for detailed documentation
2. Check [API Reference](README.md#api-reference) for all endpoints
3. Review [Project Structure](README.md#project-structure) for code organization
4. See [Docker Deployment](README.md#docker-deployment) for production setup

## 💡 Tips

- Use the **bun** runtime for better performance: `bun run src/index.ts`
- Enable debug logging by setting `LOG_LEVEL=debug` in `.env`
- For production, always use Docker with proper secrets management

---

**Need help?** Check the full documentation in [README.md](README.md)
