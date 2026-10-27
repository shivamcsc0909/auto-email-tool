import React, { useState } from 'react';
import { X, Check, RefreshCw, Eye, Code, FileText } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { SenderAccountDto } from '@rankrise/shared';

interface SignatureModalProps {
  sender: SenderAccountDto;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SignatureModal({ sender, isOpen, onClose, onSuccess }: SignatureModalProps) {
  const [displayName, setDisplayName] = useState(sender.displayName);
  const [senderName, setSenderName] = useState(sender.senderName);
  const [title, setTitle] = useState(sender.title || 'Business Development');
  const [company, setCompany] = useState(sender.company || 'RANKRISEUSA');
  const [website, setWebsite] = useState(sender.website || 'rankriseusa.com');
  const [phone, setPhone] = useState(sender.phone || '');
  const [signatureLogoUrl, setSignatureLogoUrl] = useState(sender.signatureLogoUrl || '');

  const [signatureHtml, setSignatureHtml] = useState(sender.signatureHtml || '');
  const [signatureText, setSignatureText] = useState(sender.signatureText || '');
  const [activeTab, setActiveTab] = useState<'preview' | 'html' | 'text'>('preview');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleResetToDefault = () => {
    // Generate default template preview
    const cleanUrl = website.startsWith('http') ? website : `https://${website}`;
    const defaultHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
  <p style="margin: 0 0 12px 0; color: #475569; font-size: 14px;">Best regards,</p>
  <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="line-height: 1.4;">
    <tr>
      ${signatureLogoUrl ? `<td style="padding-right: 16px; vertical-align: top;"><img src="${signatureLogoUrl}" alt="${company} Logo" width="60" height="60" style="display: block; width: 60px; height: 60px; border-radius: 6px; object-fit: contain;" /></td>` : ''}
      <td style="vertical-align: top;">
        <div style="font-weight: 700; color: #0f172a; font-size: 15px;">${senderName}</div>
        <div style="color: #64748b; font-size: 13px; margin-top: 2px;">${title} | <span style="font-weight: 600; color: #1e40af;">${company}</span></div>
        <div style="margin-top: 6px; font-size: 13px;">
          <span style="margin-right: 12px;">🌐 <a href="${cleanUrl}" target="_blank" style="color: #2563eb; text-decoration: none;">${website}</a></span>
          <span>📧 <a href="mailto:${sender.email}" style="color: #2563eb; text-decoration: none;">${sender.email}</a></span>
          ${phone ? `<span style="margin-left: 12px; color: #475569;">📞 ${phone}</span>` : ''}
        </div>
      </td>
    </tr>
  </table>
</div>`.trim();

    const defaultText = `Best regards,\n\n${senderName}\n${title} | ${company}\n🌐 ${website}\n📧 ${sender.email}${phone ? `\n📞 ${phone}` : ''}`;

    setSignatureHtml(defaultHtml);
    setSignatureText(defaultText);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch(`/senders/${sender.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          displayName,
          senderName,
          title,
          company,
          website,
          phone,
          signatureLogoUrl,
          signatureHtml,
          signatureText,
        }),
      });
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white">Sender Profile & Signature Customizer</h3>
            <p className="text-xs text-slate-400">
              Signatures are individual per sender and match <strong className="text-white">{sender.email}</strong>.
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
          {/* Sender attributes grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="block text-slate-400 mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Sender Name (Greeting)</label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Company</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Website</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
            <div className="col-span-2 sm:col-span-3">
              <label className="block text-slate-400 mb-1">Signature Logo URL (Optional)</label>
              <input
                type="url"
                placeholder="https://example.com/logo.png"
                value={signatureLogoUrl}
                onChange={(e) => setSignatureLogoUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-[11px]"
              />
            </div>
          </div>

          {/* Signature Editor Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1 rounded-lg flex items-center font-semibold ${
                    activeTab === 'preview' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 mr-1" /> Live Preview
                </button>
                <button
                  onClick={() => setActiveTab('html')}
                  className={`px-3 py-1 rounded-lg flex items-center font-semibold ${
                    activeTab === 'html' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Code className="w-3.5 h-3.5 mr-1" /> HTML Code
                </button>
                <button
                  onClick={() => setActiveTab('text')}
                  className={`px-3 py-1 rounded-lg flex items-center font-semibold ${
                    activeTab === 'text' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 mr-1" /> Plain Text Fallback
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-xs text-slate-400 hover:text-blue-400 flex items-center"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reset to Template Default
              </button>
            </div>

            {activeTab === 'preview' && (
              <div className="p-4 bg-white text-slate-900 rounded-xl border border-slate-300 min-h-[140px]">
                <div dangerouslySetInnerHTML={{ __html: signatureHtml }} />
              </div>
            )}

            {activeTab === 'html' && (
              <textarea
                rows={6}
                value={signatureHtml}
                onChange={(e) => setSignatureHtml(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 font-mono text-[11px] text-white focus:outline-none"
              />
            )}

            {activeTab === 'text' && (
              <textarea
                rows={6}
                value={signatureText}
                onChange={(e) => setSignatureText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 font-mono text-[11px] text-white focus:outline-none"
              />
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={handleSave}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center"
          >
            {saving ? 'Saving...' : 'Save Signature & Profile'}
            <Check className="w-3.5 h-3.5 ml-1.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
