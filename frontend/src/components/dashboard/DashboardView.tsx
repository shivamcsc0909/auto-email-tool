import React, { useEffect, useState } from 'react';
import {
  Users,
  Send,
  MailCheck,
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { APPLICATION_DAILY_SENDER_LIMIT } from '@rankrise/shared';

export default function DashboardView({ onNavigate }: { onNavigate: (tab: any) => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/analytics')
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error('Failed to load analytics:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px] text-slate-400">
        <div className="animate-pulse flex items-center space-x-2">
          <Clock className="w-5 h-5 text-blue-500 animate-spin" />
          <span>Loading platform metrics...</span>
        </div>
      </div>
    );
  }

  const cards = data?.cards || {};
  const senders = data?.senders || [];
  const campaigns = data?.campaigns || [];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Leads</span>
            <div className="p-2 bg-blue-950/60 rounded-xl text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-white">{cards.totalLeads || 0}</span>
            <span className="text-xs text-emerald-400 font-medium">{cards.readyLeads || 0} ready</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sent Today</span>
            <div className="p-2 bg-emerald-950/60 rounded-xl text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-white">{cards.sentToday || 0}</span>
            <span className="text-xs text-slate-400 font-medium">{cards.remainingToday || 0} remaining</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Connected Senders</span>
            <div className="p-2 bg-purple-950/60 rounded-xl text-purple-400">
              <MailCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-white">{cards.connectedSenders || 0}</span>
            <span className="text-xs text-slate-400 font-medium">{cards.totalSenders || 0} total</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Campaigns</span>
            <div className="p-2 bg-amber-950/60 rounded-xl text-amber-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-white">{cards.activeCampaigns || 0}</span>
            <span className="text-xs text-slate-400 font-medium">{campaigns.length} configured</span>
          </div>
        </div>
      </div>

      {/* Senders Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Connected Sender Accounts & Daily Limits</h3>
            <p className="text-xs text-slate-400">
              Strict 20 sends/day application safety ceiling per mailbox to protect domain reputations.
            </p>
          </div>
          <button
            onClick={() => onNavigate('senders')}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center font-medium"
          >
            Manage Accounts <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {senders.map((s: any) => {
            const limit = s.dailySendLimit || APPLICATION_DAILY_SENDER_LIMIT;
            const progress = Math.min(100, Math.round((s.sentToday / limit) * 100));
            const isCapped = s.sentToday >= limit;

            return (
              <div key={s.id} className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-white truncate max-w-[180px]">{s.displayName}</span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase ${
                      s.status === 'CONNECTED'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                        : 'bg-red-950 text-red-400 border border-red-800/50'
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate mb-3">{s.email}</p>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Today's Cap:</span>
                    <span className={`font-semibold ${isCapped ? 'text-amber-400' : 'text-slate-200'}`}>
                      {s.sentToday} / {limit} ({s.remainingToday} left)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        isCapped ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Campaigns Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Active Outreach Campaigns</h3>
            <p className="text-xs text-slate-400">Real-time status of lead batches and delivery queues.</p>
          </div>
          <button
            onClick={() => onNavigate('campaigns')}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center font-medium"
          >
            All Campaigns <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No campaigns created yet. Click "+ Create Campaign" to launch your first outreach.
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c: any) => (
              <div
                key={c.id}
                className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-semibold text-white">{c.name}</h4>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-800 text-slate-300 rounded-md">
                      {c.status}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-slate-400">
                    <span>Total: <strong className="text-slate-200">{c.totalLeads}</strong></span>
                    <span>Sent: <strong className="text-emerald-400">{c.sentLeads}</strong></span>
                    <span>Remaining: <strong className="text-slate-200">{c.remainingLeads}</strong></span>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="text-sm font-bold text-blue-400">{c.progressPercentage}</span>
                  <div className="w-32 bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: c.progressPercentage }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
