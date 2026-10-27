# RankRiseUSA Outreach Automation Platform

> A production-grade **Lead Outreach Management, Personalized Email Campaign, and Multi-Sender Email Automation platform** engineered with strict deliverability safeguards, intelligent greeting extraction, official Gmail & Microsoft Graph OAuth 2.0 integrations, token encryption, and background queue scheduling.

---

## Key Capabilities & Safeguards

- **Multi-Sender Rotation & Daily Safety Cap**: Strictly enforces an application safety ceiling of **20 emails/day per sender account** with automatic midnight counter resets, protecting domain reputation and preventing spam flagging.
- **Official OAuth 2.0 Integrations (No Web Scraping)**: Uses official Google Gmail API (`googleapis`) and Microsoft Graph API (`@microsoft/microsoft-graph-client`) with offline refresh token persistence. No passwords or IMAP/SMTP credentials are stored.
- **AES-256-GCM Token Encryption**: All access and refresh tokens are encrypted at rest using AES-256-GCM with 128-bit authentication tags and unique initialization vectors.
- **Intelligent Greeting & Deduplication**: Parses raw Excel (`.xlsx`, `.xls`) and `.csv` files with variable-header alias matching (`email id`, `registrant_email`, `domain_name`, `contact number`, etc.). Extracts personal greetings from emails (e.g. `linda@` -> "Linda", `sam.miller@` -> "Sam") and avoids bad greetings (e.g. `info@` -> "Hello [Company] team," or "Hi there,").
- **10 Built-In Reference Outreach Templates**: Preloaded with 10 industry-tested cold outreach templates across categories (`WEBSITE`, `APP_DEVELOPMENT`, `SEO`, `GOOGLE_BUSINESS_PROFILE`, `DIGITAL_MARKETING`, `META_ADS`, `GOOGLE_ADS`, `LOCAL_SEO`).
- **Universal Fallback Variable Substitution**: Safely replaces `{{first_name}}`, `{{company_name}}`, `{{sender_name}}`, `{{sender_signature}}`, `{{website}}`, etc. Never leaks unreplaced raw `{{curly_brackets}}` to recipients.
- **Dynamic HTML/Text Signatures**: Automatically resolves individualized, responsive HTML and plain-text signatures per sender account.
- **Resilient Background Queue**: High-throughput queue with randomized delays (e.g. 90-300 seconds), scheduled sending windows, and an automated in-memory runner fallback if Redis is offline.
- **Global Suppression / Do Not Contact List**: Automatic duplicate protection and suppression checks prevent emailing unsubscribed, bounced, or blocked leads.
- **Full Audit Trails & Delivery Telemetry**: Real-time delivery logs, provider error diagnostics, and administrative audit logging.

---

## Monorepo Architecture

```
auto email tool/
├── shared/               # Shared TypeScript types, Zod schemas, enums, DTOs & templates
│   ├── src/enums/        # LeadStatus, SenderProvider, CampaignStatus, etc.
│   ├── src/types/        # LeadDto, SenderAccountDto, CampaignDto, etc.
│   └── src/templates/    # 10 Reference outreach templates
├── backend/              # Node.js + Express + TypeScript + Prisma ORM
│   ├── src/modules/
│   │   ├── auth/         # JWT HttpOnly cookie authentication & admin session
│   │   ├── leads/        # Leads CRUD, deduplication, greeting extractor
│   │   ├── imports/      # Excel/CSV parser, alias mapper, preview wizard
│   │   ├── templates/    # Template engine, safe variable renderer, HTML sanitizer
│   │   ├── senders/      # Gmail & Microsoft OAuth, sender rotation, signatures
│   │   ├── email/        # Gmail & Microsoft Graph providers, MIME builder
│   │   ├── queue/        # Background queue worker (BullMQ + in-memory fallback)
│   │   ├── campaigns/    # Campaign lifecycle, capacity forecast, pause/resume/stop
│   │   ├── suppression/  # Global suppression & Do-Not-Contact manager
│   │   ├── logs/         # Delivery logs & administrative audit trails
│   │   └── analytics/    # Dashboard KPIs, sender throughput, funnel breakdown
│   ├── src/utils/        # AES-256-GCM token encryption
│   ├── src/scripts/      # Database demo seeder (npm run seed)
│   └── tests/            # 10 test suites (49 passing unit & integration tests)
├── frontend/             # React 19 + Vite + Tailwind CSS dashboard
│   ├── src/components/
│   │   ├── layout/       # Responsive Sidebar & Header with safety status
│   │   ├── dashboard/    # Executive Overview KPI dashboard
│   │   ├── leads/        # Lead directory & multi-step CSV/Excel import wizard
│   │   ├── campaigns/    # Campaign automation list & safety launch modal
│   │   ├── templates/    # Template catalog, live preview, test-send modal
│   │   ├── senders/      # Mailbox connections, quota bars, signature editor
│   │   ├── suppression/  # Do-Not-Contact list, manual block, CSV upload
│   │   ├── logs/         # Real-time delivery logs & error diagnostic viewer
│   │   ├── analytics/    # Conversion funnel & sender quota performance
│   │   └── settings/     # OAuth setup guide, copyable redirect URIs, admin session
│   └── src/context/      # AuthContext session provider
├── prisma/               # Prisma schema & PostgreSQL database configuration
├── demo/                 # Ready-to-import sample files (sample_leads.csv, sample_leads.xlsx)
└── docs/                 # Architecture, API specifications, and OAuth setup guides
```

