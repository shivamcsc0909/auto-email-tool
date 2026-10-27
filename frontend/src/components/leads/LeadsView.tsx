import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  Download,
  Trash2,
  Ban,
  Plus,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { LeadDto, LeadStatus } from '@rankrise/shared';

interface LeadsViewProps {
  onOpenImport: () => void;
}

export default function LeadsView({ onOpenImport }: LeadsViewProps) {
  const [leads, setLeads] = useState<LeadDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [countryFilter, setCountryFilter] = useState<string>('');

  // Selected lead IDs
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (countryFilter) params.append('country', countryFilter);

      const res = await apiFetch(`/leads?${params.toString()}`);
      setLeads(res.leads);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [page, statusFilter, countryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLeads();
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const updated = new Set(selectedIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedIds(updated);
  };

  const handleBulkSuppress = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Suppress ${selectedIds.size} selected leads? They will never be contacted.`)) return;

    try {
      await apiFetch('/leads/bulk-suppress', {
        method: 'POST',
        body: JSON.stringify({ leadIds: Array.from(selectedIds) }),
      });
      setSelectedIds(new Set());
      fetchLeads();
    } catch (err: any) {
      alert(err.message || 'Failed to suppress leads');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected leads? This cannot be undone.`)) return;

    try {
      await apiFetch('/leads/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ leadIds: Array.from(selectedIds) }),
      });
      setSelectedIds(new Set());
      fetchLeads();
    } catch (err: any) {
      alert(err.message || 'Failed to delete leads');
    }
  };

  const handleExportCsv = () => {
    window.location.href = '/api/leads/export/csv';
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">Leads Database</h3>
          <p className="text-xs text-slate-400">Total {total} contacts normalized and ready for outreach.</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 flex items-center transition-colors"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
          </button>
          <button
            onClick={onOpenImport}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Import Excel / CSV
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search email, company, domain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </form>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-700/80 text-xs rounded-xl p-2 text-slate-300 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="READY">READY</option>
            <option value="SENT">SENT</option>
            <option value="NEW">NEW</option>
            <option value="FAILED">FAILED</option>
            <option value="DO_NOT_CONTACT">DO_NOT_CONTACT</option>
          </select>

          <button
            onClick={fetchLeads}
            title="Refresh"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-950/60 border border-blue-800 p-3 rounded-xl flex items-center justify-between text-xs text-blue-200">
          <span>{selectedIds.size} leads selected</span>
          <div className="flex space-x-2">
            <button
              onClick={handleBulkSuppress}
              className="px-3 py-1 bg-amber-900/60 hover:bg-amber-800 text-amber-200 rounded-lg flex items-center"
            >
              <Ban className="w-3.5 h-3.5 mr-1" /> Suppress Selected
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1 bg-red-900/60 hover:bg-red-800 text-red-200 rounded-lg flex items-center"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Leads Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === leads.length}
                    onChange={toggleSelectAll}
                    className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                  />
                </th>
                <th className="p-3.5">Contact / Greeting</th>
                <th className="p-3.5">Company / Domain</th>
                <th className="p-3.5">Email</th>
                <th className="p-3.5">Country</th>
                <th className="p-3.5">Phone</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Last Contacted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">Loading leads...</td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">No leads found matching your filter criteria.</td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="p-3.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(lead.id)}
                        onChange={() => toggleSelectOne(lead.id)}
                        className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                      />
                    </td>
                    <td className="p-3.5 font-medium text-white">
                      {lead.firstName ? (
                        <span>{lead.firstName} {lead.lastName || ''}</span>
                      ) : (
                        <span className="text-slate-500 italic">Generic ("Hi there,")</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="text-white font-medium">{lead.companyName || '-'}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{lead.domain || lead.website || ''}</div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">{lead.email}</td>
                    <td className="p-3.5 text-slate-400">{lead.country || 'USA'}</td>
                    <td className="p-3.5 font-mono text-slate-400">{lead.phone || '-'}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                          lead.status === 'SENT'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                            : lead.status === 'READY'
                            ? 'bg-blue-950 text-blue-400 border border-blue-800/50'
                            : lead.status === 'DO_NOT_CONTACT'
                            ? 'bg-red-950 text-red-400 border border-red-800/50'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500 text-[11px]">
                      {lead.lastContactedAt ? new Date(lead.lastContactedAt).toLocaleDateString() : 'Never'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Page {page} of {totalPages} ({total} total leads)</span>
          <div className="flex space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
