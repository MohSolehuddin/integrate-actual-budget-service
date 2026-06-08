# 🏦 Budget Service Bot - Telegram Integration

Bot Telegram untuk mencatat transaksi keuangan dan menyimpannya ke Actual Budget via PostgreSQL.

---

## 🚀 Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| 📝 **Parsing Transaksi Otomatis** | Mendukung format `B/J` dan bahasa natural Indonesia |
| 💻 **Telegram Integration** | Bot langsung terintegrasi via polling |
| 🐘 **PostgreSQL Storage** | Semua transaksi tersimpan di database lokal |
| 📊 **Export CSV** | Export transaksi ke format Actual Budget |
| 🤖 **Model Switch** | Ganti model AI via `/model` command |

---

## 📦 Instalasi & Setup

### 1. Clone Repository
```bash
cd /home/moh_solehuddin190805/integrate-actual-budget-service/
git clone git@github.com:MohSolehuddin/integrate-actual-budget-service.git
cd integrate-actual-budget-service
```

### 2. Setup Environment

**File `.hermes/.env`** (Hermes Agent token):
```
TELEGRAM_BOT_TOKEN=8883415033:AAHGRlM7oPi3p7H_25w_TQ7ixWRZsCQyIOc
```

**File `docker-compose.yml`** (Budget Bot token):
```yaml
environment:
  - TELEGRAM_BOT_TOKEN=7951831778:AAHHg8pVMRFhvDjUIaFDgvOQ-7IwrjXOQaY
  - ACTUAL_BASE_URL=http://actual_budget:5006
  - POSTGRES_HOST=postgres
```

### 3. Jalankan Docker
```bash
docker compose up -d --build
```

### 4. Verifikasi
```bash
# Cek status
curl http://localhost:3001/

# Cek logs
docker logs -f budget-service
```

---

## 🤖 Cara Menggunakan Bot

### **1. Komplit Bot Telegram**

| Command | Deskripsi | Contoh |
|---------|-----------|--------|
| `/start` | Panduan penggunaan | `/start` |
| `/status` | Cek budget & user | `/status` |
| `/export` | Export transaksi ke CSV | `/export` |
| `/model [nama]` | Ganti model AI | `/model gpt-4o` |
| `/help` | Bantuan | `/help` |

### **2. Format Transaksi**

#### **Format Command `B/J` (Explicit)**

| Type | Format | Contoh | Output |
|------|--------|--------|--------|
| **Beli (B)** | `B [Kategori] [Deskripsi] [Amount]` | `B Makan nasi 15k` | `-15000` |
| **Jual (J)** | `J [Kategori] [Deskripsi] [Amount]` | `J Gaji 2jt` | `+2000000` |

#### **Format Natural Language (Auto-detect)**

| Type | Format | Contoh | Output |
|------|--------|--------|--------|
| **Expense** | `beli/bayar [Kategori] [Amount]` | `beli kopi 25k` | `-25000` |
| **Income** | `jual/gaji/terima [Kategori] [Amount]` | `gaji project 500k` | `+500000` |

#### **Contoh Transaksi:**

```text
# Beli makan
B Makan nasi goreng 15k
beli kopi 25k

# Gajiincome
J Gaji upwork 2jt
gaji project 500k
```

### **3. Format Amount**

| Format | Nilai |
|--------|-------|
| `15k` | `15000` |
| `25k` | `25000` |
| `2jt` | `2000000` |
| `500k` | `500000` |
| `1m` | `1000000` |

---

## 📊 Endpoints API

### **1. Health Check**
```bash
curl http://localhost:3001/
# Response: {"status":"ok","service":"Budget Service","port":"3001"}
```

### **2. Get Status Budget**
```bash
curl -H "x-telegram-sender: 7133351898" http://localhost:3001/api/budget/status
```

### **3. Get Accounts**
```bash
curl -H "x-telegram-sender: 7133351898" http://localhost:3001/api/budget/accounts
```

### **4. Add Transaction**
```bash
curl -X POST http://localhost:3001/api/budget/transactions \
  -H "Content-Type: application/json" \
  -H "x-telegram-sender: 7133351898" \
  -d '{
    "accountId": "1",
    "transactions": [{
      "date": "2026-06-08",
      "amount": -15000,
      "payee": "Makan nasi goreng",
      "category": "food",
      "notes": "Beli makan siang"
    }]
  }'
```

### **5. Export CSV**
```bash
curl http://localhost:3001/api/budget/export/csv -o transactions.csv
```

---

## 🗄️ Database Schema (PostgreSQL)

### **Table: `users`**
| Field | Type | Description |
|-------|------|-------------|
| `id` | SERIAL | Primary key |
| `sender_id` | TEXT | Telegram user ID |
| `email` | TEXT | User email |
| `name` | TEXT | User name |
| `actual_user_id` | TEXT | Actual Budget user ID |
| `budget_id` | INTEGER | Budget ID |
| `created_at` | TIMESTAMP | Created |
| `updated_at` | TIMESTAMP | Updated |