---

## Quick Start: Local Setup in 4 Steps

### Step 1: Install Dependencies
From the repository root, install all monorepo dependencies:
```bash
npm install
```

### Step 2: Environment Configuration
Create or verify the `.env` file at the root or in `backend/.env`. A complete `.env` is already configured for local execution:

```env
# Server
PORT=4000
NODE_ENV=development

# Database (PostgreSQL)
DATABASE_URL="postgresql://coder@localhost:5432/rankriseusa_outreach?schema=public"

# Redis (Optional - in-memory fallback is automatically used if Redis is not running)
REDIS_URL="redis://localhost:6379"

# Security (AES-256-GCM 64-character hex key)
EMAIL_TOKEN_ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
SESSION_SECRET="rankrise_super_secure_session_secret_key_2026_dev_mode"

# Email Sending Mode: 'DRY_RUN' simulates delivery in logs; 'LIVE' sends real emails
EMAIL_SEND_MODE="DRY_RUN"

# Google Cloud OAuth (Optional for testing demo senders; required for connecting your own Gmail)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI="http://localhost:4000/api/senders/gmail/callback"

# Microsoft Azure OAuth (Optional for testing demo senders; required for connecting your own Outlook)
MICROSOFT_CLIENT_ID=""
MICROSOFT_CLIENT_SECRET=""
MICROSOFT_REDIRECT_URI="http://localhost:4000/api/senders/microsoft/callback"
```

### Step 3: Initialize Database & Seed Demo Data
Push the Prisma schema to your PostgreSQL database and seed the system with realistic demo data:

```bash
# Push schema to database
npx prisma db push

# Populate admin user, 10 outreach templates, 2 connected senders, leads, suppression & sample campaign
npm run seed
```

### Step 4: Run the Application
Start both backend API (`port 4000`) and frontend dashboard (`port 5173`) concurrently:
```bash
npm run dev
```

Open your browser at **`http://localhost:5173`**.

---

## Default Access Credentials

| Field | Value |
|---|---|
| **Web Dashboard** | `http://localhost:5173` |
| **Backend REST API** | `http://localhost:4000/api` |
| **API Health Check** | `http://localhost:4000/api/health` |
| **Admin Email** | `admin@rankriseusa.com` |
| **Admin Password** | `RankRiseAdmin2026!` |

---

## Detailed Feature Guide

### 1. Lead Directory & Import Wizard
- **Importing Files**: Navigate to **Leads** and click **Import Leads**. You can upload any CSV or Excel file (`.xlsx`, `.xls`).
- **Try the Demo Files**: We have prepared two realistic demo files in the `demo/` folder:
  - `demo/sample_leads.csv`
  - `demo/sample_leads.xlsx`
- **Variable-Header Mapping**: The parser automatically recognizes non-standard headers (`Registrant Email`, `Business Name`, `Contact Person`, `Telephone`, `Website URL`, etc.).
- **Deduplication & Sanitization**: The system flags duplicate emails and existing domains, extracts greetings (e.g. `alexander.hayes@` -> "Alexander", `info@` -> "Hello Apex Solar Solutions team,"), and verifies against the suppression list before saving.

### 2. 10 Reference Outreach Templates & Safe Personalization
- Navigate to **Templates** to review the 10 pre-seeded templates.
- **Service Categories**: `WEBSITE`, `APP_DEVELOPMENT`, `SEO`, `GOOGLE_BUSINESS_PROFILE`, `DIGITAL_MARKETING`, `META_ADS`, `GOOGLE_ADS`, `LOCAL_SEO`, `GENERAL_DIGITAL_SERVICES`.
- **Live Preview & Test Send**: Click the Eye icon on any template to preview how variables look when rendered. Use the Paper Airplane icon to send a simulated or live test email to any address.
- **Safe Fallbacks**: If a lead lacks a first name, `{{first_name}}` automatically renders as `"there"` (e.g. `"Hi there,"`), ensuring clean outreach without awkward placeholders or missing spaces.

