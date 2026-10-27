import React, { useEffect, useState } from 'react';
import {
  FileText,
  Copy,
  Eye,
  Send,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { TemplateDto, ServiceCategory, SenderAccountDto } from '@rankrise/shared';

export default function TemplatesView() {
  const [templates, setTemplates] = useState<TemplateDto[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Preview Modal
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);

  // Test Email Modal
  const [testModalTemplate, setTestModalTemplate] = useState<TemplateDto | null>(null);
  const [senders, setSenders] = useState<SenderAccountDto[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState('admin@rankriseusa.com');
  const [sendingTest, setSendingTest] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const url = categoryFilter ? `/templates?category=${categoryFilter}` : '/templates';
      const res = await apiFetch(url);
      setTemplates(res.templates);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    apiFetch('/senders').then(res => {
      setSenders(res.senders);
      if (res.senders.length > 0) setSelectedSenderId(res.senders[0].id);
    });
  }, [categoryFilter]);

  const handleDuplicate = async (id: string) => {
    try {
      await apiFetch(`/templates/${id}/duplicate`, { method: 'POST' });
      fetchTemplates();
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate template');
    }
  };

  const handleOpenPreview = async (template: TemplateDto) => {
    setPreviewTemplate(template);
    setPreviewData(null);
    try {
      const res = await apiFetch(`/templates/${template.id}/preview`, { method: 'POST' });
      setPreviewData(res);
    } catch (err: any) {
      alert(err.message || 'Failed to generate preview');
    }
  };

  const handleSendTestEmail = async () => {
    if (!testModalTemplate || !selectedSenderId || !recipientEmail) return;
    setSendingTest(true);
    setTestSuccess(null);
    try {
      const res = await apiFetch('/templates/test-send', {
        method: 'POST',
        body: JSON.stringify({
          templateId: testModalTemplate.id,
          senderId: selectedSenderId,
          recipientEmail,
        }),
      });
      setTestSuccess(res.message);
    } catch (err: any) {
      alert(err.message || 'Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  };

  const categories = [
    { label: 'All Templates', value: '' },
    { label: 'App Development', value: 'APP_DEVELOPMENT' },
    { label: 'Websites', value: 'WEBSITE' },
    { label: 'Digital Marketing', value: 'DIGITAL_MARKETING' },
    { label: 'SEO & Local', value: 'SEO' },
  ];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">Outreach Email Templates</h3>
          <p className="text-xs text-slate-400">
            10 initial reference seed templates across digital service categories with universal fallback protection.
          </p>
        </div>

        <div className="flex space-x-2">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                categoryFilter === cat.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((t) => (
          <div
            key={t.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider bg-blue-950 text-blue-400 border border-blue-800/40">
                  {t.category}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">Weight: {t.weight}</span>
              </div>

              <h4 className="text-base font-bold text-white mb-1 truncate">{t.name}</h4>
              <p className="text-xs font-semibold text-slate-300 mb-3 line-clamp-1">{t.subject}</p>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 font-mono line-clamp-4 leading-relaxed">
                {t.bodyText}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
              <div className="flex space-x-2">
                <button
                  onClick={() => handleOpenPreview(t)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                </button>
                <button
                  onClick={() => {
                    setTestModalTemplate(t);
                    setTestSuccess(null);
                  }}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center"
                >
                  <Send className="w-3.5 h-3.5 mr-1" /> Test Send
                </button>
              </div>

              <button
                onClick={() => handleDuplicate(t.id)}
                title="Duplicate Template"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Live Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Live Email Preview</h3>
                <p className="text-xs text-slate-400 font-mono">
                  Simulated To: {previewData?.recipientEmail} | From: {previewData?.senderEmail}
                </p>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400">Subject: </span>
              <strong className="text-white font-medium">{previewData?.subject || previewTemplate.subject}</strong>
            </div>

            <div className="flex-1 overflow-y-auto bg-white rounded-xl p-6 text-slate-900 border border-slate-300">
              {previewData ? (
                <div dangerouslySetInnerHTML={{ __html: previewData.bodyHtml }} />
              ) : (
                <div className="text-center py-12 text-slate-400">Rendering preview...</div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Send Modal */}
      {testModalTemplate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Send Verified Test Email</h3>
              <button onClick={() => setTestModalTemplate(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {testSuccess && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{testSuccess}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Dispatching Sender Account</label>
                <select
                  value={selectedSenderId}
                  onChange={(e) => setSelectedSenderId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                >
                  {senders.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.displayName} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Recipient Test Destination</label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                Mode: <strong className="text-amber-400">DRY_RUN (Simulated)</strong> by default. Renders the full email and writes an audit log without contacting external mail servers.
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setTestModalTemplate(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
              <button
                disabled={sendingTest || !selectedSenderId || !recipientEmail}
                onClick={handleSendTestEmail}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center"
              >
                {sendingTest ? 'Dispatching...' : 'Send Test'}
                <Send className="w-3.5 h-3.5 ml-1.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
