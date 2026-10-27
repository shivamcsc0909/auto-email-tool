import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Mail,
  Send,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Layers,
  Zap,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

export default function AnalyticsView() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<any>('/analytics');
      setData(res);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading && !data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
        <p className="text-slate-600 font-medium">Generating performance analytics...</p>
      </div>
    );
  }

  const cards = data?.cards || {};
  const funnel = data?.funnel || {};
  const senders = data?.senders || [];
  const templates = data?.templates || [];
  const campaigns = data?.campaigns || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics & Throughput</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time multi-sender delivery telemetry, safety quota tracking, and campaign funnel metrics.
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          title="Refresh Metrics"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Ingested Leads</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900">{cards.totalLeads?.toLocaleString() || 0}</div>
          <div className="mt-1 text-xs text-slate-500">
            <span className="text-emerald-600 font-semibold">{cards.readyLeads || 0}</span> ready for outreach
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sent Today</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900">{cards.sentToday || 0}</div>
          <div className="mt-1 text-xs text-slate-500">
            Across {cards.connectedSenders || 0} connected mailboxes
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Remaining Cap Today</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900">{cards.remainingToday || 0}</div>
          <div className="mt-1 text-xs text-slate-500">
            Enforcing strict 20 sends/day limit
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Failed / Bounced</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900">{cards.failedEmails || 0}</div>
          <div className="mt-1 text-xs text-slate-500">
            {cards.suppressedLeads || 0} addresses permanently suppressed
          </div>
        </div>
      </div>

      {/* Funnel Breakdown */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          Lead Engagement & Outreach Funnel
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="text-xs text-slate-400 font-medium">1. Total Ingested</div>
            <div className="text-xl font-bold text-slate-800">{funnel.totalLeads || 0}</div>
            <div className="w-full h-1.5 bg-blue-200 rounded-full mt-2">
              <div className="w-full h-full bg-blue-600 rounded-full"></div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="text-xs text-slate-400 font-medium">2. Sanitized & Ready</div>
            <div className="text-xl font-bold text-slate-800">{funnel.readyLeads || 0}</div>
            <div className="w-full h-1.5 bg-blue-200 rounded-full mt-2">
              <div
                className="h-full bg-blue-600 rounded-full"
                style={{
                  width: `${funnel.totalLeads > 0 ? (funnel.readyLeads / funnel.totalLeads) * 100 : 0}%`,
                }}
              ></div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="text-xs text-slate-400 font-medium">3. Dispatched / Sent</div>
            <div className="text-xl font-bold text-emerald-700">{funnel.sentEmails || 0}</div>
            <div className="w-full h-1.5 bg-emerald-200 rounded-full mt-2">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{
                  width: `${funnel.readyLeads > 0 ? (funnel.sentEmails / funnel.readyLeads) * 100 : 0}%`,
                }}
              ></div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="text-xs text-slate-400 font-medium">4. Blocked / Suppressed</div>
            <div className="text-xl font-bold text-rose-600">
              {(funnel.suppressedLeads || 0) + (funnel.skippedEmails || 0)}
            </div>
            <div className="w-full h-1.5 bg-rose-200 rounded-full mt-2">
              <div
                className="h-full bg-rose-500 rounded-full"
                style={{
                  width: `${funnel.totalLeads > 0 ? (((funnel.suppressedLeads || 0) + (funnel.skippedEmails || 0)) / funnel.totalLeads) * 100 : 0}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Senders Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Sender Mailbox Quota & Performance</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live capacity and health metrics. 20-send daily ceiling resets nightly at midnight.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Sender Mailbox</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Today's Usage (Max 20)</th>
                <th className="px-6 py-4">Remaining Today</th>
                <th className="px-6 py-4">All-Time Sent</th>
                <th className="px-6 py-4">Success Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {senders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No sender accounts connected.
                  </td>
                </tr>
              ) : (
                senders.map((s: any) => {
                  const usagePct = Math.min(100, Math.round((s.sentToday / s.dailySendLimit) * 100));

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 text-xs">{s.displayName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{s.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            s.status === 'CONNECTED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              s.status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          ></span>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                usagePct >= 100
                                  ? 'bg-rose-500'
                                  : usagePct >= 75
                                  ? 'bg-amber-500'
                                  : 'bg-blue-600'
                              }`}
                              style={{ width: `${usagePct}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-semibold text-slate-700">
                            {s.sentToday} / {s.dailySendLimit}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-semibold text-xs text-slate-800">
                        {s.remainingToday}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-800">
                        {s.totalSent}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-xs text-emerald-600">{s.successRate}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
