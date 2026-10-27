import crypto from 'crypto';
import { google } from 'googleapis';
import { prisma } from '../../prisma.js';
import { env } from '../../config/env.js';
import { encryptToken } from '../../utils/encryption.js';
import {
  SenderAccountDto,
  SenderProvider,
  SenderStatus,
  APPLICATION_DAILY_SENDER_LIMIT,
} from '@rankrise/shared';
import { resolveSenderSignatures } from './signatureEngine.js';
import { GmailProvider } from '../email/gmailProvider.js';
import { MicrosoftProvider } from '../email/microsoftProvider.js';

export async function seedDemoSendersIfNoneExist(): Promise<void> {
  try {
    const demoSenders = [
      {
        id: 'demo-sender-thomas',
        provider: SenderProvider.GMAIL,
        email: 'thomas@rankriseusa.com',
        displayName: 'Thomas (RankRise)',
        senderName: 'Thomas',
        title: 'Business Development',
        company: 'RANKRISEUSA',
        website: 'rankriseusa.com',
        dailySendLimit: APPLICATION_DAILY_SENDER_LIMIT,
        status: SenderStatus.CONNECTED,
        lastErrorMessage: 'DEMO ACCOUNT - For simulated sending and dry-run preview.',
      },
      {
        id: 'demo-sender-sam',
        provider: SenderProvider.GMAIL,
        email: 'sam@rankriseusa.com',
        displayName: 'Sam (RankRise)',
        senderName: 'Sam',
        title: 'Business Development',
        company: 'RANKRISEUSA',
        website: 'rankriseusa.com',
        dailySendLimit: APPLICATION_DAILY_SENDER_LIMIT,
        status: SenderStatus.CONNECTED,
        lastErrorMessage: 'DEMO ACCOUNT - For simulated sending and dry-run preview.',
      },
    ];

    for (const ds of demoSenders) {
      const sigs = resolveSenderSignatures(ds);
      await prisma.senderAccount.upsert({
        where: { email: ds.email },
        create: {
          ...ds,
          signatureHtml: sigs.signatureHtml,
          signatureText: sigs.signatureText,
        },
        update: {},
      });
    }
    console.log('✅ Demo sender accounts verified/seeded');
  } catch (err) {
    console.warn('Notice: Could not check/seed demo senders:', err);
  }
}

export async function getSenders(): Promise<SenderAccountDto[]> {
  const senders = await prisma.senderAccount.findMany({
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  });

  return senders.map(s => ({
    id: s.id,
    provider: s.provider as SenderProvider,
    email: s.email,
    displayName: s.displayName,
    senderName: s.senderName,
    title: s.title,
    company: s.company,
    phone: s.phone,
    website: s.website,
    signatureHtml: s.signatureHtml,
    signatureText: s.signatureText,
    signatureLogoUrl: s.signatureLogoUrl,
    status: s.status as SenderStatus,
    dailySendLimit: s.dailySendLimit,
    sentToday: s.sentToday,
    remainingToday: Math.max(0, s.dailySendLimit - s.sentToday),
    lastSentAt: s.lastSentAt,
    enabled: s.enabled,
    priority: s.priority,
    lastErrorMessage: s.lastErrorMessage,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
}

export async function getSenderById(id: string): Promise<SenderAccountDto | null> {
  const s = await prisma.senderAccount.findUnique({ where: { id } });
  if (!s) return null;

  return {
    id: s.id,
    provider: s.provider as SenderProvider,
    email: s.email,
    displayName: s.displayName,
    senderName: s.senderName,
    title: s.title,
    company: s.company,
    phone: s.phone,
    website: s.website,
    signatureHtml: s.signatureHtml,
    signatureText: s.signatureText,
    signatureLogoUrl: s.signatureLogoUrl,
    status: s.status as SenderStatus,
    dailySendLimit: s.dailySendLimit,
    sentToday: s.sentToday,
    remainingToday: Math.max(0, s.dailySendLimit - s.sentToday),
    lastSentAt: s.lastSentAt,
    enabled: s.enabled,
    priority: s.priority,
    lastErrorMessage: s.lastErrorMessage,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export async function updateSender(
  id: string,
  data: Partial<{
    displayName: string;
    senderName: string;
    title: string;
    company: string;
    phone: string;
    website: string;
    signatureHtml: string;
    signatureText: string;
    signatureLogoUrl: string;
    dailySendLimit: number;
    priority: number;
    enabled: boolean;
  }>
): Promise<SenderAccountDto> {
  // Application safety cap enforcement
  if (data.dailySendLimit !== undefined) {
    data.dailySendLimit = Math.min(APPLICATION_DAILY_SENDER_LIMIT, Math.max(1, data.dailySendLimit));
  }

  const updated = await prisma.senderAccount.update({
    where: { id },
    data,
  });

  return {
    ...updated,
    provider: updated.provider as SenderProvider,
    status: updated.status as SenderStatus,
    remainingToday: Math.max(0, updated.dailySendLimit - updated.sentToday),
  };
}

export async function deleteSender(id: string): Promise<void> {
  await prisma.senderAccount.delete({ where: { id } });
}

/**
 * Generates an HMAC-signed state token to prevent OAuth CSRF attacks.
 */
export function generateOAuthState(provider: 'google' | 'microsoft', userId?: string): string {
  const timestamp = Date.now();
  const payload = `${provider}:${userId || 'admin'}:${timestamp}`;
  const signature = crypto.createHmac('sha256', env.SESSION_SECRET).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ payload, signature })).toString('base64url');
}

/**
 * Verifies an incoming OAuth state parameter against our HMAC signature and expiry.
 */
export function verifyOAuthState(stateString?: string | null, expectedProvider?: 'google' | 'microsoft'): boolean {
  if (!stateString) return false;
  try {
    const raw = Buffer.from(stateString, 'base64url').toString('utf8');
    const { payload, signature } = JSON.parse(raw);
    const expectedSig = crypto.createHmac('sha256', env.SESSION_SECRET).update(payload).digest('hex');
    if (signature !== expectedSig) return false;

    const [provider, , timestampStr] = payload.split(':');
    if (expectedProvider && provider !== expectedProvider) return false;

    const age = Date.now() - Number(timestampStr);
    return age >= 0 && age < 30 * 60 * 1000; // 30 minutes validity
  } catch {
    return false;
  }
}

export function getGoogleAuthUrl(userId?: string): string {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.');
  }

  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );

  const state = generateOAuthState('google', userId);

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    state,
  });
}

