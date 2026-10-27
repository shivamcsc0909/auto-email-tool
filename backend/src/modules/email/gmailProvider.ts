import { google } from 'googleapis';
import { SenderProvider } from '@rankrise/shared';
import {
  EmailProvider,
  EmailProviderProfile,
  EmailSendOptions,
  EmailSendResult,
} from './provider.interface.js';
import { decryptToken, encryptToken } from '../../utils/encryption.js';
import { env } from '../../config/env.js';

export class GmailProvider implements EmailProvider {
  readonly providerType = SenderProvider.GMAIL;
  private oauth2Client: any;

  constructor(
    private credentials: {
      clientId?: string;
      clientSecret?: string;
      redirectUri?: string;
      encryptedAccessToken?: string | null;
      encryptedRefreshToken?: string | null;
    }
  ) {
    const clientId = credentials.clientId || env.GOOGLE_CLIENT_ID;
    const clientSecret = credentials.clientSecret || env.GOOGLE_CLIENT_SECRET;
    const redirectUri = credentials.redirectUri || env.GOOGLE_REDIRECT_URI;

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    const accessToken = decryptToken(credentials.encryptedAccessToken);
    const refreshToken = decryptToken(credentials.encryptedRefreshToken);

    this.oauth2Client.setCredentials({
      access_token: accessToken || undefined,
      refresh_token: refreshToken || undefined,
    });
  }

  async getProfile(): Promise<EmailProviderProfile> {
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    const res = await gmail.users.getProfile({ userId: 'me' });
    return {
      email: res.data.emailAddress || '',
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const profile = await this.getProfile();
      return Boolean(profile.email);
    } catch (err) {
      return false;
    }
  }

  async refreshToken(): Promise<{ accessToken: string; expiresAt?: Date }> {
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    const expiresAt = credentials.expiry_date ? new Date(credentials.expiry_date) : undefined;
    return {
      accessToken: credentials.access_token || '',
      expiresAt,
    };
  }

  async disconnect(): Promise<void> {
    try {
      const token = this.oauth2Client.credentials.access_token;
      if (token) {
        await this.oauth2Client.revokeToken(token);
      }
    } catch {
      // Best-effort revocation
    }
  }

  async sendEmail(options: EmailSendOptions): Promise<EmailSendResult> {
    // DRY_RUN Safety Guard
    if (env.EMAIL_SEND_MODE === 'DRY_RUN') {
      return {
        success: true,
        providerMessageId: `dryrun-gmail-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      };
    }

    try {
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      const rawMessage = this.buildMimeMessage(options);

      const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: rawMessage,
        },
      });

      return {
        success: true,
        providerMessageId: res.data.id || undefined,
      };
    } catch (err: any) {
      const statusCode = err.status || err.code || 500;
      const message = err.message || 'Unknown Gmail API error';

      const isRateLimit = statusCode === 429 || message.toLowerCase().includes('rate');
      const isQuotaExceeded = message.toLowerCase().includes('quota') || message.toLowerCase().includes('userRateLimitExceeded');
      const isAuthError = statusCode === 401 || message.toLowerCase().includes('invalid_grant');

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

  /**
   * Constructs an RFC 2822 complaint multipart MIME email and encodes it in URL-safe base64.
   */
  private buildMimeMessage(options: EmailSendOptions): string {
    const boundary = `__boundary_${Date.now()}__`;
    const fromHeader = `"${options.senderName}" <${options.senderEmail}>`;

    const mimeParts = [
      `From: ${fromHeader}`,
      `To: ${options.recipient}`,
      `Subject: =?UTF-8?B?${Buffer.from(options.subject).toString('base64')}?=`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      options.bodyText,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      options.bodyHtml,
      '',
      `--${boundary}--`,
    ];

    const messageString = mimeParts.join('\r\n');
    return Buffer.from(messageString)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}