### 3. Multi-Sender Management & 20-Send Daily Ceiling
- Navigate to **Email Accounts**.
- Two demo sender accounts are pre-configured:
  - **Sarah Jenkins** (`sarah.jenkins@rankriseusa.com`) - Google Workspace / Gmail
  - **David Vance** (`david.vance@rankriseusa.com`) - Microsoft 365 / Outlook
- **Daily Limit Enforcement**: Every sender account is strictly capped at **20 emails per 24 hours**. The live quota bar shows sends used and sends remaining. Counters automatically reset at midnight.
- **Signatures**: Click the Edit icon on any sender to customize their HTML and plain-text email signature.

### 4. Setting Up Live Google & Microsoft OAuth (Optional)
To connect your own live Gmail or Microsoft 365 mailboxes:

#### Google Cloud (Gmail API):
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project and enable the **Gmail API**.
3. Under **Credentials > Create Credentials > OAuth client ID**, select **Web application**.
4. Add Authorized Redirect URI:
   `http://localhost:4000/api/senders/gmail/callback`
5. Copy `Client ID` and `Client Secret` into `backend/.env`.
6. In the dashboard, click **Connect Gmail**.

#### Microsoft Entra ID (Azure Graph API):
1. Go to [Azure Portal > App Registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade).
2. Register a new application (Accounts in any organizational directory + personal Microsoft accounts).
3. Under **Authentication > Add a platform > Web**, add Redirect URI:
   `http://localhost:4000/api/senders/microsoft/callback`
4. Under **API Permissions**, grant delegated permissions: `Mail.Send`, `offline_access`, `User.Read`.
5. Under **Certificates & secrets**, create a Client Secret.
6. Copy `Client ID` and `Client Secret` into `backend/.env`.
7. In the dashboard, click **Connect Microsoft**.

### 5. Campaign Automation & Safety Launch
- Navigate to **Campaigns**. A sample campaign (*"Q1 Local Business Modernization Campaign"*) is ready in Draft status.
- **Creating a New Campaign**: Click **Create Campaign** to select target leads, templates, sender mailboxes, randomized delay intervals (e.g. 90-300 seconds), and daily sending windows (e.g. 09:00 - 17:00).
- **Safety Launch Modal**: Clicking **Launch Campaign** calculates the estimated days to complete based on sender count and remaining daily capacity. You must confirm compliance before jobs are queued.
- **Live Controls**: While running, you can **Pause** the campaign at any time or **Stop** it (which cancels all pending queue jobs).

### 6. Suppression / Do-Not-Contact List
- Navigate to **Suppression**.
- Any email address or domain entered here will be globally skipped by all campaigns and queue workers.
- Add entries manually or bulk-import a suppression CSV.

### 7. Delivery Logs & System Audit Trail
- Navigate to **Queue & Logs**.
- **Email Delivery Logs**: Inspect every dispatched email with status (`SENT`, `FAILED`, `TEMPORARY_FAILURE`, `SKIPPED`, `BOUNCED`), recipient, sender mailbox, and provider message IDs.
- **System Audit Trail**: Complete immutable audit log of all administrative actions (campaign starts, pauses, sender additions, suppression entries) with IP addresses and timestamps.

### 8. Analytics & Conversion Funnel
- Navigate to **Analytics** to visualize:
  - Lead engagement funnel (Ingested -> Sanitized -> Sent -> Suppressed).
  - Multi-sender throughput comparison and success rates.
  - Template utilization metrics.

---

## Email Send Modes: `DRY_RUN` vs `LIVE`

The platform defaults to `EMAIL_SEND_MODE=DRY_RUN` for safe local testing:
- **`DRY_RUN`**: Simulates email delivery without calling the external Gmail or Microsoft APIs. Queue delays, sender rotation, counter increments, lead status updates, and send logs operate realistically. Perfect for testing campaigns and workflows safely.
- **`LIVE`**: Sends actual emails through official Gmail and Microsoft Graph APIs to real recipients. To enable, set `EMAIL_SEND_MODE=LIVE` in `backend/.env`.

---

## Running Automated Tests

Run the full Vitest suite (10 test suites, 49 tests):
```bash
npm test
```

Test coverage includes:
- AES-256-GCM encryption & decryption
- Lead greeting extractor & fallback logic
- File parser with alias mapping & deduplication
- Safe template variable rendering & XSS script stripping
- Sender rotation with 20-send daily cap enforcement
- Gmail & Microsoft OAuth integration mock tests
- Lead import integration API
- Campaign lifecycle & safety metric calculations
- Security verification & token non-leakage tests

---

## Production Build & Typecheck

To verify TypeScript types and build optimized production bundles:
```bash
# Typecheck all workspaces
npm run typecheck

# Build shared, backend, and frontend
npm run build
```

---

## License & Credits

Built for **RankRiseUSA** as a secure, compliant, high-reputation cold email outreach platform.