export async function handleGoogleCallback(code: string, state?: string): Promise<SenderAccountDto> {
  if (state && !verifyOAuthState(state, 'google')) {
    throw new Error('Invalid or expired OAuth state parameter (CSRF protection)');
  }

  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();

  const email = (userInfo.data.email || '').toLowerCase().trim();
  if (!email) {
    throw new Error('Failed to retrieve email address from authorized Google account');
  }

  const displayName = userInfo.data.name || email.split('@')[0];
  const senderName = userInfo.data.given_name || displayName;

  const encryptedAccessToken = encryptToken(tokens.access_token);
  const encryptedRefreshToken = encryptToken(tokens.refresh_token);
  const tokenExpiry = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

  const sigs = resolveSenderSignatures({
    senderName,
    email,
    title: 'Business Development',
    company: 'RANKRISEUSA',
    website: 'rankriseusa.com',
  });

  const account = await prisma.senderAccount.upsert({
    where: { email },
    create: {
      provider: SenderProvider.GMAIL,
      email,
      displayName,
      senderName,
      title: 'Business Development',
      company: 'RANKRISEUSA',
      website: 'rankriseusa.com',
      signatureHtml: sigs.signatureHtml,
      signatureText: sigs.signatureText,
      oauthProvider: 'google',
      encryptedAccessToken,
      encryptedRefreshToken,
      tokenExpiry,
      status: SenderStatus.CONNECTED,
      dailySendLimit: APPLICATION_DAILY_SENDER_LIMIT,
      sentToday: 0,
      enabled: true,
      lastErrorMessage: null,
    },
    update: {
      encryptedAccessToken,
      encryptedRefreshToken: encryptedRefreshToken || undefined, // Keep existing refresh token if not in response
      tokenExpiry,
      status: SenderStatus.CONNECTED,
      lastErrorMessage: null,
    },
  });

  return {
    ...account,
    provider: account.provider as SenderProvider,
    status: account.status as SenderStatus,
    remainingToday: Math.max(0, account.dailySendLimit - account.sentToday),
  };
}

export async function disconnectSender(id: string): Promise<void> {
  const sender = await prisma.senderAccount.findUniqueOrThrow({ where: { id } });

  if (sender.provider === SenderProvider.GMAIL && sender.encryptedAccessToken) {
    const provider = new GmailProvider({
      encryptedAccessToken: sender.encryptedAccessToken,
      encryptedRefreshToken: sender.encryptedRefreshToken,
    });
    await provider.disconnect();
  } else if (sender.provider === SenderProvider.MICROSOFT && sender.encryptedAccessToken) {
    const provider = new MicrosoftProvider({
      encryptedAccessToken: sender.encryptedAccessToken,
      encryptedRefreshToken: sender.encryptedRefreshToken,
    });
    await provider.disconnect();
  }

  await prisma.senderAccount.update({
    where: { id },
    data: {
      encryptedAccessToken: null,
      encryptedRefreshToken: null,
      status: SenderStatus.DISCONNECTED,
      lastErrorMessage: 'Account disconnected by administrator',
    },
  });
}

