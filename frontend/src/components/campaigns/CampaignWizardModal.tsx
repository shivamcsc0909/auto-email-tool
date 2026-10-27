import React, { useEffect, useState } from 'react';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Check,
  ShieldCheck,
  AlertTriangle,
  Send,
  Layers,
  Clock,
  Mail,
  Users,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import {
  TemplateDto,
  SenderAccountDto,
  LeadDto,
  ServiceCategory,
  APPLICATION_DAILY_SENDER_LIMIT,
} from '@rankrise/shared';

interface CampaignWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CampaignWizardModal({ isOpen, onClose, onSuccess }: CampaignWizardModalProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory>(ServiceCategory.APP_DEVELOPMENT);

  // Selections
  const [availableLeads, setAvailableLeads] = useState<LeadDto[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  const [availableTemplates, setAvailableTemplates] = useState<TemplateDto[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());

  const [availableSenders, setAvailableSenders] = useState<SenderAccountDto[]>([]);
  const [selectedSenderIds, setSelectedSenderIds] = useState<Set<string>>(new Set());

  // Configuration
  const [delayMin, setDelayMin] = useState(90);
  const [delayMax, setDelayMax] = useState(300);
  const [timezone, setTimezone] = useState('America/New_York');
  const [scheduleStart, setScheduleStart] = useState('09:00');
  const [scheduleEnd, setScheduleEnd] = useState('17:00');

  // Confirmation
  const [confirmedSafety, setConfirmedSafety] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Load available leads, templates, and senders
    apiFetch('/leads?limit=50&status=READY').then(res => {
      setAvailableLeads(res.leads);
      setSelectedLeadIds(new Set(res.leads.map((l: any) => l.id)));
    });

    apiFetch('/templates').then(res => {
      setAvailableTemplates(res.templates);
      if (res.templates.length > 0) {
        setSelectedTemplateIds(new Set([res.templates[0].id]));
      }
    });

    apiFetch('/senders').then(res => {
      setAvailableSenders(res.senders.filter((s: any) => s.status === 'CONNECTED'));
      setSelectedSenderIds(new Set(res.senders.filter((s: any) => s.status === 'CONNECTED').map((s: any) => s.id)));
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const estimatedCapacity = Array.from(selectedSenderIds).reduce((sum, sId) => {
    const s = availableSenders.find(x => x.id === sId);
    return sum + (s?.remainingToday || 20);
  }, 0);

  const toggleSelectAllLeads = () => {
    if (selectedLeadIds.size === availableLeads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(availableLeads.map(l => l.id)));
    }
  };

  const handleLaunch = async () => {
    if (!name.trim()) {
      setError('Please provide a campaign name');
      return;
    }
    if (!confirmedSafety) {
      setError('You must check the explicit safety confirmation before launch');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Create Campaign
      const createRes = await apiFetch('/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name,
          serviceCategory,
          templateIds: Array.from(selectedTemplateIds),
          senderIds: Array.from(selectedSenderIds),
          leadIds: Array.from(selectedLeadIds),
          perSenderLimit: APPLICATION_DAILY_SENDER_LIMIT,
          delayMin,
          delayMax,
          scheduleStart,
          scheduleEnd,
          timezone,
        }),
      });

      // 2. Launch Campaign
      await apiFetch(`/campaigns/${createRes.campaign.id}/start`, {
        method: 'POST',
        body: JSON.stringify({ confirmation: true }),
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to launch campaign');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white">Campaign Creation Wizard</h3>
            <p className="text-xs text-slate-400">
              Configure multi-sender email outreach with automated rotation and rate safety.
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Wizard Steps indicator */}
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 pb-2 border-b border-slate-800/60">
          <span className={step === 1 ? 'text-blue-400 font-bold' : ''}>1. Service & Name</span>
          <span>&rarr;</span>
          <span className={step === 2 ? 'text-blue-400 font-bold' : ''}>2. Leads & Senders</span>
          <span>&rarr;</span>
          <span className={step === 3 ? 'text-blue-400 font-bold' : ''}>3. Schedule & Launch</span>
        </div>

        {/* STEP 1: Name & Service Category */}
        {step === 1 && (
          <div className="space-y-4 flex-1 overflow-y-auto pr-1 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Campaign Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Q3 Mobile App Business Outreach"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Service Category</label>
              <select
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value as ServiceCategory)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white"
              >
                <option value={ServiceCategory.APP_DEVELOPMENT}>App Development</option>
                <option value={ServiceCategory.WEBSITE}>Modern Websites</option>
                <option value={ServiceCategory.DIGITAL_MARKETING}>Digital Marketing</option>
                <option value={ServiceCategory.SEO}>SEO</option>
                <option value={ServiceCategory.LOCAL_SEO}>Local SEO</option>
                <option value={ServiceCategory.GENERAL_DIGITAL_SERVICES}>General Digital Services</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-2">Select Template(s)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {availableTemplates.map((t) => {
                  const isSelected = selectedTemplateIds.has(t.id);
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        const updated = new Set(selectedTemplateIds);
                        if (isSelected) updated.delete(t.id);
                        else updated.add(t.id);
                        setSelectedTemplateIds(updated);
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-950/50 border-blue-600 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <p className="font-semibold text-xs truncate">{t.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{t.subject}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Leads & Senders */}
        {step === 2 && (
          <div className="space-y-4 flex-1 overflow-y-auto pr-1 text-xs">
            {/* Sender Accounts selection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-semibold">Select Sender Accounts (Rotated Dynamically)</label>
                <span className="text-blue-400 font-medium">{selectedSenderIds.size} selected</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableSenders.map((s) => {
                  const isSelected = selectedSenderIds.has(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        const updated = new Set(selectedSenderIds);
                        if (isSelected) updated.delete(s.id);
                        else updated.add(s.id);
                        setSelectedSenderIds(updated);
                      }}
                      className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-blue-950/50 border-blue-600 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="truncate">
                        <p className="font-semibold text-xs truncate">{s.displayName}</p>
                        <p className="text-[11px] text-slate-500 font-mono truncate">{s.email}</p>
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 ml-2">
                        {s.remainingToday}/20 left
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Leads count summary */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-400 font-medium">Available Verified Leads:</span>
                <p className="text-lg font-bold text-white">{availableLeads.length} leads ready</p>
              </div>
              <button
                type="button"
                onClick={toggleSelectAllLeads}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
              >
                {selectedLeadIds.size === availableLeads.length ? 'Deselect All' : 'Select All Ready Leads'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Safety Capacity, Schedule & Confirmation */}
        {step === 3 && (
          <div className="space-y-4 flex-1 overflow-y-auto pr-1 text-xs">
            {/* Safety Capacity Card */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center space-x-2 text-blue-400 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Pre-Launch Safety & Capacity Analysis</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-slate-900 rounded-lg">
                  <span className="text-slate-400 text-[11px]">Selected Leads</span>
                  <p className="text-base font-bold text-white">{selectedLeadIds.size}</p>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg">
                  <span className="text-slate-400 text-[11px]">Active Senders</span>
                  <p className="text-base font-bold text-white">{selectedSenderIds.size}</p>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg">
                  <span className="text-slate-400 text-[11px]">Est. Daily Cap</span>
                  <p className="text-base font-bold text-emerald-400">{estimatedCapacity} emails/day</p>
                </div>
              </div>
            </div>

            {/* Delay & Schedule configuration */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <label className="block text-slate-400 mb-1">Min Delay (seconds)</label>
                <input
                  type="number"
                  min={30}
                  value={delayMin}
                  onChange={(e) => setDelayMin(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Max Delay (seconds)</label>
                <input
                  type="number"
                  min={60}
                  value={delayMax}
                  onChange={(e) => setDelayMax(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="America/Chicago">America/Chicago (CST)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                </select>
              </div>
            </div>

            {/* Explicit Confirmation Checkbox */}
            <div className="p-4 bg-amber-950/30 border border-amber-800/60 rounded-xl space-y-2">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={confirmedSafety}
                  onChange={(e) => setConfirmedSafety(e.target.checked)}
                  className="mt-0.5 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                />
                <span className="text-xs text-amber-200 font-medium leading-relaxed">
                  I understand that emails will be sent automatically using the selected accounts and adhere to the strict 20 sends/day application ceiling.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Footer controls */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-800">
          <button
            onClick={() => {
              if (step > 1) setStep(step - 1);
              else onClose();
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center"
            >
              Next <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          ) : (
            <button
              disabled={submitting || !confirmedSafety}
              onClick={handleLaunch}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center shadow-lg shadow-emerald-500/20"
            >
              {submitting ? 'Launching...' : 'Approve & Launch Campaign'}
              <Check className="w-4 h-4 ml-1.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
