# RankRiseUSA Outreach Platform - Local Setup & Developer Guide

A complete, exact, copy-paste-ready guide for setting up and running the full-stack platform locally in VS Code or any terminal.

---

## 📋 Prerequisites Checklist

Before starting, verify you have the following installed on your machine:

| Component | Minimum Version | Verify Command | Notes |
|---|---|---|---|
| **Node.js** | `v20.0.0+` | `node -v` | LTS recommended |
| **npm** | `v10.0.0+` | `npm -v` | Included with Node.js |
| **PostgreSQL** | `v15.0+` | `psql --version` | Running locally or via Docker |
| **Redis** | `v7.0+` *(Optional)* | `redis-cli ping` | *Optional for local dev*: System includes automatic in-memory queue fallback |

---

## 🚀 Quick Start in 5 Minutes

### Step 1: Open the Project in VS Code

```bash
cd "auto email tool"
code .
```

### Step 2: Configure Environment Variables

Create your local environment file by copying `.env.example`:

```bash
cp .env.example .env
```

Ensure the database URL matches your local PostgreSQL credentials:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rankriseusa_outreach?schema=public"
SESSION_SECRET="rankrise-dev-session-secret-change-in-production-min-32-chars"
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
EMAIL_SEND_MODE="DRY_RUN"
```

> [!TIP]
> Keep `EMAIL_SEND_MODE="DRY_RUN"` enabled locally. This allows you to test full campaign lifecycles, sender rotation, templates, and analytics without sending real emails to recipients.

---

### Step 3: Database Setup & Demo Seeding

In your terminal, execute:

```bash
# 1. Create PostgreSQL database if it does not exist
createdb rankriseusa_outreach 2>/dev/null || true

# 2. Run Prisma migrations to establish database schema
npx prisma migrate dev --schema=backend/prisma/schema.prisma

# 3. Seed demo senders, templates, and sample leads
npx tsx backend/prisma/seed.ts
```

---

## 💻 Running the Platform in VS Code (3 Terminals)

Split your VS Code terminal panel into **3 tabs/panes**:

```
+---------------------------+---------------------------+---------------------------+
|  TERMINAL 1: BACKEND API  |   TERMINAL 2: FRONTEND    | TERMINAL 3: QUEUE WORKER  |
|  Port: 4000               |   Port: 5173              | Background Worker         |
+---------------------------+---------------------------+---------------------------+
```

### 🟢 Terminal 1: Backend API Server

```bash
npm run dev:backend
```

**Expected Startup Output:**
```
==================================================
  RankRiseUSA Outreach Platform - Configuration
==================================================
  Node Environment:     development
  Backend Port:         4000
  Database Host:        localhost:5432/rankriseusa_outreach
  Redis URL:            redis://localhost:6379
  Email Send Mode:      DRY_RUN (Safe Simulation)
==================================================
🚀 RankRiseUSA Outreach Server running on port 4000
```

---

### 🔵 Terminal 2: Frontend Dashboard (Vite + React)

```bash
npm run dev:frontend
```

**Expected Startup Output:**
```
  VITE v6.4.3  ready in 180 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

### 🟣 Terminal 3: Standalone Background Queue Worker

```bash
npm run worker
```

**Expected Startup Output:**
```
  ================================================
  ⚙️  RankRiseUSA Background Queue Worker Process
  ================================================
  Environment:     development
  Redis URL:       redis://localhost:6379
  Email Send Mode: DRY_RUN
  ================================================
✅ PostgreSQL database connected successfully
✅ Queue worker started [Engine: IN_MEMORY_FALLBACK, Status: in-memory-fallback]
👀 Listening for email dispatch jobs...
```

*(If Redis is running locally, the worker connects directly to BullMQ. If Redis is not running, the worker automatically operates via the in-memory queue fallback).*

---

## 🔑 Default Credentials & Access

Open your browser to: **`http://localhost:5173`**

| Field | Value |
|---|---|
| **URL** | `http://localhost:5173` |
| **Email** | `admin@rankriseusa.com` |
| **Password** | `RankRise2026!Secure` |
| **Role** | System Administrator |

---

## 🔍 How to Verify System Health

Run these curl commands in another terminal to verify all services:

