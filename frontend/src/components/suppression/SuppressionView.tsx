import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Plus,
  Upload,
  Search,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  X,
  ShieldCheck,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { SuppressionEntryDto, SuppressionReason } from '@rankrise/shared';

export default function SuppressionView() {
  const [entries, setEntries] = useState<SuppressionEntryDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addReason, setAddReason] = useState<SuppressionReason>(SuppressionReason.MANUAL_BLOCK);
  const [addNotes, setAddNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Import CSV modal state
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search.trim()) params.append('search', search.trim());
      if (reasonFilter) params.append('reason', reasonFilter);

      const res = await apiFetch<{ entries: SuppressionEntryDto[]; total: number; totalPages: number }>(
        `/suppression?${params.toString()}`
      );
      setEntries(res.entries || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load suppression list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [page, reasonFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEntries();
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmail.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await apiFetch('/suppression', {
        method: 'POST',
        body: JSON.stringify({
          email: addEmail.trim(),
          reason: addReason,
          notes: addNotes.trim() || undefined,
        }),
      });
      setSuccess(`Added "${addEmail.trim()}" to suppression list.`);
      setIsAddModalOpen(false);
      setAddEmail('');
      setAddNotes('');
      fetchEntries();
    } catch (err: any) {
      setError(err.message || 'Failed to add suppression entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to remove "${email}" from the suppression list?`)) return;

    try {
      await apiFetch(`/suppression/${id}`, { method: 'DELETE' });
      setSuccess(`Removed "${email}" from suppression list.`);
      fetchEntries();
    } catch (err: any) {
      setError(err.message || 'Failed to remove entry');
    }
  };

  const handleCsvUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await apiFetch<{ importedCount: number; errors: any[] }>('/suppression/upload-csv', {
        method: 'POST',
        body: formData,
      });

      setSuccess(`Successfully imported ${res.importedCount} suppression entries.`);
      setIsCsvModalOpen(false);
      setSelectedFile(null);
      fetchEntries();
    } catch (err: any) {
      setError(err.message || 'Failed to upload suppression CSV');
    } finally {
      setIsUploading(false);
    }
  };

  const getReasonBadge = (reason: string) => {
    const colors: Record<string, string> = {
      UNSUBSCRIBED: 'bg-amber-50 text-amber-700 border-amber-200',
      BOUNCED: 'bg-rose-50 text-rose-700 border-rose-200',
      COMPLAINT: 'bg-red-50 text-red-800 border-red-200',
      MANUAL_SUPPRESSION: 'bg-blue-50 text-blue-700 border-blue-200',
      DO_NOT_CONTACT: 'bg-purple-50 text-purple-700 border-purple-200',
      INVALID_DOMAIN: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[reason] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
        {reason.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Suppression & Do-Not-Contact</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              {total} Blocked
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Global suppression list. Any email address or domain listed here will NEVER be contacted under any campaign.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchEntries}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            Add To Suppression
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-semibold">✕</button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-500 hover:text-emerald-700 font-semibold">✕</button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search email or domain (e.g., example.com or user@domain.com)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          />
        </form>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={reasonFilter}
            onChange={(e) => {
              setReasonFilter(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          >
            <option value="">All Reasons</option>
            <option value="UNSUBSCRIBED">Unsubscribed</option>
            <option value="BOUNCED">Bounced</option>
            <option value="COMPLAINT">Complaint / Spam Report</option>
            <option value="MANUAL_SUPPRESSION">Manual Suppression</option>
            <option value="DO_NOT_CONTACT">Do Not Contact (Executive)</option>
            <option value="INVALID_DOMAIN">Invalid Domain</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Target Email / Pattern</th>
                <th className="px-6 py-4">Reason</th>
                <th className="px-6 py-4">Notes</th>
                <th className="px-6 py-4">Added Date</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
                    Loading suppression entries...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No suppression records found</p>
                    <p className="text-xs text-slate-400 mt-1">All clean. Add emails or domains to protect your sender score.</p>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-slate-900 text-xs">
                      {entry.email}
                    </td>
                    <td className="px-6 py-4">
                      {getReasonBadge(entry.reason)}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                      {entry.notes || '—'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteEntry(entry.id, entry.email)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Remove from suppression"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
            <div>
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-100"
              >
                Previous
              </button>
              <button
                disabled={page * limit >= total}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-100"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Single Suppression Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-base">Add Email to Suppression List</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddEntry} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address or Domain Pattern *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., target@domain.com or @domain.com"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Suppression Reason *</label>
                <select
                  value={addReason}
                  onChange={(e) => setAddReason(e.target.value as SuppressionReason)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value={SuppressionReason.MANUAL_BLOCK}>Manual Block</option>
                  <option value={SuppressionReason.UNSUBSCRIBED}>Unsubscribed</option>
                  <option value={SuppressionReason.BOUNCE}>Bounced Email</option>
                  <option value={SuppressionReason.CUSTOMER_REQUEST}>Customer Request</option>
                  <option value={SuppressionReason.INVALID}>Invalid Email / Domain</option>
                  <option value={SuppressionReason.OTHER}>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Reason for blocking, client requested removal, etc."
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Add to List'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">Bulk Import Suppression CSV</h3>
              </div>
              <button onClick={() => setIsCsvModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCsvUpload} className="p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Upload a CSV containing emails to suppress. The file should have an <code>email</code> column (or single list of emails).
              </p>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50 hover:bg-blue-50/40"
              >
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">
                  {selectedFile ? selectedFile.name : 'Click to select CSV file'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Accepts .csv up to 10MB</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
                  className="hidden"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                >
                  {isUploading ? 'Importing...' : 'Upload & Process'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
