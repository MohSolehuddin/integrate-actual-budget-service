# Integrate Actual Budget Service

> **Manager Keuangan Sederhana** - Telegram/WhatsApp → PostgreSQL + CSV Export untuk Actual Budget AI

---

## 📌 Overview

Project ini menyediakan **Budget Service API** yang menghubungkan chat transaksi (Telegram/WhatsApp) ke **Actual Budget** melalui dua tahap:

1. **Tahap 1 (Current)**: PostgreSQL + CSV Export — stabil, untuk MVP
2. **Tahap 2 (Future)**: Auto-sync via `@actual-app/api` — real-time sync ke remote Actual Budget

---

## 🎯 Goals

- ✅ Catat transaksi pemasukan/pengeluaran dari Telegram/WhatsApp
- ✅ Simpan ke database PostgreSQL (user-based, budget-aware)
- ✅ Export CSV compatible dengan Actual Budget import spec
- ✅ Cron auto-export setiap hari jam 07:00 WIB
- ⏳ Future: Auto-sync keActual Budget via Node.js client

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Telegram / WhatsApp                      │
│                    (user: 7133351898)                           │
└─────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Budget Service API (port 3001)               │
│  - POST /api/budget/transactions                                │
│  - GET  /api/budget/export/csv                                  │
│  - GET  /health                                                 │
└─────────────────────────────────────────────────────────────────┘
                                      │
               ┌──────────────────────┴──────────────────────┐
               ▼                                             ▼
    ┌──────────────────────┐                    ┌──────────────────────┐
    │   PostgreSQL DB      │                    │   Actual Budget      │
    │   (budget_service)   │                    │   (port 5006)        │
    │  - budgets           │                    │   - sync disabled    │
    │  - transactions      │                    │   - import via CSV   │
    │  - accounts          │                    │                    │
    │  - categories        │                    │                    │
    └──────────────────────┘                    └──────────────────────┘
               ▼
    ┌──────────────────────┐
    │   CSV Export         │
    │   /home/moh_solehuddin190805/actual-budget-csv/export.csv │
    │   Cron: 07:00 WIB/00:00 UTC │
    └──────────────────────┘
```

---

## 🧰 Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Server** | Node.js | v20 |
| **API** | Express.js | ^5.2.1 |
| **Database** | PostgreSQL | 16-alpine |
| **Client** | `@actual-app/api` | ^26.1.0 (currently disabled) |
| **Container** | Docker Compose | v3.8 |

---

## 📁 Project Structure

```
integrate-actual-budget-service/
├── src/
│   ├── server.js           # Express entry point
│   ├── app.js              # App config + middleware
│   ├── routes/
│   │   ├── index.js        # Router aggregation
│   │   ├── health.routes.js
│   │   ├── budget.routes.js
│   │   └── export.routes.js
│   ├── services/
│   │   └── budget.service.js    # Core business logic
│   └── database.js         # PostgreSQL connection + queries
├── scripts/
│   ├── sync-to-actual.js       # Node.js sync script (disabled)
│   └── budget-sync-wrapper.js  # Wrapper for sync script (disabled)
├── docker-compose.yml      # Multi-container setup
├── Dockerfile              # Node.js image build
├── .env.example            # Environment template
├── README.md               # This file
└── database.sqlite         # Legacy (unused)
```

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose installed
- Port 3001 (API), 5006 (Actual Budget), 5432 (PostgreSQL) available

### Run Services
```bash
cd /home/moh_solehuddin190805/integrate-actual-budget-service
docker compose up -d
```

### Verify Status
```bash
docker compose ps
docker logs budget-service
```

Service ready di: `http://localhost:3001`

---

## 📡 API Endpoints

### Health Check
```bash
GET /health
→ 200 OK
```

### Create Transaction
```bash
POST /api/budget/transactions

Headers:
- Content-Type: application/json
- X-Telegram-Sender: 7133351898  # User ID

Body:
{
  "amount": 150000,
  "date": "2026-06-08",
  "payee": "Toko Tahu",
  "category": "makanan",
  "notes": "Beli makan siang",
  "type": "expense"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "budgetId": 1
  }
}
```

### Export CSV (for Actual Budget import)
```bash
GET /api/budget/export/csv
→ text/csv content
```

**CSV Format:**
```csv
date,amount,payee,category,notes
2026-06-08,150000,Toko Tahu,makanan,Beli makan siang
```

---

## 🤖 Telegram Bot Integration (msytc)

### Format Chat
```
Rp150.000 Toko Tahu makanan Beli makan siang
```

### Parsing Rules
| Field | Source | Notes |
|-------|--------|-------|
| `amount` | Rp150.000 → `150000` | Integer (no comma) |
| `payee` | Toko Tahu | Text before category |
| `category` | makanan | Predefined: `makanan`, `transport`, `entertainment`, etc. |
| `notes` | Beli makan siang | Remaining text |
| `type` | Auto-detect | `CR` = income, `DB` = expense |
| `date` | Today | ISO format `YYYY-MM-DD` |