### 1. Unified Health Check (DB + Queue)
```bash
curl http://localhost:4000/api/health
```
```json
{
  "status": "ok",
  "service": "outreach-api",
  "database": "connected",
  "queue": "in-memory-fallback",
  "timestamp": "2026-09-06T07:54:00.000Z"
}
```

### 2. Dedicated Database Health Check
```bash
curl http://localhost:4000/api/health/db
```
```json
{
  "status": "ok",
  "database": "connected",
  "latencyMs": 1.2
}
```

### 3. Dedicated Queue Health Check
```bash
curl http://localhost:4000/api/health/queue
```

---

## 🧪 Running Tests & Production Builds

### Run the Vitest Test Suite (All 49 Tests)
```bash
npm test
```
```
✓ tests/securityAndSuppression.test.ts (4 tests)
✓ tests/campaigns.test.ts (3 tests)
✓ tests/leadImportIntegration.test.ts (1 test)
✓ tests/senderRotation.test.ts (5 tests)
✓ tests/templates.test.ts (9 tests)
✓ tests/senders.test.ts (5 tests)
✓ tests/api.test.ts (5 tests)
✓ tests/fileParser.test.ts (3 tests)
✓ tests/greetingExtractor.test.ts (11 tests)
✓ tests/encryption.test.ts (3 tests)

Test Files  10 passed (10)
     Tests  49 passed (49)
```

### Run Production Build Across All Workspaces
```bash
npm run build
```

---

## 📬 Connecting Senders & First Campaign Walkthrough

1. **Log in** at `http://localhost:5173` with default credentials.
2. **Review Senders** (`/senders`):
   - Notice the seeded accounts (`alex.rivers@rankriseusa.com`, `sarah.chen@rankriseusa.com`, etc.).
   - Each sender displays: Status, Provider (Gmail / Outlook), Daily Limit (max 20), Sent Today, and Remaining Capacity.
   - To connect a real account, click **[+ Connect Gmail]** or **[+ Connect Outlook]** (see [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md) and [MICROSOFT_OAUTH_SETUP.md](MICROSOFT_OAUTH_SETUP.md)).
3. **Import Leads** (`/leads`):
   - Click **Import Leads** and upload a CSV/XLSX file or choose a sample list.
   - Map fields (First Name, Last Name, Email, Company Name, Industry).
   - Leads are automatically deduped, normalized, and validated.
4. **Create a Campaign** (`/campaigns` > **New Campaign**):
   - Select service category (e.g., SEO Growth, Web Development).
   - Select 1 or more email templates.
   - Select 2 or more senders for round-robin rotation.
   - Configure send delay (90–300s recommended) and schedule window (09:00–17:00 EST).
5. **Pre-Launch Safety Confirmation**:
   - Review estimated daily capacity and strict 20 sends/day cap.
   - Check the mandatory confirmation checkbox and click **Start Campaign**.
6. **Monitor Live Execution** (`/analytics` & `/logs`):
   - Watch real-time logs, sender rotation, delays, and analytics update.

---

## 🛠️ Common Pitfalls & Quick Fixes

| Problem | Cause | Resolution |
|---|---|---|
| `PrismaClientInitializationError: Can't reach database server at localhost:5432` | PostgreSQL is not running or credentials in `.env` are wrong. | Start PostgreSQL (`brew services start postgresql@15` or start Postgres app). Check `DATABASE_URL` in `.env`. |
| `ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)` | `ENCRYPTION_KEY` is missing or has incorrect length. | Generate a 32-byte key: `node -e "console.log(crypto.randomBytes(32).toString('hex'))"` and paste in `.env`. |
| `Redis ECONNREFUSED` | Redis is not running locally. | **No action required**: The system gracefully falls back to the in-memory queue. To use Redis, start Redis: `brew services start redis` or `docker run -p 6379:6379 redis:7`. |
| `Vite proxy error: ECONNREFUSED 127.0.0.1:4000` | Frontend is started before backend API is running. | Start Terminal 1 (`npm run dev:backend`) before Terminal 2. |
| `Emails not actually delivering to inboxes` | `EMAIL_SEND_MODE` is set to `DRY_RUN`. | This is intended for safety. Set `EMAIL_SEND_MODE="LIVE"` in `.env` and configure OAuth credentials to send real messages. |