export function getMicrosoftAuthUrl(userId?: string): string {
  if (!env.MICROSOFT_CLIENT_ID) {
    throw new Error('Microsoft OAuth is not configured. Please set MICROSOFT_CLIENT_ID in .env.');
  }

  const tenant = env.MICROSOFT_TENANT_ID || 'common';
  const redirectUri = encodeURIComponent(env.MICROSOFT_REDIRECT_URI);
  const scope = encodeURIComponent('https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access');
  const state = encodeURIComponent(generateOAuthState('microsoft', userId));

  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?client_id=${env.MICROSOFT_CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}&response_mode=query&scope=${scope}&prompt=consent&state=${state}`;
}

export async function handleMicrosoftCallback(code: string, state?: string): Promise<SenderAccountDto> {
  if (state && !verifyOAuthState(state, 'microsoft')) {
    throw new Error('Invalid or expired OAuth state parameter (CSRF protection)');
  }

  const tenant = env.MICROSOFT_TENANT_ID || 'common';
  const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: env.MICROSOFT_CLIENT_ID || '',
    client_secret: env.MICROSOFT_CLIENT_SECRET || '',
    code,
    grant_type: 'authorization_code',
    redirect_uri: env.MICROSOFT_REDIRECT_URI,
    scope: 'https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access',
  });

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Microsoft OAuth token exchange failed: ${err}`);
  }

  const tokenData: any = await tokenRes.json();
  const encryptedAccessToken = encryptToken(tokenData.access_token);
  const encryptedRefreshToken = encryptToken(tokenData.refresh_token);
  const tokenExpiry = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null;

  // Retrieve user profile using Microsoft Graph
  const msProvider = new MicrosoftProvider({
    encryptedAccessToken,
    encryptedRefreshToken,
  });

  const profile = await msProvider.getProfile();
  const email = profile.email.toLowerCase().trim();
  const displayName = profile.displayName || email.split('@')[0];
  const senderName = displayName.split(' ')[0] || displayName;

  const sigs = resolveSenderSignatures({
    senderName,
    email,
    title: 'Business Development',
    company: 'RANKRISEUSA',
    website: 'rankriseusa.com',
  });

  const account = await prisma.senderAccount.upsert({
    where: { email },
    create: {
      provider: SenderProvider.MICROSOFT,
      email,
      displayName,
      senderName,
      title: 'Business Development',
      company: 'RANKRISEUSA',
      website: 'rankriseusa.com',
      signatureHtml: sigs.signatureHtml,
      signatureText: sigs.signatureText,
      oauthProvider: 'microsoft',
      encryptedAccessToken,
      encryptedRefreshToken,
      tokenExpiry,
      status: SenderStatus.CONNECTED,
      dailySendLimit: APPLICATION_DAILY_SENDER_LIMIT,
      sentToday: 0,
      enabled: true,
      lastErrorMessage: null,
    },
    update: {
      encryptedAccessToken,
      encryptedRefreshToken: encryptedRefreshToken || undefined,
      tokenExpiry,
      status: SenderStatus.CONNECTED,
      lastErrorMessage: null,
    },
  });

  return {
    ...account,
    provider: account.provider as SenderProvider,
    status: account.status as SenderStatus,
    remainingToday: Math.max(0, account.dailySendLimit - account.sentToday),
  };
}

export async function testSenderConnectivity(id: string): Promise<{
  connected: boolean;
  email: string;
  message: string;
}> {
  const sender = await prisma.senderAccount.findUniqueOrThrow({ where: { id } });

  // In DRY_RUN or for Demo accounts without tokens
  if (!sender.encryptedRefreshToken && !sender.encryptedAccessToken) {
    return {
      connected: sender.status === SenderStatus.CONNECTED,
      email: sender.email,
      message: 'Demo / Dry-run sender verified without network token.',
    };
  }

  try {
    let isConnected = false;
    if (sender.provider === SenderProvider.GMAIL) {
      const provider = new GmailProvider({
        encryptedAccessToken: sender.encryptedAccessToken,
        encryptedRefreshToken: sender.encryptedRefreshToken,
      });
      isConnected = await provider.testConnection();
    } else if (sender.provider === SenderProvider.MICROSOFT) {
      const provider = new MicrosoftProvider({
        encryptedAccessToken: sender.encryptedAccessToken,
        encryptedRefreshToken: sender.encryptedRefreshToken,
      });
      isConnected = await provider.testConnection();
    }

    await prisma.senderAccount.update({
      where: { id },
      data: {
        status: isConnected ? SenderStatus.CONNECTED : SenderStatus.ERROR,
        lastErrorMessage: isConnected ? null : 'Failed connection verification with provider',
      },
    });

    return {
      connected: isConnected,
      email: sender.email,
      message: isConnected ? `Connection to ${sender.provider} API verified successfully.` : `${sender.provider} connection check failed.`,
    };
  } catch (err: any) {
    await prisma.senderAccount.update({
      where: { id },
      data: {
        status: SenderStatus.ERROR,
        lastErrorMessage: err.message,
      },
    });
    return {
      connected: false,
      email: sender.email,
      message: err.message || 'Connection failed',
    };
  }
}
