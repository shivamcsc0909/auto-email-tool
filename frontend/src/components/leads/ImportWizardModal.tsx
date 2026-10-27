import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  Ban,
  Copy,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { ColumnMappingConfig, ImportPreviewResult } from '@rankrise/shared';

interface ImportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportWizardModal({ isOpen, onClose, onSuccess }: ImportWizardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [leadSourceId, setLeadSourceId] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMappingConfig>({ email: '' });
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [committing, setCommitting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUploadAndDetect = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiFetch('/imports/upload', {
        method: 'POST',
        body: formData,
      });

      setLeadSourceId(res.leadSourceId);
      setHeaders(res.preview.headers);
      setMapping(res.defaultMapping);
      setPreview(res.preview);
      setStep(2); // Advance to column mapping & preview
    } catch (err: any) {
      setError(err.message || 'Failed to parse file');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateMapping = async (field: keyof ColumnMappingConfig, headerVal: string) => {
    const updated = { ...mapping, [field]: headerVal };
    setMapping(updated);

    // Recompute preview dynamically
    try {
      const res = await apiFetch('/imports/preview', {
        method: 'POST',
        body: JSON.stringify({
          leadSourceId,
          columnMapping: updated,
        }),
      });
      setPreview(res.preview);
    } catch (err: any) {
      console.warn('Preview recompute error:', err);
    }
  };

  const handleConfirmImport = async () => {
    setCommitting(true);
    setError(null);

    try {
      const res = await apiFetch('/imports/confirm', {
        method: 'POST',
        body: JSON.stringify({
          leadSourceId,
          columnMapping: mapping,
          skipDuplicates: true,
        }),
      });

      setImportResult(res);
      setStep(3); // Result summary
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white">Lead Import Wizard</h3>
            <p className="text-xs text-slate-400">
              Upload Excel (.xlsx, .xls) or CSV files with smart column normalization
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

        {/* STEP 1: Upload */}
        {step === 1 && (
          <div className="space-y-6 py-4 flex-1">
            <div className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-10 text-center flex flex-col items-center justify-center bg-slate-950/40 transition-colors">
              <FileSpreadsheet className="w-12 h-12 text-blue-500 mb-3" />
              <p className="text-sm font-semibold text-white mb-1">Select Excel (.xlsx, .xls) or CSV</p>
              <p className="text-xs text-slate-400 mb-4">Any column order is automatically detected.</p>

              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Browse Files
              </label>

              {file && (
                <div className="mt-4 flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-800/40">
                  <Check className="w-4 h-4" />
                  <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
              >
                Cancel
              </button>
              <button
                disabled={!file || uploading}
                onClick={handleUploadAndDetect}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center"
              >
                {uploading ? 'Analyzing Headers...' : 'Next: Map Columns'}
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Map & Preview */}
        {step === 2 && preview && (
          <div className="space-y-6 overflow-y-auto flex-1 pr-1">
            {/* Stats bar */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-xs text-slate-400">Total Rows</span>
                <p className="text-lg font-bold text-white">{preview.totalRows}</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-xs text-emerald-400">Valid Leads</span>
                <p className="text-lg font-bold text-emerald-400">{preview.validRowsCount}</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-xs text-amber-400">Duplicates</span>
                <p className="text-lg font-bold text-amber-400">{preview.duplicateRowsCount}</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-xs text-red-400">Invalid / Suppressed</span>
                <p className="text-lg font-bold text-red-400">{preview.invalidRowsCount}</p>
              </div>
            </div>

            {/* Column Mapping Grid */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Column Mapping (Detected Automatically)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Email <span className="text-red-400">*</span></label>
                  <select
                    value={mapping.email || ''}
                    onChange={(e) => handleUpdateMapping('email', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="">-- Select Header --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Website / Domain</label>
                  <select
                    value={mapping.website || ''}
                    onChange={(e) => handleUpdateMapping('website', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="">-- None --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Contact Name</label>
                  <select
                    value={mapping.name || ''}
                    onChange={(e) => handleUpdateMapping('name', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="">-- None (Derive from email) --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Company Name</label>
                  <select
                    value={mapping.company || ''}
                    onChange={(e) => handleUpdateMapping('company', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="">-- None (Derive from domain) --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Country</label>
                  <select
                    value={mapping.country || ''}
                    onChange={(e) => handleUpdateMapping('country', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="">-- Default (United States) --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Contact Phone</label>
                  <select
                    value={mapping.phone || ''}
                    onChange={(e) => handleUpdateMapping('phone', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="">-- None --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Row Preview Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Preview Sample Leads (First {preview.sampleRows.length} rows)
              </h4>
              <div className="border border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Row</th>
                      <th className="p-2.5">Email</th>
                      <th className="p-2.5">Greeting Identity</th>
                      <th className="p-2.5">Company / Domain</th>
                      <th className="p-2.5">Status Check</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {preview.sampleRows.slice(0, 10).map((r) => (
                      <tr key={r.rowNumber} className={!r.isValid ? 'bg-red-950/20' : ''}>
                        <td className="p-2.5 text-slate-500">#{r.rowNumber}</td>
                        <td className="p-2.5 font-semibold text-white">{r.normalized.email}</td>
                        <td className="p-2.5 text-blue-300">{r.normalized.firstName || 'Generic ("Hi there,")'}</td>
                        <td className="p-2.5 text-slate-400">{r.normalized.companyName || r.normalized.domain || '-'}</td>
                        <td className="p-2.5">
                          {r.isValid ? (
                            <span className="text-emerald-400 flex items-center">
                              <Check className="w-3 h-3 mr-1" /> Valid
                            </span>
                          ) : (
                            <span className="text-amber-400 flex items-center" title={r.validationErrors.join(', ')}>
                              <AlertTriangle className="w-3 h-3 mr-1" /> {r.validationErrors[0]}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium flex items-center"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back
              </button>
              <button
                disabled={committing || !mapping.email}
                onClick={handleConfirmImport}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center"
              >
                {committing ? 'Importing...' : `Confirm & Import ${preview.validRowsCount} Leads`}
                <Check className="w-3.5 h-3.5 ml-1.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Complete */}
        {step === 3 && (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white">Import Complete!</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Successfully imported <strong>{importResult?.importedCount || 0}</strong> verified leads into your outreach database.
              Duplicates ({importResult?.duplicateCount || 0}) were safely skipped.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
            >
              Close & View Leads
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
