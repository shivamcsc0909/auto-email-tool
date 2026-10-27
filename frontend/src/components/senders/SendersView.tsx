import React, { useEffect, useState } from 'react';
import {
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Edit,
  Trash2,
  PowerOff,
  Zap,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { SenderAccountDto, APPLICATION_DAILY_SENDER_LIMIT } from '@rankrise/shared';
import SignatureModal from './SignatureModal';

export default function SendersView() {
  const [senders, setSenders] = useState<SenderAccountDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; message: string; connected: boolean } | null>(null);

  const [editingSender, setEditingSender] = useState<SenderAccountDto | null>(null);

  const fetchSenders = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/senders');
      setSenders(res.senders);
    } catch (err) {
      console.error('Failed to load senders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSenders();

    // Check URL params for OAuth status return
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') === 'connected') {
      const email = params.get('email');
      alert(`Successfully connected email account: ${email}`);
      // Clean query params
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('error')) {
      alert(`OAuth Error: ${params.get('error')}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleConnectGmail = async () => {
    try {
      const res = await apiFetch('/senders/gmail/connect');
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      alert(err.message || 'Failed to initiate Google OAuth. Check your GOOGLE_CLIENT_ID in .env.');
    }
  };

  const handleConnectMicrosoft = async () => {
    try {
      const res = await apiFetch('/senders/microsoft/connect');
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      alert(err.message || 'Failed to initiate Microsoft OAuth. Check your MICROSOFT_CLIENT_ID in .env.');
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await apiFetch(`/senders/${id}/test`, { method: 'POST' });
      setTestResult({ id, message: res.message, connected: res.connected });
      fetchSenders();
    } catch (err: any) {
      setTestResult({ id, message: err.message || 'Connection test failed', connected: false });
    } finally {
      setTestingId(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm('Disconnect this sender account? OAuth tokens will be scrubbed.')) return;
    try {
      await apiFetch(`/senders/${id}/disconnect`, { method: 'POST' });
      fetchSenders();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">Connected Email Accounts</h3>
          <p className="text-xs text-slate-400">
            Authenticate Gmail (Google Workspace) or Outlook (Office 365) via official OAuth 2.0 with AES-256 encrypted tokens.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleConnectGmail}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-white flex items-center shadow-sm transition-colors"
          >
            <Mail className="w-4 h-4 mr-2 text-red-400" /> + Connect Gmail
          </button>
          <button
            onClick={handleConnectMicrosoft}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-semibold text-white flex items-center shadow-sm transition-colors"
          >
            <Zap className="w-4 h-4 mr-2 text-white" /> + Connect Outlook
          </button>
        </div>
      </div>

      {/* Safety Cap Banner */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center space-x-3">
        <ShieldCheck className="w-5 h-5 text-blue-400 flex-shrink-0" />
        <div className="text-xs">
          <strong className="text-white font-semibold">Strict Application Safety Cap:</strong> Each sender account has a maximum limit of{' '}
          <strong className="text-white">{APPLICATION_DAILY_SENDER_LIMIT} sends per day</strong>. Senders are automatically rotated and paused when their 20-send ceiling is reached.
        </div>
      </div>

      {/* Senders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {senders.map((s) => {
          const limit = s.dailySendLimit || APPLICATION_DAILY_SENDER_LIMIT;
          const progress = Math.min(100, Math.round((s.sentToday / limit) * 100));
          const isCapped = s.sentToday >= limit;

          return (
            <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wide bg-slate-800 text-slate-300">
                    {s.provider}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                      s.status === 'CONNECTED'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                        : 'bg-red-950 text-red-400 border border-red-800/50'
                    }`}
                  >
                    {s.status}
                  </span>
                </div>

                <h4 className="text-base font-bold text-white truncate">{s.displayName}</h4>
                <p className="text-xs text-slate-400 font-mono truncate">{s.email}</p>

                {s.title && (
                  <p className="text-xs text-slate-400 mt-1">
                    {s.title} {s.company ? `| ${s.company}` : ''}
                  </p>
                )}

                {/* Progress bar */}
                <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Daily Cap Usage:</span>
                    <span className={`font-semibold ${isCapped ? 'text-amber-400' : 'text-slate-200'}`}>
                      {s.sentToday} / {limit} ({s.remainingToday} left)
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isCapped ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {testResult && testResult.id === s.id && (
                  <div
                    className={`mt-3 p-2.5 rounded-lg text-xs border ${
                      testResult.connected
                        ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                        : 'bg-red-950/60 border-red-800 text-red-300'
                    }`}
                  >
                    {testResult.message}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                <button
                  disabled={testingId === s.id}
                  onClick={() => handleTestConnection(s.id)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
                >
                  {testingId === s.id ? 'Testing...' : 'Test Connection'}
                </button>

                <div className="flex space-x-1">
                  <button
                    onClick={() => setEditingSender(s)}
                    title="Edit Signature & Profile"
                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDisconnect(s.id)}
                    title="Disconnect Account"
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg"
                  >
                    <PowerOff className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Signature & Profile Modal */}
      {editingSender && (
        <SignatureModal
          sender={editingSender}
          isOpen={Boolean(editingSender)}
          onClose={() => setEditingSender(null)}
          onSuccess={() => {
            setEditingSender(null);
            fetchSenders();
          }}
        />
      )}
    </div>
  );
}