---

## 📊 CSV Export & Actual Budget Import

### Cron Schedule
- **Time:** 07:00 WIB (00:00 UTC) daily
- **File:** `/home/moh_solehuddin190805/actual-budget-csv/export.csv`
- **Job ID:** `68a70c9936ed`

### Manual Export (Testing)
```bash
curl -s http://localhost:3001/api/budget/export/csv > export.csv
```

### Import ke Actual Budget UI
1. Login ke `https://actual-budget.msytc.my.id:5006`
2. Budget → **Import Data** → **CSV**
3. Map kolom:
   - Date → `date`
   - Amount → `amount`
   - Payee → `payee`
   - Category → `category`
   - Notes → `notes`

---

## 🗄️ Database Schema

### Tables (auto-created)
```sql
-- Users (Telegram/WhatsApp sender)
budget_users
├─ id (PK)
├─ telegram_sender_id (unique)
├─ email (generated)
└─ name

-- Budgets (user's budget instance)
budgets
├─ id (PK)
├─ user_id (FK)
└─ name

-- Accounts (bank/cash)
budget_accounts
├─ id (PK)
├─ user_id (FK)
├─ actual_account_id (generated)
├─ name (e.g., "Cash", "Checking BCA")
├─ type (cash/checking/savings/credit_card)
└─ on_budget (boolean)

-- Transactions
budget_transactions
├─ id (PK)
├─ account_id (FK)
├─ amount (integer, Rp)
├─ date (ISO date string)
├─ payee
├─ category
└─ notes

-- Categories (optional, default seeding)
budget_categories
├─ id (PK)
├─ name
└─ type (income/expense)
```

---

## 🔧 Configuration

### Environment Variables
```bash
#/.env
NODE_ENV=production
PORT=3001

# PostgreSQL
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=budget_service
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Actual Budget (disabled currently)
ACTUAL_BASE_URL=http://actual_budget:5006
ACTUAL_DEFAULT_PASSWORD=your_password

# JWT (for future auth)
JWT_SECRET=super-...1898
JWT_EXPIRES_IN=7d
```

---

## 🛠️ Development Notes

### Current Status (June 2026)
| Feature | Status | Notes |
|---------|--------|-------|
| PostgreSQL Storage | ✅ Active | Fully working |
| CSV Export | ✅ Active | `/api/budget/export/csv` |
| Cron Auto-Export | ✅ Active | Daily at 07:00 WIB |
| Auto-sync Actual Budget | ⚠️ Disabled | Debugging node client sync issue |
| Auto-create Account/Kategori BCA | ⚠️ Disabled | Future enhancement |

### Known Limitations
1. **Sync to Actual Budget** via `@actual-app/api` disabled — using CSV import instead
2. **No HTTP REST API** from Actual Budget — must use `@actual-app/api` Node client
3. **No multi-user support** — each Telegram user gets own budgetID
4. **Category mapping** — limited to `makanan`, `transport`, `entertainment`, `fee`, `transfer`

---

## 🚧 Future Scope

### Phase 2: Auto-Sync to Actual Budget
- [ ] Fix Docker container startup issue
- [ ] Install `@actual-app/api` dependency
- [ ] Enable sync script via `budget-sync-wrapper.js`
- [ ] Test real-time sync (transaction → Actual Budget)

### Phase 3: Advanced Features
- [ ] Auto-detect BCA type: `CR` (income) vs `DB` (expense)
- [ ] Auto-create `checking_bca` account if missing
- [ ] Auto-create category if missing (e.g., `freelance`, `subscription`)
- [ ] Webhook from `msytc` bot → auto-trigger POST `/api/budget/transactions`
- [ ] Weekly/Monthly report (PDF/CSV)
- [ ] Reminder tagihan (listrik, internet, subs)

### Phase 4: Multi-Channel Support
- [ ] WhatsApp integration (same logic, different sender ID)
- [ ] Telegram bot direct command (`/catat`, `/cetak`)
- [ ] Voice note parsing (speech-to-text → transaction)

---

## 🐛 Debugging

### Container Logs
```bash
docker compose logs -f budget-service
```

### Test API
```bash
# Health
curl http://localhost:3001/health

# POST transaction
curl -X POST http://localhost:3001/api/budget/transactions \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Sender: 7133351898" \
  -d '{"amount":150000,"date":"2026-06-08","payee":"Toko","category":"makanan","notes":"Test"}'

# Export CSV
curl -s http://localhost:3001/api/budget/export/csv
```

### Database Query
```bash
docker exec budget-postgres psql -U postgres -d budget_service -c "SELECT * FROM budget_transactions LIMIT 10;"
```

---

## 📄 License

ISC License — Moh Solehuddin

---

**Last Updated:** 2026-06-08  
**Status:** MVP Ready (Phase 1)
