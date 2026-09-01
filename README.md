# 🏢 WhiteGold & Al-Jawhara ERP Backend API (`white-gold-api`)

High-performance, lightweight, multi-tenant Enterprise Resource Planning (ERP) Backend API tailored for cotton ginning factories (**White Gold**) and oil & fodder production plants (**Al-Jawhara**).

Built with **Express**, **Bun** runtime, **Prisma ORM**, and **SQLite**.

---

## 📐 System Architecture & Key Concepts

```
                  ┌──────────────────────────────────────────────┐
                  │          WhiteGold ERP Backend API           │
                  │             (Bun + Express Server)           │
                  └──────────────────────┬───────────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   │                                           │
         ▼                                           ▼
┌───────────────────────────┐               ┌───────────────────────────┐
│     WHITE_GOLD Domain     │               │     AL_JAWHARA Domain     │
├───────────────────────────┤               ├───────────────────────────┤
│ • Raw Cotton Purchases    │               │ • Seed/Production Buy     │
│ • Packaging Purchases     │               │ • Oils & Meal Sales       │
│ • Fiber & Waste Sales     │               │ • Operating Expenses      │
│ • Ginning Reports         │               │ • 5 Stock Departments     │
│ • Independent Vault       │               │ • Customer Ledgers        │
└───────────────────────────┘               └───────────────────────────┘
```

### 1. Domain Isolation (Multi-Tenancy)
The system is divided into two strict business domains:
- **`WHITE_GOLD`**: Cotton ginning operations, raw cotton (زهرة) purchases, fiber (شعرة) & waste sales, packaging, and ginning reports.
- **`AL_JAWHARA`**: Cottonseed oil & fodder mill operations, raw material purchases, oil & meal sales, operational expenses, multi-department stock tracking, and customer contract ledgers.

Each domain maintains its own isolated transactions, employee records, worker logs, stock, and financial vaults. Users are granted granular per-domain access via `UserDomainAccess`.

### 2. Vault Financial Mechanics
Each domain has its own independent financial Vault. Financial math follows a strict, non-negotiable formula:

$$\text{Available Balance} = \text{Vault Constant (Initial Capital)} + \sum \text{Credit Transactions} - \sum \text{Debit Transactions}$$

- **Vault Constant**: Set once by the Admin. Unchangeable except via explicit Emergency Override.
- **Credits (+)**: Sales revenues, manual credit adjustments.
- **Debits (-)**: Purchases, operational expenses, worker payouts, manual debit adjustments.

---

## 🗄️ Database Schema & Data Models

### Core System
- **`User`**: Account credentials, role (`ADMIN` or `USER`), active session management.
- **`UserDomainAccess`**: Maps users to allowed domains (`WHITE_GOLD` / `AL_JAWHARA`).
- **`Session`**: DB-backed session tokens for stateless yet revokable auth.
- **`Vault`**: Domain capital settings and audit logs (`VaultTransaction`, `VaultAdjustment`).

### White Gold Domain
- **`CottonPurchase`**: Raw cotton purchases (وزن, سعر, إجمالي, المورد).
- **`PackagingPurchase`**: Packing bags & ties purchases.
- **`CottonSale`**: Lint cotton sales (قنطار, سعر, مشتري).
- **`WasteSale`**: Ginning waste sales.
- **`GinningReport`**: Operational reports (بالات, زهرة, بذور) with document attachment URLs.

### Al-Jawhara Domain
- **`JawharaPurchase`**: Raw material & production inputs (بذرة قطن, زيوت).
- **`JawharaSale`**: Oil & meal sales (أمباز, زيت خام, زيت مكرر).
- **`JawharaExpense`**: Operating, maintenance, and utility expenses.
- **`Stock` & `StockMovement`**: 5 stock departments (خام, منتج تام, تعبئة, قطع غيار, الوقود).
- **`Customer`, `CustomerContract`, `CustomerTransaction`**: Full customer ledger system.

---

## 🔌 API Endpoint Map

### Auth & System
- `POST /api/auth/login` — Authenticate user & issue session token
- `POST /api/auth/logout` — Revoke active session
- `GET  /api/auth/me` — Fetch current user profile & domain access
- `POST /api/auth/verify-password` — Re-confirm admin password for sensitive actions
- `GET  /api/health` — System health check

### Financial Vault
- `GET  /api/vault/summary?domain=...` — Vault constant, credits, debits, available balance
- `GET  /api/vault/transactions?domain=...` — Unified domain financial ledger
- `PATCH /api/vault/:id` — Initialize vault constant
- `POST /api/vault/adjustments` — Add manual credit/debit adjustment
- `POST /api/vault/:id/emergency-override` — Emergency override vault constant

### Operations & Management
- `GET/POST/DELETE /api/wg/purchases` — Cotton purchases
- `GET/POST/DELETE /api/wg/sales` — Cotton sales
- `GET/POST/DELETE /api/wg/reports` — Ginning reports
- `GET/POST/DELETE /api/jw/purchases` — Jawhara purchases
- `GET/POST/DELETE /api/jw/sales` — Jawhara sales
- `GET/POST/DELETE /api/jw/expenses` — Jawhara expenses
- `GET/POST /api/jw/stock` — Stock levels & movements
- `GET/POST /api/customers` — Customer ledgers & contracts
- `GET/POST/DELETE /api/employees` — Domain staff management
- `GET/POST/DELETE /api/workers` — Domain daily workers management
- `GET /api/statistics` — Filterable statistics & metrics
- `POST /api/uploads` — Document & receipt image uploads (5MB max)

---

## 🧪 End-to-End Testing

The backend includes a zero-dependency, comprehensive E2E test script (`e2e-test.ts`) that validates all system workflows against a clean test database:

```bash
bun run e2e-test.ts
```

**Test Suite Coverage:**
1. Database wipe & clean seed initialization.
2. Admin authentication & RBAC user creation.
3. Vault capital initialization & transaction credit/debit calculation verification.
4. Purchase -> Stock -> Sales -> Vault balance reflection across both domains.
5. Domain security isolation (ensuring users cannot cross domain boundaries).

---

## 🚀 Local Setup & Deployment

### Local Development
```bash
# 1. Install dependencies
bun install

# 2. Push schema to SQLite
bun --bun run prisma db push

# 3. Seed initial admin user (admin / admin123)
bun run prisma/seed.ts

# 4. Start API server
bun run dev
```

### VPS Docker Deployment (Low-Resource 512MB RAM)
The backend is optimized to run inside a lightweight Bun Alpine container with a **512MB RAM cap**.

```bash
# 1. Build and start container
docker compose up -d --build

# 2. Seed database inside container
docker compose exec api sh -c "bun --bun run prisma db push && bun run prisma/seed.ts"
```