### **Table: `transactions`**
| Field | Type | Description |
|-------|------|-------------|
| `id` | SERIAL | Primary key |
| `user_id` | INTEGER | Foreign key ke users |
| `chat_id` | TEXT | Telegram chat ID |
| `raw_text` | TEXT | Pesan asli Telegram |
| `parsed_json` | JSONB | Parsing hasil |
| `date` | TEXT | Tanggal transaksi |
| `payee` | TEXT | Penerima/Pengirim |
| `category` | TEXT | Kategori |
| `amount` | BIGINT | Jumlah (positive/negative) |
| `notes` | TEXT | Catatan |
| `created_at` | TIMESTAMP | Created |

### **Table: `budget_accounts`**
| Field | Type | Description |
|-------|------|-------------|
| `id` | SERIAL | Primary key |
| `user_id` | INTEGER | Foreign key ke users |
| `actual_account_id` | TEXT | Actual Budget account ID |
| `name` | TEXT | Nama rekening |
| `type` | TEXT | Tipe (cash, checking, etc) |
| `on_budget` | BOOLEAN | On/off budget |
| `created_at` | TIMESTAMP | Created |

---

## 🔧 Konfigurasi

### **Environment Variables**

```yaml
# Docker compose environment
environment:
  - NODE_ENV=production
  - PORT=3001
  - POSTGRES_HOST=postgres
  - POSTGRES_PORT=5432
  - POSTGRES_DB=budget_service
  - POSTGRES_USER=postgres
  - POSTGRES_PASSWORD=postgres
  - ACTUAL_BASE_URL=http://actual_budget:5006
  - ACTUAL_DEFAULT_PASSWORD=secret
  - ACTUAL_HTTP_API_URL=http://actual-http-api:5007
  - BUDGET_SERVICE_URL=http://budget-service:3001
  - TELEGRAM_BOT_TOKEN=7951831778:***
  - JWT_SECRET=super-secret-jwt-key-7133351898
  - JWT_EXPIRES_IN=7d
```

### **Docker Services**

| Service | Port | Image | Status |
|---------|------|-------|--------|
| `budget-service` | 3001 | Local build | ✅ Running |
| `actual-http-api` | 5007 | jhonderson/actual-http-api:26.6.0 | ✅ Running |
| `budget-postgres` | 5432 | postgres:16-alpine | ✅ Running |
| `actual-budget` | 5006 | actualbudget/actual-server:latest | ✅ Running |

---

## 🐛 Troubleshooting

### **1. Bot tidak jalan (401 Unauthorized)**
```bash
# Cek token di docker-compose.yml
grep "TELEGRAM_BOT_TOKEN" docker-compose.yml

# Pastikan token benar (beda dari Hermes Agent)
# Token budget bot: 7951831778:***
# Token Hermes Agent: 8883415033:***
```

### **2. Transaksi tidak tersimpan**
```bash
# Cek logs
docker logs budget-service | grep -i "transaction"

# Cek database
docker exec budget-postgres psql -U postgres -d budget_service -c "SELECT * FROM transactions ORDER BY id DESC LIMIT 5;"
```

### **3. PostgreSQL tidak terhubung**
```bash
# Cek service
docker compose ps

# Restart postgres
docker compose restart postgres
```

---

## 📈 Export ke Actual Budget

### **Cara 1: Manual via CSV**
```bash
# Export CSV
curl http://localhost:3001/api/budget/export/csv -o transactions.csv

# Import ke Actual Budget:
# Settings → Import → Transactions → Upload CSV
```

### **Cara 2: REST API (Tunggu Setup)**
- `actual-http-api` sudah jalan di port `5007`
- Setup sync-key di Actual Budget untuk otomatis sync

---

## 🚀 Development

### **Restart Container**
```bash
docker compose up -d --build
```

### **Lihat Logs Real-time**
```bash
docker logs -f budget-service
```

### **Reset Database**
```bash
docker compose down -v
docker compose up -d postgres
```

---

## 📝 Catatan Penting

1. **Token Pisah**: Budget bot pakai token berbeda dari Hermes Agent
2. **Parsing**: Mendukung 2 format (B/J + natural language)
3. **Amount**: Auto-parse `k`, `jt`, `m` (ribu, juta, miliar)
4. **Sync**: CSV export sudah aktif, REST sync belum (butuh setup sync-key)
5. **Cron Job**: `/model` switch via cron (`model-switch-handler`)

---

## 📞 Kontak & Support

- **Developer**: Mr. Solehuddin
- **Telegram Bot**: `@budget_service_bot` atau nama yang dikonfigurasi
- **Chat**: Telegram DM dengan Hermes Agent (token berbeda)

---

**Last Updated**: 2026-06-08
**Version**: 1.0.0
