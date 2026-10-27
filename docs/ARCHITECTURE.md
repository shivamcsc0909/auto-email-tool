# RankRiseUSA Outreach Automation Platform - System Architecture

## Executive Summary
RankRiseUSA Outreach Automation Platform is a multi-sender, campaign-driven email automation system built with Node.js, Express, TypeScript, React, Tailwind CSS, PostgreSQL (via Prisma ORM), and BullMQ with Redis.

Unlike simple bulk email senders, RankRiseUSA Outreach Platform incorporates:
1. **Intelligent Lead Normalization & Greeting Extraction**: Differentiates personal addresses (`linda@...` -> "Hi Linda,") from role-based mailboxes (`info@...` -> "Hi there," or "Hello [Company] team,"), avoiding broken greetings.
2. **Official API & OAuth Only**: Direct integration with Gmail API (Google Workspace / @gmail.com) and Microsoft Graph API (Office 365 / Outlook). Zero browser automation, zero password storage.
3. **Strict 20-Email Application Safety Cap**: Hard application ceiling of 20 emails per sender per configured daily cycle, preventing domain burning.
4. **Resilient Queue Architecture**: Background job scheduling with BullMQ/Redis for campaign processing, randomized delay windows, backoff handling, and daily counter resets.
5. **Universal Fallback Engine**: Missing variables never leak raw `{{brackets}}` or broken templates.
6. **Multi-Tenant Sender Rotations**: Dynamic sender round-robin prioritizing available capacity.

---

## Actual Tech Stack Implementation

- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS 3, Lucide React
- **Backend**: Node.js 20+, Express 4, TypeScript 5
- **Database**: PostgreSQL 15+
- **ORM**: Prisma 6.4.1 / `@prisma/client`
- **Queue**: BullMQ 5.41 with Redis 7 (plus resilient in-memory asynchronous worker fallback for zero-dependency local dev/testing)
- **Authentication**: JWT stored in signed HttpOnly cookies + bcryptjs password hashing
- **Email Providers**:
  - Google Gmail API (`googleapis` v144) using OAuth 2.0 and RFC 2822 MIME formatting
  - Microsoft Graph API (`@microsoft/microsoft-graph-client` v3) using OAuth 2.0 `Mail.Send`
  - DryRunProvider (in-engine simulation for safe testing)
- **Token Security**: AES-256-GCM authenticated encryption at rest (16-byte IV, 16-byte auth tag)
- **Build Tool**: Vite (Frontend), `tsc` (Backend & Shared)
- **Package Manager**: npm (Monorepo workspaces: `shared`, `backend`, `frontend`)

---

## Architectural Diagram

```
+---------------------------------------------------------------------------------------+
|                                  Frontend (React + Vite)                              |
|   - Leads & Import Wizard (Excel/CSV)           - Sender Management & OAuth Triggers |
|   - Dynamic Signature Customizer                - Campaign Wizard & Safety Check      |
|   - Real-time Dashboard & Logs                  - Suppression List                    |
+-------------------------------------------+-------------------------------------------+
                                            | REST API / HttpOnly Session Cookie
                                            v
+---------------------------------------------------------------------------------------+
|                               Backend (Node.js + Express)                             |
|   - Session Auth & Audit Logging               - Zod Input Sanitization & Validation  |
|   - AES-256-GCM Token Encryption                - Intelligent Greeting Engine          |
|   - Template & Variable Renderer               - Sender Allocator & Safety Limiter    |
|   - Campaign Life-Cycle Orchestrator           - Provider Adapter Gateway             |
+---------------------+-------------------------------------+---------------------------+
                      |                                     |
                      v                                     v
+------------------------------------+  +-----------------------------------------------+
|         PostgreSQL Database        |  |                 Redis & BullMQ                |
|  - AdminUser      - Lead           |  |  - EMAIL_SEND       - EMAIL_RETRY             |
|  - LeadSource     - Template       |  |  - CAMPAIGN_RUNNER  - DAILY_COUNTER_RESET     |
|  - SenderAccount  - Campaign       |  |  - TOKEN_REFRESH                              |
|  - CampaignLead   - EmailJob       |  +-----------------------+-----------------------+
|  - EmailLog       - Suppression    |                          |
|  - AuditLog       - AppSetting     |                          v
+------------------------------------+          +-------------------------------+
                                                |    Email Provider Adapters    |
                                                |  - Gmail API (googleapis)     |
                                                |  - Microsoft Graph API        |
                                                |  - DryRunProvider (Dev/Test)  |
                                                +-------------------------------+
```

---

## Core System Modules

### 1. Lead Ingestion & Normalization (`/backend/src/modules/leads`)
- **Excel & CSV Ingestion**: Parses `.xlsx`, `.xls`, and `.csv` files regardless of column arrangement.
- **Header Alias Matching**: Automatically maps aliases (`registrant_email`, `contact number`, `domain_name`).
- **Identity & Greeting Resolver**:
  - Checks against role-based addresses (`info@`, `admin@`, `support@`, `sales@`, `hello@`, `office@`, etc.).
  - Extracts first and last names from personal addresses when confidence is high.
  - Formats domain names and company titles cleanly.
- **Deduplication & Suppression Check**: Scans email and domain against existing leads and the suppression table before insertion.

### 2. Email Template & Safe Renderer (`/backend/src/modules/templates`)
- Preloaded with 10 seed templates covering `WEBSITE`, `APP_DEVELOPMENT`, `SEO`, `GOOGLE_BUSINESS_PROFILE`, `DIGITAL_MARKETING`, `LOCAL_SEO`, and `GENERAL_DIGITAL_SERVICES`.
- Context-aware variable replacement (`{{first_name}}`, `{{company_name}}`, `{{sender_name}}`, `{{sender_signature}}`, `{{current_date}}`).
- Fallback mechanisms ensure missing fields degrade gracefully into general greetings without revealing placeholder code.

### 3. Sender Accounts & Secure OAuth (`/backend/src/modules/senders`)
- **Server-Side OAuth 2.0 Flow**: Users initiate Google or Microsoft OAuth flows from the UI; the callback receives authorization codes on the backend.
- **AES-256-GCM Encryption**: Tokens (access and refresh tokens) are encrypted before writing to PostgreSQL using `EMAIL_TOKEN_ENCRYPTION_KEY`.
- **Zero Token Leakage**: Tokens are stripped from API serialization and never sent to the client.
- **Individual Sender Signatures**: Each sender retains their own customizable signature reflecting their name, title, company, website, and phone.

### 4. Queue & Sender Rotation (`/backend/src/modules/queue`)
- **BullMQ Workers**: Decouples API requests from sending operations.
- **Application Safety Cap (20 sends/day)**: Senders maintain an atomic counter `sentToday`. When `sentToday >= dailySendLimit (20)`, the sender is disqualified until the backend resets counters at midnight in the configured timezone (`America/New_York`).
- **Adaptive Backoff**: When provider rate-limiting (HTTP 429) occurs, the sender is temporarily marked `RATE_LIMITED` and rotated out.

### 5. Campaigns & Lifecycle Management (`/backend/src/modules/campaigns`)
- Supports state transitions: `DRAFT` -> `READY` -> `RUNNING` -> `PAUSED` -> `COMPLETED` / `STOPPED`.
- Immediate pause safety: paused campaigns immediately halt job creation while in-flight jobs complete safely.
- Randomized delay intervals (`delayMin` to `delayMax` seconds) within specified campaign business hours.
