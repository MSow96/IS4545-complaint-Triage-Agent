import React from 'react';
import {
  ShieldAlert,
  Upload,
  PlusCircle,
  FileSpreadsheet,
  Activity,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  onOpenUpload: () => void;
  onOpenNew: () => void;
  onLoadSamples: () => void;
  totalCount: number;
  triagedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenUpload,
  onOpenNew,
  onLoadSamples,
  totalCount,
  triagedCount,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-400 flex items-center justify-center shadow-lg shadow-cyan-900/30 ring-1 ring-cyan-300/30">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  AegisCare Triage
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Clinical Agent
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Healthcare Complaint & Grievance Prioritization • 6-Step Triage Protocol
              </p>
            </div>
          </div>

          {/* Quick Badges & Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Gemini 3.8 Flash</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <button
              onClick={onLoadSamples}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Load realistic clinical cases covering all severity levels"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
              <span>Load Clinical Cases</span>
            </button>

            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-cyan-700 hover:bg-cyan-600 text-white shadow-sm transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload CSV / Excel</span>
            </button>

            <button
              onClick={onOpenNew}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-teal-600 hover:bg-teal-500 text-white shadow-sm transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Single Complaint</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
