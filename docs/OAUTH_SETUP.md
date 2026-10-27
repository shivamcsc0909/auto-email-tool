# RankRiseUSA Outreach Platform - OAuth 2.0 Provider Setup Guide

This guide walks administrators through setting up OAuth 2.0 applications for **Google (Gmail API)** and **Microsoft (Outlook / Microsoft Graph API)**.

> [!NOTE]
> End users never manually copy/paste access tokens or passwords. The system administrator configures the application credentials once in the `.env` file. Users simply click **[+ Connect Gmail]** or **[+ Connect Outlook]** in the admin dashboard.

---

## 1. Google Cloud Platform (Gmail API Setup)

### Step 1: Create a Google Cloud Project
1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown at the top and select **New Project**.
3. Name your project (e.g., `RankRise-Outreach-Automation`) and click **Create**.

### Step 2: Enable the Gmail API
1. In the sidebar, navigate to **APIs & Services > Library**.
2. Search for **Gmail API**.
3. Click on **Gmail API** and click **Enable**.

### Step 3: Configure the OAuth Consent Screen
1. Go to **APIs & Services > OAuth consent screen**.
2. Select **External** (or **Internal** if using Google Workspace for your organization).
3. Fill in the required application details:
   - **App name**: `RankRiseUSA Outreach Platform`
   - **User support email**: Admin email
   - **Developer contact information**: Admin email
4. Click **Save and Continue**.
5. Under **Scopes**, click **Add or Remove Scopes** and add:
   - `https://www.googleapis.com/auth/gmail.send` (Send messages on your behalf)
   - `https://www.googleapis.com/auth/userinfo.email` (View your email address)
   - `https://www.googleapis.com/auth/userinfo.profile` (View your basic profile)
6. Complete the wizard and add test users if in Testing status.

### Step 4: Create OAuth 2.0 Credentials
1. Go to **APIs & Services > Credentials**.
2. Click **+ Create Credentials** > **OAuth client ID**.
3. Set **Application type** to **Web application**.
4. Set **Name** to `RankRise Backend Client`.
5. Under **Authorized redirect URIs**, click **+ Add URI** and enter:
   - For local development: `http://localhost:4000/api/senders/gmail/callback`
   - For production: `https://your-domain.com/api/senders/gmail/callback`
6. Click **Create**.
7. Copy your **Client ID** and **Client Secret**.

### Step 5: Save in Environment
Add to your `.env` file:
```bash
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:4000/api/senders/gmail/callback"
```

---

## 2. Microsoft Entra / Azure (Outlook / Microsoft Graph Setup)

### Step 1: Register Application in Microsoft Entra Admin Center
1. Navigate to the [Microsoft Entra admin center](https://entra.microsoft.com/) or [Azure Portal](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade).
2. Go to **Applications > App registrations**.
3. Click **+ New registration**.
4. Fill in:
   - **Name**: `RankRiseUSA Outreach Platform`
   - **Supported account types**: Select **Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox, Outlook.com)** if you will connect both corporate and personal Outlook accounts.
   - **Redirect URI**: Select **Web** and enter:
     `http://localhost:4000/api/senders/microsoft/callback`
5. Click **Register**.

### Step 2: Note Application IDs
1. On the app Overview page, copy:
   - **Application (client) ID**
   - **Directory (tenant) ID** (Use `common` for multi-tenant / personal accounts).

### Step 3: Create a Client Secret
1. In the left menu, navigate to **Certificates & secrets**.
2. Under **Client secrets**, click **+ New client secret**.
3. Add description (e.g., `RankRise-Secret`) and choose an expiration period.
4. Click **Add**.
5. **Immediately copy the Secret Value** (it will be masked after leaving the page).

### Step 4: Configure API Permissions
1. In the left menu, navigate to **API permissions**.
2. Click **+ Add a permission** > **Microsoft Graph**.
3. Select **Delegated permissions**.
4. Search and select:
   - `Mail.Send` (Send mail as a user)
   - `User.Read` (Sign in and read user profile)
   - `offline_access` (Maintain access to data you have given it access to via refresh tokens)
5. Click **Add permissions**.

### Step 5: Save in Environment
Add to your `.env` file:
```bash
MICROSOFT_CLIENT_ID="your-application-client-id"
MICROSOFT_CLIENT_SECRET="your-azure-client-secret-value"
MICROSOFT_TENANT_ID="common"
MICROSOFT_REDIRECT_URI="http://localhost:4000/api/senders/microsoft/callback"
```

---

## 3. Token Encryption Key Generation

Tokens stored in the database are encrypted at rest using AES-256-GCM.
Generate a cryptographically secure 32-byte (64 hexadecimal characters) key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Place the generated string in your `.env`:
```bash
EMAIL_TOKEN_ENCRYPTION_KEY="<64-hex-character-string>"
```

---

## 4. Verification Flow

Once credentials are set:
1. Start the application (`npm run dev`).
2. Go to **Email Accounts** (`http://localhost:5173/senders`).
3. Click **[+ Connect Gmail]** or **[+ Connect Outlook]**.
4. Log into the respective account and authorize sending access.
5. The account will appear in the dashboard cards as **Connected** with `0 / 20 today`.
