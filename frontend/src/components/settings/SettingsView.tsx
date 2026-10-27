import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  Key,
  Database,
  Mail,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Server,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function SettingsView() {
  const { user, logout } = useAuth();
  const [copiedGoogle, setCopiedGoogle] = useState(false);
  const [copiedMs, setCopiedMs] = useState(false);

  const googleRedirectUri = 'http://localhost:4000/api/senders/gmail/callback';
  const msRedirectUri = 'http://localhost:4000/api/senders/microsoft/callback';

  const handleCopy = (text: string, type: 'google' | 'ms') => {
    navigator.clipboard.writeText(text);
    if (type === 'google') {
      setCopiedGoogle(true);
      setTimeout(() => setCopiedGoogle(false), 2000);
    } else {
      setCopiedMs(true);
      setTimeout(() => setCopiedMs(false), 2000);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Configuration & OAuth Setup</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review application security parameters, encryption mechanisms, and OAuth 2.0 redirect endpoints.
        </p>
      </div>

      {/* Security & System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs uppercase tracking-wider">
            <Lock className="w-4 h-4" />
            Token Encryption
          </div>
          <div className="text-xl font-bold text-slate-900">AES-256-GCM</div>
          <p className="text-xs text-slate-500">
            All OAuth tokens (Google & Microsoft) are encrypted at rest with 128-bit authentication tags.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            Daily Safety Limit
          </div>
          <div className="text-xl font-bold text-slate-900">20 Emails / Day</div>
          <p className="text-xs text-slate-500">
            Enforced at backend controller & queue level. Mailboxes cannot exceed 20 outbound emails per calendar day.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs uppercase tracking-wider">
            <Server className="w-4 h-4" />
            Background Queue
          </div>
          <div className="text-xl font-bold text-slate-900">BullMQ + Fallback</div>
          <p className="text-xs text-slate-500">
            Backed by Redis with an automated in-memory asynchronous worker fallback for zero-dependency local setups.
          </p>
        </div>
      </div>

      {/* Current Admin Session */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Key className="w-4 h-4 text-blue-600" />
          Active Administrator
        </h2>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div>
            <div className="text-sm font-bold text-slate-900">{user?.name || 'Administrator'}</div>
            <div className="text-xs text-slate-500 font-mono">{user?.email || 'admin@rankriseusa.com'}</div>
            <div className="text-[11px] text-slate-400 mt-1">Role: SUPER_ADMIN</div>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold transition-colors self-start sm:self-center"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* OAuth Setup Guide */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">OAuth 2.0 Integration Setup</h2>
          <p className="text-xs text-slate-500 mt-1">
            To connect live Gmail or Microsoft 365 / Outlook accounts, register applications in Google Cloud Console and Microsoft Entra ID.
          </p>
        </div>

        {/* Google Setup */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              Google Cloud (Gmail API) Configuration
            </h3>
            <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200">
              Web Application
            </span>
          </div>
          <p className="text-xs text-slate-600">
            In Google Cloud Console, enable the <strong>Gmail API</strong>. Under <strong>Credentials &gt; OAuth 2.0 Client IDs</strong>,
            add this Authorized Redirect URI:
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={googleRedirectUri}
              className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
            />
            <button
              onClick={() => handleCopy(googleRedirectUri, 'google')}
              className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-100 rounded-xl text-xs font-medium text-slate-700 flex items-center gap-1.5 transition-colors"
            >
              {copiedGoogle ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedGoogle ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="text-[11px] text-slate-500">
            Set <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in <code>backend/.env</code>.
          </div>
        </div>

        {/* Microsoft Setup */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              Microsoft Entra ID (Graph API) Configuration
            </h3>
            <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200">
              Multi-Tenant / Personal
            </span>
          </div>
          <p className="text-xs text-slate-600">
            In Microsoft Entra ID (Azure Portal), register an application with permissions <strong>Mail.Send, offline_access, User.Read</strong>.
            Under <strong>Authentication &gt; Web Platforms</strong>, add this Redirect URI:
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={msRedirectUri}
              className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
            />
            <button
              onClick={() => handleCopy(msRedirectUri, 'ms')}
              className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-100 rounded-xl text-xs font-medium text-slate-700 flex items-center gap-1.5 transition-colors"
            >
              {copiedMs ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedMs ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="text-[11px] text-slate-500">
            Set <code>MICROSOFT_CLIENT_ID</code> and <code>MICROSOFT_CLIENT_SECRET</code> in <code>backend/.env</code>.
          </div>
        </div>
      </div>
    </div>
  );
}
