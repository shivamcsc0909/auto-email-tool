# RankRiseUSA Outreach Platform - REST API Reference

Base URL: `http://localhost:4000/api`

---

## 1. Authentication (`/api/auth`)

### `POST /api/auth/login`
Authenticates admin user and establishes an HttpOnly session cookie.
- **Request Body**:
  ```json
  {
    "email": "admin@rankriseusa.com",
    "password": "RankRiseAdmin2025!"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "user": {
      "id": "cuid...",
      "email": "admin@rankriseusa.com",
      "name": "RankRise Administrator",
      "role": "ADMIN"
    }
  }
  ```

### `POST /api/auth/logout`
Terminates session and clears cookies.
- **Response**: `200 OK`

### `GET /api/auth/me`
Retrieves currently authenticated user.
- **Response**: `200 OK`

---

## 2. Leads & Ingestion (`/api/leads`)

### `GET /api/leads`
List leads with filtering, pagination, and sorting.
- **Query Params**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 50)
  - `status`: `NEW`, `VALIDATED`, `READY`, `QUEUED`, `SENT`, `FAILED`, `DO_NOT_CONTACT`
  - `search`: Searches across email, domain, name, company
  - `country`: Filter by country
  - `campaignId`: Filter by assigned campaign

### `POST /api/leads/upload`
Uploads an Excel (.xlsx, .xls) or CSV file for preview & column detection.
- **Form Data**: `file` (multipart/form-data)
- **Response**: `200 OK` with detected headers, proposed field mappings, preview rows, and stats.

### `POST /api/leads/import`
Confirms the import with user-approved column mapping.
- **Request Body**:
  ```json
  {
    "leadSourceId": "src_123",
    "columnMapping": {
      "email": "email id",
      "website": "website",
      "country": "country",
      "phone": "contact number"
    },
    "serviceInterest": "APP_DEVELOPMENT",
    "skipDuplicates": true
  }
  ```

### `POST /api/leads/suppress`
Bulk marks leads as suppressed / DO_NOT_CONTACT.
- **Request Body**: `{ "leadIds": ["lead_1", "lead_2"] }`

### `DELETE /api/leads/:id`
Deletes an individual lead.

---

## 3. Templates (`/api/templates`)

### `GET /api/templates`
Retrieves all templates.
- **Query Params**: `category`, `active`

### `POST /api/templates`
Creates a new template.

### `PUT /api/templates/:id`
Updates an existing template.

### `DELETE /api/templates/:id`
Archives or deletes a template.

### `POST /api/templates/:id/duplicate`
Duplicates an existing template.

### `POST /api/templates/:id/preview`
Renders a template preview with simulated lead and sender variables.

---

## 4. Sender Accounts (`/api/senders`)

### `GET /api/senders`
List connected sender accounts, their 20-send daily usage, remaining capacity, and status.

### `GET /api/senders/gmail/connect`
Initiates server-side Google OAuth 2.0 authorization.
- **Redirects** to Google Consent Screen (`gmail.send`, offline access).

### `GET /api/senders/gmail/callback`
OAuth redirect handler; exchanges code for tokens, encrypts refresh token with AES-256-GCM, fetches profile, and creates/updates SenderAccount.

### `GET /api/senders/microsoft/connect`
Initiates Microsoft Azure OAuth 2.0 authorization for Outlook/Office 365 (`Mail.Send`).

### `GET /api/senders/microsoft/callback`
Microsoft OAuth redirect handler; securely stores encrypted credentials.

### `PUT /api/senders/:id`
Updates sender profile details (name, title, company, phone, website, signature, logo).

### `POST /api/senders/:id/test`
Sends a test email to an admin-specified address (with DRY_RUN check).

### `POST /api/senders/:id/disconnect`
Revokes tokens, marks account `DISCONNECTED`, and scrubs tokens.

---

## 5. Campaigns (`/api/campaigns`)

### `GET /api/campaigns`
List all campaigns and their delivery stats.

### `POST /api/campaigns`
Creates a new campaign.
- **Request Body**:
  ```json
  {
    "name": "Q3 Mobile App Outreach",
    "serviceCategory": "APP_DEVELOPMENT",
    "templateIds": ["template-1", "template-2"],
    "senderIds": ["sender-1", "sender-2"],
    "leadIds": ["lead-1", "lead-2"],
    "perSenderLimit": 20,
    "delayMin": 90,
    "delayMax": 300,
    "scheduleStart": "09:00",
    "scheduleEnd": "17:00",
    "timezone": "America/New_York"
  }
  ```

### `POST /api/campaigns/:id/start`
Validates limits, checks suppression, generates queued jobs, and switches campaign to `RUNNING`.

### `POST /api/campaigns/:id/pause`
Pauses campaign safely without disrupting currently executing email tasks.

### `POST /api/campaigns/:id/resume`
Resumes campaign from the next uncontacted lead.

### `POST /api/campaigns/:id/stop`
Cancels pending campaign jobs.

---

## 6. Suppression List (`/api/suppression`)

### `GET /api/suppression`
List suppressed emails and domains with pagination and reason filter.

### `POST /api/suppression`
Adds an email or domain to the suppression list.

### `POST /api/suppression/upload-csv`
Bulk imports a CSV of suppressed addresses.

### `DELETE /api/suppression/:id`
Removes an entry from the suppression list.

---

## 7. Email Logs & Analytics (`/api/email-logs`, `/api/analytics`)

### `GET /api/email-logs`
Returns send logs with status (`SENT`, `FAILED`, `BOUNCED`), attempt numbers, provider errors, and timestamps.

### `GET /api/analytics`
Returns aggregate platform metrics:
- Overall lead funnel (Imported, Valid, Queued, Sent, Failed, Suppressed)
- Sender performance (Sent today vs 20 limit, failure rates)
- Template performance metrics
- Campaign completion rates
