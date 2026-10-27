import { SenderProvider } from '@rankrise/shared';

export interface EmailSendOptions {
  recipient: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  senderName: string;
  senderEmail: string;
}

export interface EmailSendResult {
  success: boolean;
  providerMessageId?: string;
  error?: {
    code: string;
    message: string;
    isRateLimit?: boolean;
    isAuthError?: boolean;
    isQuotaExceeded?: boolean;
  };
}

export interface EmailProviderProfile {
  email: string;
  displayName?: string;
}

export interface EmailProvider {
  readonly providerType: SenderProvider;
  getProfile(): Promise<EmailProviderProfile>;
  sendEmail(options: EmailSendOptions): Promise<EmailSendResult>;
  testConnection(): Promise<boolean>;
  refreshToken(): Promise<{ accessToken: string; expiresAt?: Date }>;
  disconnect(): Promise<void>;
}
