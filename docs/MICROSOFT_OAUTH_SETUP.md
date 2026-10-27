# RankRiseUSA Outreach Platform - Microsoft Entra ID & Outlook OAuth 2.0 Setup Guide

This guide provides step-by-step instructions for configuring Microsoft Entra ID (formerly Azure Active Directory) and Microsoft Graph API for multi-account email outreach.

---

## Architecture & Security Overview

- **No Passwords Stored**: Send accounts are connected via standard Microsoft OAuth 2.0 consent screens.
- **AES-256-GCM Encryption**: All OAuth refresh and access tokens are encrypted at rest using a 32-byte secret key (`ENCRYPTION_KEY`).
- **CSRF State Protection**: OAuth initialization generates a cryptographically signed HMAC-SHA256 `state` parameter that is verified on the callback.
- **Token Non-Leakage**: API serialization filters (`sanitizeSender()`) strictly exclude token fields from all JSON responses.
- **Automatic Token Refresh**: The backend automatically refreshes expired access tokens before queuing or dispatching messages via `@microsoft/microsoft-graph-client`.

---

## Prerequisites

- An active Microsoft Account or Microsoft 365 / Entra ID tenant with admin privileges.
- Access to the [Microsoft Entra admin center](https://entra.microsoft.com/) or [Azure Portal](https://portal.azure.com/).
- The RankRiseUSA backend running locally (`http://localhost:4000`) or on a secure production URL (`https://your-domain.com`).

---

## Step-by-Step Configuration

### Step 1: Register an Application in Microsoft Entra Admin Center

1. Navigate to the [Microsoft Entra admin center](https://entra.microsoft.com/) or the [Azure Portal App Registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade).
2. In the left navigation, select **Identity** > **Applications** > **App registrations**.
3. Click **+ New registration**.
4. Fill in the registration form:
   - **Name**: `RankRiseUSA Outreach Platform`
   - **Supported account types**:
     - Select **Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox, Outlook.com)**.
     - *Note*: This allows connecting both enterprise Microsoft 365 inboxes and individual personal Outlook/Hotmail inboxes.
   - **Redirect URI**:
     - Platform: Select **Web** from the dropdown.
     - URI:
       - For local development: `http://localhost:4000/api/senders/microsoft/callback`
       - For production: `https://api.your-domain.com/api/senders/microsoft/callback`
5. Click **Register**.

---

### Step 2: Note Application (Client) ID and Tenant ID

1. On the newly created app's **Overview** page:
   - Copy the **Application (client) ID**.
   - If connecting accounts across any tenant or personal accounts, set `MICROSOFT_TENANT_ID="common"` (or copy your specific **Directory (tenant) ID** if restricted to single-tenant).

---

### Step 3: Generate a Client Secret

1. In the left navigation menu, select **Certificates & secrets**.
2. Click on the **Client secrets** tab, then click **+ New client secret**.
3. Add a description: `RankRise Backend Secret`.
4. Choose an expiration period (e.g., 180 days, 24 months, or custom according to your organizational security policy).
5. Click **Add**.
6. **IMPORTANT**: Immediately copy the **Value** of the client secret (not the Secret ID). The value will be permanently masked once you navigate away from this screen.

---

### Step 4: Configure Microsoft Graph API Permissions

1. In the left navigation menu, select **API permissions**.
2. By default, `User.Read` is already added.
3. Click **+ Add a permission**.
4. Select **Microsoft Graph**, then choose **Delegated permissions**.
5. Search for and check the following permissions:
   - `Mail.Send` *(Send mail on behalf of the signed-in user)*
   - `User.Read` *(Sign in and read user profile)*
   - `offline_access` *(Maintain access to data you have given it access to via refresh tokens)*
6. Click **Add permissions**.
7. If operating within an enterprise tenant and you have admin rights, click **Grant admin consent for [Your Organization]** to avoid individual user consent prompts.

---

### Step 5: Configure Environment Variables

Open your `.env` file in the project root and populate the Microsoft OAuth section:

```env
# ==============================================================================
# MICROSOFT OAUTH & GRAPH API CONFIGURATION
# ==============================================================================
MICROSOFT_CLIENT_ID="your-azure-application-client-id"
MICROSOFT_CLIENT_SECRET="your-azure-client-secret-value"
MICROSOFT_TENANT_ID="common"
MICROSOFT_REDIRECT_URI="http://localhost:4000/api/senders/microsoft/callback"
```

---

## How Senders Connect (User Flow)

1. Open the RankRiseUSA web dashboard at `http://localhost:5173`.
2. Navigate to **Senders** (`/senders`).
3. Click the **[+ Connect Outlook]** button.
4. The frontend calls `GET /api/senders/microsoft/connect`, which generates a signed CSRF state and redirects the browser to Microsoft's OAuth login:
   - Scopes requested: `openid`, `profile`, `email`, `offline_access`, `https://graph.microsoft.com/Mail.Send`, `https://graph.microsoft.com/User.Read`.
5. The user logs into their Microsoft account and approves access.
6. Microsoft redirects to `http://localhost:4000/api/senders/microsoft/callback?code=...&state=...`.
7. The backend validates the HMAC state signature, requests token exchange from `https://login.microsoftonline.com/common/oauth2/v2.0/token`, retrieves user info via Microsoft Graph `GET /v1.0/me`, encrypts the refresh and access tokens with AES-256-GCM, upserts the `SenderAccount` record with provider `MICROSOFT_OUTLOOK`, and redirects to `/senders?success=microsoft_connected`.

---

## Testing & Verification

### 1. Verification via Automated Test Suite
Run the dedicated test suite:
```bash
npx vitest run tests/senders.test.ts tests/securityAndSuppression.test.ts
```

### 2. Manual Verification in DRY_RUN Mode
1. Ensure `EMAIL_SEND_MODE=DRY_RUN` in `.env`.
2. In the Senders UI, click **Send Test Email** on any connected or demo Microsoft sender.
3. Check the **Send Logs** (`/logs`): verify dispatch is simulated and logged without transmitting real mail.

### 3. Production Live Sending Test
1. Set `EMAIL_SEND_MODE=LIVE` in `.env`.
2. Connect a verified Microsoft 365 or Outlook sender account.
3. In Templates (`/templates`), click **Send Test Email** to a test inbox.
4. Verify email delivery via Microsoft Graph API.

---

## Common Troubleshooting

| Issue | Cause | Resolution |
|---|---|---|
| `AADSTS50011: The reply URL specified in the request does not match...` | Redirect URI mismatch between Azure app registration and `.env`. | Verify that `http://localhost:4000/api/senders/microsoft/callback` is registered under **Redirect URIs (Web)** in Azure. |
| `AADSTS7000215: Invalid client secret provided` | Secret value has expired or Secret ID was copied instead of Secret Value. | Generate a new Client Secret in Certificates & Secrets and copy the **Value** column. |
| `AADSTS50194: Application is not configured as multi-tenant` | App was registered as Single Tenant but a personal or external account was used to sign in. | In App Registration > Authentication > Supported account types, switch to multitenant + personal accounts, or use `MICROSOFT_TENANT_ID="common"`. |
| `ErrorAccessDenied / Mail.Send permission missing` | The `Mail.Send` permission was not granted or consent was rejected. | In API permissions, verify `Mail.Send` (Delegated) is added. If tenant requires admin consent, have an admin click "Grant admin consent". |
