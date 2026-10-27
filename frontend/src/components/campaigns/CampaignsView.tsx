import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  Plus,
  RefreshCw,
  Clock,
  Layers,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Trash2,
  Send,
  Calendar,
  Zap,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { CampaignDto, CampaignStatus } from '@rankrise/shared';
import CampaignWizardModal from './CampaignWizardModal';

export default function CampaignsView() {
  const [campaigns, setCampaigns] = useState<CampaignDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Safety confirmation modal state
  const [startModalCampaign, setStartModalCampaign] = useState<CampaignDto | null>(null);
  const [capacityInfo, setCapacityInfo] = useState<any | null>(null);
  const [confirmSafetyChecked, setConfirmSafetyChecked] = useState(false);

  const fetchCampaigns = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ campaigns: CampaignDto[] }>('/campaigns');
      setCampaigns(res.campaigns || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleOpenStartModal = async (campaign: CampaignDto) => {
    setStartModalCampaign(campaign);
    setConfirmSafetyChecked(false);
    setError(null);
    try {
      const cap = await apiFetch<any>(`/campaigns/${campaign.id}/capacity`);
      setCapacityInfo(cap);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate campaign safety capacity');
    }
  };

  const handleStartCampaign = async () => {
    if (!startModalCampaign) return;
    setActionLoadingId(startModalCampaign.id);
    setError(null);
    try {
      await apiFetch(`/campaigns/${startModalCampaign.id}/start`, {
        method: 'POST',
        body: JSON.stringify({ confirmation: confirmSafetyChecked }),
      });
      setSuccessMessage(`Campaign "${startModalCampaign.name}" launched successfully! Queue is now processing.`);
      setStartModalCampaign(null);
      await fetchCampaigns();
    } catch (err: any) {
      setError(err.message || 'Failed to launch campaign');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePause = async (campaignId: string) => {
    setActionLoadingId(campaignId);
    setError(null);
    try {
      await apiFetch(`/campaigns/${campaignId}/pause`, { method: 'POST' });
      setSuccessMessage('Campaign paused safely.');
      await fetchCampaigns();
    } catch (err: any) {
      setError(err.message || 'Failed to pause campaign');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResume = async (campaignId: string) => {
    setActionLoadingId(campaignId);
    setError(null);
    try {
      await apiFetch(`/campaigns/${campaignId}/resume`, { method: 'POST' });
      setSuccessMessage('Campaign resumed.');
      await fetchCampaigns();
    } catch (err: any) {
      setError(err.message || 'Failed to resume campaign');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStop = async (campaignId: string) => {
    if (!confirm('Are you sure you want to stop this campaign? Any pending queued messages will be cancelled.')) {
      return;
    }
    setActionLoadingId(campaignId);
    setError(null);
    try {
      await apiFetch(`/campaigns/${campaignId}/stop`, { method: 'POST' });
      setSuccessMessage('Campaign stopped.');
      await fetchCampaigns();
    } catch (err: any) {
      setError(err.message || 'Failed to stop campaign');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (campaignId: string) => {
    if (!confirm('Are you sure you want to permanently delete this campaign?')) {
      return;
    }
    setActionLoadingId(campaignId);
    setError(null);
    try {
      await apiFetch(`/campaigns/${campaignId}`, { method: 'DELETE' });
      setSuccessMessage('Campaign deleted.');
      await fetchCampaigns();
    } catch (err: any) {
      setError(err.message || 'Failed to delete campaign');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case CampaignStatus.RUNNING:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Running
          </span>
        );
      case CampaignStatus.PAUSED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Paused
          </span>
        );
      case CampaignStatus.COMPLETED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
            Completed
          </span>
        );
      case CampaignStatus.STOPPED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Stopped
          </span>
        );
      case CampaignStatus.READY:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            Ready
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Campaign Automation</h1>
          <p className="text-sm text-slate-500 mt-1">
            Build multi-sender cold outreach campaigns with strict 20-send daily limits and randomized pacing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchCampaigns}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
            title="Refresh Campaigns"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Campaign
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-semibold">✕</button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700 font-semibold">✕</button>
        </div>
      )}

      {/* Campaigns List */}
      {loading && campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Loading campaigns...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Send className="w-7 h-7 text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No campaigns created yet</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            Get started by launching a targeted, multi-sender email campaign with automated personalization and safe sender pacing.
          </p>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Create First Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {campaigns.map((camp) => {
            const progress = camp.totalLeads > 0 ? Math.round((camp.sentLeads / camp.totalLeads) * 100) : 0;
            const remaining = Math.max(0, camp.totalLeads - camp.sentLeads - camp.failedLeads);
            const isActing = actionLoadingId === camp.id;

            return (
              <div
                key={camp.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all p-6"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-lg font-bold text-slate-900">{camp.name}</h2>
                        {getStatusBadge(camp.status)}
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          {camp.serviceCategory}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Sending window: {camp.scheduleStart} - {camp.scheduleEnd} ({camp.timezone})
                        </span>
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          Randomized delay: {camp.delayMin}s - {camp.delayMax}s
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end lg:self-center">
                    {camp.status === CampaignStatus.DRAFT && (
                      <button
                        onClick={() => handleOpenStartModal(camp)}
                        disabled={isActing}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Launch Campaign
                      </button>
                    )}

                    {camp.status === CampaignStatus.RUNNING && (
                      <>
                        <button
                          onClick={() => handlePause(camp.id)}
                          disabled={isActing}
                          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                        >
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          Pause
                        </button>
                        <button
                          onClick={() => handleStop(camp.id)}
                          disabled={isActing}
                          className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          Stop
                        </button>
                      </>
                    )}

                    {camp.status === CampaignStatus.PAUSED && (
                      <>
                        <button
                          onClick={() => handleResume(camp.id)}
                          disabled={isActing}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Resume
                        </button>
                        <button
                          onClick={() => handleStop(camp.id)}
                          disabled={isActing}
                          className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          Stop
                        </button>
                      </>
                    )}

                    {(camp.status === CampaignStatus.DRAFT ||
                      camp.status === CampaignStatus.COMPLETED ||
                      camp.status === CampaignStatus.STOPPED) && (
                      <button
                        onClick={() => handleDelete(camp.id)}
                        disabled={isActing}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Delete Campaign"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress & Metrics */}
                <div className="pt-5 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                  <div className="sm:col-span-2 space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-600">Progress: {progress}%</span>
                      <span className="text-slate-500">
                        {camp.sentLeads} of {camp.totalLeads} sent
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      ></div>
                      {camp.failedLeads > 0 && (
                        <div
                          className="h-full bg-rose-500 transition-all duration-500"
                          style={{ width: `${(camp.failedLeads / camp.totalLeads) * 100}%` }}
                        ></div>
                      )}
                    </div>
                  </div>

                  <div className="border-l border-slate-100 pl-4 space-y-1">
                    <div className="text-xs font-medium text-slate-400">Remaining Queue</div>
                    <div className="text-base font-bold text-slate-800">{remaining} leads</div>
                  </div>

                  <div className="border-l border-slate-100 pl-4 space-y-1">
                    <div className="text-xs font-medium text-slate-400">Failed Attempts</div>
                    <div className={`text-base font-bold ${camp.failedLeads > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {camp.failedLeads}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Safety Confirmation Launch Modal */}
      {startModalCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Launch Campaign Confirmation</h3>
                  <p className="text-xs text-slate-400">RankRiseUSA Safety Verification</p>
                </div>
              </div>
              <button
                onClick={() => setStartModalCampaign(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <h4 className="text-sm font-semibold text-slate-800">Campaign: {startModalCampaign.name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Launching will enqueue {startModalCampaign.totalLeads} personalized outreach jobs.
                </p>
              </div>

              {capacityInfo && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 space-y-2 text-xs text-slate-700">
                  <div className="font-semibold text-blue-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Pacing & Capacity Forecast
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-slate-500">Connected Senders:</span>{' '}
                      <span className="font-semibold">{capacityInfo.connectedSendersCount}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Daily Cap (Per Sender):</span>{' '}
                      <span className="font-semibold">{capacityInfo.applicationDailyLimit}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Today's Remaining Capacity:</span>{' '}
                      <span className="font-semibold">{capacityInfo.remainingCapacityToday} sends</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Est. Total Duration:</span>{' '}
                      <span className="font-semibold">{capacityInfo.estimatedDaysToComplete} day(s)</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-amber-900">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Anti-Spam Reputation Protection Active
                </div>
                <p>
                  No sender will exceed 20 emails per 24 hours. Messages will be staggered with randomized pauses.
                  Suppression entries and unsubscribes are automatically skipped.
                </p>
              </div>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={confirmSafetyChecked}
                  onChange={(e) => setConfirmSafetyChecked(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-700">
                  I confirm that all recipient addresses have been sanitized, deduplicated, and comply with CAN-SPAM regulations.
                </span>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStartModalCampaign(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartCampaign}
                  disabled={!confirmSafetyChecked || actionLoadingId !== null}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5" />
                  {actionLoadingId ? 'Launching...' : 'Confirm & Launch'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Wizard Modal */}
      <CampaignWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={() => {
          setIsWizardOpen(false);
          fetchCampaigns();
        }}
      />
    </div>
  );
}
