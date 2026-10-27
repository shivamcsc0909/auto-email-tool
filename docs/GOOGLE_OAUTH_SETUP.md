# RankRiseUSA Outreach Platform - Google OAuth 2.0 & Gmail API Setup Guide

This guide provides step-by-step instructions for configuring Google OAuth 2.0 and the Gmail API for multi-account email outreach.

---

## Architecture & Security Overview

- **No Passwords Stored**: Send accounts are connected via standard Google OAuth 2.0 consent screens.
- **AES-256-GCM Encryption**: All OAuth refresh and access tokens are encrypted at rest using a 32-byte secret key (`ENCRYPTION_KEY`).
- **CSRF State Protection**: OAuth initialization generates a cryptographically signed HMAC-SHA256 `state` parameter that is verified on the callback.
- **Token Non-Leakage**: API serialization filters (`sanitizeSender()`) strictly exclude token fields from all JSON responses.
- **Automatic Token Refresh**: The backend automatically refreshes expired access tokens before queuing or dispatching messages.

---

## Prerequisites

- A Google Account or Google Workspace Administrator Account.
- Access to the [Google Cloud Console](https://console.cloud.google.com/).
- The RankRiseUSA backend running locally (`http://localhost:4000`) or on a secure production URL (`https://your-domain.com`).

---

## Step-by-Step Configuration

### Step 1: Create a Project in Google Cloud Console

1. Navigate to [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown at the top navigation bar and select **New Project**.
3. Enter a project name, for example: `RankRiseUSA Outreach Automation`.
4. Select your Organization/Location if applicable, and click **Create**.
5. Once created, ensure the new project is selected in the project dropdown.

---

### Step 2: Enable the Gmail API

1. In the left navigation menu, go to **APIs & Services** > **Library** (or search for "Gmail API" in the top search bar).
2. Locate and click on **Gmail API**.
3. Click the blue **Enable** button.

---

### Step 3: Configure the OAuth Consent Screen

1. In the left navigation menu, select **APIs & Services** > **OAuth consent screen**.
2. Select **User Type**:
   - **Internal**: Choose this if you are using Google Workspace and only users within your organization will connect sender accounts. (Verification is not required).
   - **External**: Choose this if you will connect Gmail accounts from outside your Google Workspace organization (@gmail.com or other domains).
3. Click **Create**.
4. Fill in the **App Information**:
   - **App name**: `RankRiseUSA Outreach Platform`
   - **User support email**: Select your email address.
   - **App logo**: (Optional).
   - **Developer contact information**: Enter your email address.
5. Click **Save and Continue**.
6. On the **Scopes** page:
   - Click **Add or Remove Scopes**.
   - Manually filter or add the following three scopes:
     1. `https://www.googleapis.com/auth/gmail.send` *(Send email on your behalf)*
     2. `https://www.googleapis.com/auth/userinfo.email` *(View your email address)*
     3. `https://www.googleapis.com/auth/userinfo.profile` *(View your basic profile info)*
   - Click **Update** and then **Save and Continue**.
7. If your App is set to **External** and remains in **Testing** status:
   - Under **Test users**, click **+ Add Users**.
   - Add every Gmail address you plan to connect as a sender during testing/development.
   - Click **Save and Continue**.

---

### Step 4: Create OAuth 2.0 Client Credentials

1. In the left navigation menu, go to **APIs & Services** > **Credentials**.
2. Click **+ Create Credentials** at the top and select **OAuth client ID**.
3. In the **Application type** dropdown, select **Web application**.
4. Set **Name** to: `RankRiseUSA Backend Client`.
5. Under **Authorized JavaScript origins**:
   - Local: `http://localhost:5173`
   - Production: `https://your-domain.com`
6. Under **Authorized redirect URIs**, click **+ Add URI** and enter:
   - Local Development:
     ```
     http://localhost:4000/api/senders/gmail/callback
     ```
   - Production:
     ```
     https://api.your-domain.com/api/senders/gmail/callback
     ```
7. Click **Create**.
8. A modal will display your **Client ID** and **Client Secret**.
9. Copy both values.

---

### Step 5: Configure Environment Variables

Open your `.env` file in the project root and populate the Google OAuth section:

```env
# ==============================================================================
# GOOGLE OAUTH & GMAIL API CONFIGURATION
# ==============================================================================
GOOGLE_CLIENT_ID="your-client-id-here.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-client-secret-here"
GOOGLE_REDIRECT_URI="http://localhost:4000/api/senders/gmail/callback"
```

---

## How Senders Connect (User Flow)

1. Open the RankRiseUSA web dashboard at `http://localhost:5173`.
2. Navigate to **Senders** (`/senders`).
3. Click the **[+ Connect Gmail]** button.
4. The frontend calls `GET /api/senders/gmail/connect`, which generates a signed CSRF state and redirects the browser to Google's OAuth consent screen:
   - Scopes requested: `gmail.send`, `userinfo.email`, `userinfo.profile`.
   - Access Type: `offline` (returns a refresh token).
   - Prompt: `consent` (ensures refresh token is generated).
5. The user logs into their Google account and clicks **Allow**.
6. Google redirects to `http://localhost:4000/api/senders/gmail/callback?code=...&state=...`.
7. The backend validates the HMAC state signature, exchanges the authorization code for tokens, retrieves the account profile (email, name, picture), encrypts the tokens with AES-256-GCM, upserts the `SenderAccount` record, and redirects the user back to `/senders?success=gmail_connected`.

---

## Testing & Verification

### 1. Verification via Automated Test Suite
Run the dedicated test suite:
```bash
npx vitest run tests/senders.test.ts tests/securityAndSuppression.test.ts
```

### 2. Manual Verification in DRY_RUN Mode
1. Ensure `EMAIL_SEND_MODE=DRY_RUN` in `.env`.
2. In the Senders UI, click **Send Test Email** on any connected or demo sender.
3. Check the **Send Logs** (`/logs`): the log status will show `SUCCESS` or `DRY_RUN_LOGGED` with 0 actual emails leaving the server.

### 3. Production Live Sending Test
1. Set `EMAIL_SEND_MODE=LIVE` in `.env`.
2. Connect a verified test Gmail account.
3. In Templates (`/templates`), click **Send Test Email** and enter a recipient inbox you control.
4. Verify email arrives in the recipient inbox with proper HTML rendering and sender signature.

---

## Common Troubleshooting

| Issue | Cause | Resolution |
|---|---|---|
| `redirect_uri_mismatch` | The redirect URI in Google Cloud does not exactly match `.env`. | Ensure `http://localhost:4000/api/senders/gmail/callback` is listed under **Authorized redirect URIs** in Google Console. |
| `Access blocked: App has not completed verification` | App is set to External and user is not in Test Users list. | In Google Cloud Console > OAuth consent screen > Test users, add the email address being connected. |
| `invalid_grant` | The authorization code expired or clock drift occurred. | Retry the connection flow; ensure server clock is synchronized via NTP. |
| `No refresh token returned` | User already authorized the app previously without prompt=consent. | The system passes `prompt: 'consent'` automatically. If re-connecting, revoke access in [Google Account Permissions](https://myaccount.google.com/permissions) and connect again. |
