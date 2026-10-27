import React from 'react';
import { ShieldCheck, Zap, AlertTriangle } from 'lucide-react';
import { APPLICATION_DAILY_SENDER_LIMIT } from '@rankrise/shared';

interface HeaderProps {
  title: string;
  sendMode?: string;
  onOpenImportModal?: () => void;
  onOpenCampaignModal?: () => void;
}

export default function Header({ title, sendMode = 'DRY_RUN', onOpenImportModal, onOpenCampaignModal }: HeaderProps) {
  const isDryRun = sendMode === 'DRY_RUN';

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur border-b border-slate-800 flex items-center justify-between px-8 z-10">
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
      </div>

      <div className="flex items-center space-x-4">
        {/* Safety Cap Indicator */}
        <div className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800 rounded-full border border-slate-700/60 text-xs text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>Safety Cap: <strong className="text-white">{APPLICATION_DAILY_SENDER_LIMIT}/day</strong></span>
        </div>

        {/* Send Mode Badge */}
        <div
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            isDryRun
              ? 'bg-amber-950/50 text-amber-300 border-amber-800/60'
              : 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60'
          }`}
        >
          {isDryRun ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>DRY_RUN (Simulated)</span>
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>LIVE SENDER</span>
            </>
          )}
        </div>

        {/* Quick Action Buttons */}
        {onOpenImportModal && (
          <button
            onClick={onOpenImportModal}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
          >
            + Import Leads
          </button>
        )}

        {onOpenCampaignModal && (
          <button
            onClick={onOpenCampaignModal}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            + Create Campaign
          </button>
        )}
      </div>
    </header>
  );
}
