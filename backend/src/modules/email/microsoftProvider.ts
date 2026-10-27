import { Client } from '@microsoft/microsoft-graph-client';
import { SenderProvider } from '@rankrise/shared';
import {
  EmailProvider,
  EmailProviderProfile,
  EmailSendOptions,
  EmailSendResult,
} from './provider.interface.js';
import { decryptToken } from '../../utils/encryption.js';
import { env } from '../../config/env.js';

export class MicrosoftProvider implements EmailProvider {
  readonly providerType = SenderProvider.MICROSOFT;
  private client: Client | null = null;
  private accessToken: string | null = null;
  private refreshTokenValue: string | null = null;

  constructor(
    private credentials: {
      clientId?: string;
      clientSecret?: string;
      tenantId?: string;
      encryptedAccessToken?: string | null;
      encryptedRefreshToken?: string | null;
    }
  ) {
    this.accessToken = decryptToken(credentials.encryptedAccessToken);
    this.refreshTokenValue = decryptToken(credentials.encryptedRefreshToken);

    if (this.accessToken) {
      this.client = Client.init({
        authProvider: (done) => {
          done(null, this.accessToken as string);
        },
      });
    }
  }

  async getProfile(): Promise<EmailProviderProfile> {
    if (!this.client) {
      throw new Error('Microsoft Graph client is not authenticated');
    }

    const me = await this.client.api('/me').select('mail,userPrincipalName,displayName').get();
    const email = (me.mail || me.userPrincipalName || '').toLowerCase().trim();

    return {
      email,
      displayName: me.displayName || email,
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const profile = await this.getProfile();
      return Boolean(profile.email);
    } catch {
      return false;
    }
  }

  async refreshToken(): Promise<{ accessToken: string; expiresAt?: Date }> {
    if (!this.refreshTokenValue) {
      throw new Error('No refresh token available for Microsoft account');
    }

    const tenantId = this.credentials.tenantId || env.MICROSOFT_TENANT_ID || 'common';
    const clientId = this.credentials.clientId || env.MICROSOFT_CLIENT_ID;
    const clientSecret = this.credentials.clientSecret || env.MICROSOFT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Microsoft OAuth client credentials are not configured in environment');
    }

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: this.refreshTokenValue,
      scope: 'https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to refresh Microsoft token: ${errText}`);
    }

    const data: any = await response.json();
    this.accessToken = data.access_token;
    const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined;

    this.client = Client.init({
      authProvider: (done) => {
        done(null, this.accessToken as string);
      },
    });

    return {
      accessToken: data.access_token,
      expiresAt,
    };
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.accessToken = null;
    this.refreshTokenValue = null;
  }

  async sendEmail(options: EmailSendOptions): Promise<EmailSendResult> {
    // DRY_RUN Safety Guard
    if (env.EMAIL_SEND_MODE === 'DRY_RUN') {
      return {
        success: true,
        providerMessageId: `dryrun-microsoft-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      };
    }

    if (!this.client) {
      return {
        success: false,
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'Microsoft Graph client is not authenticated',
          isAuthError: true,
        },
      };
    }

    try {
      const sendMailPayload = {
        message: {
          subject: options.subject,
          body: {
            contentType: 'HTML',
            content: options.bodyHtml,
          },
          toRecipients: [
            {
              emailAddress: {
                address: options.recipient,
              },
            },
          ],
        },
        saveToSentItems: 'true',
      };

      await this.client.api('/me/sendMail').post(sendMailPayload);

      return {
        success: true,
        providerMessageId: `ms-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      };
    } catch (err: any) {
      const statusCode = err.statusCode || err.code || 500;
      const message = err.message || 'Unknown Microsoft Graph error';

      const isRateLimit = statusCode === 429 || message.toLowerCase().includes('throttled');
      const isQuotaExceeded = message.toLowerCase().includes('quota');
      const isAuthError = statusCode === 401 || message.toLowerCase().includes('token');

      return {
        success: false,
        error: {
          code: String(statusCode),
          message,
          isRateLimit,
          isQuotaExceeded,
          isAuthError,
        },
      };
    }
  }
}
