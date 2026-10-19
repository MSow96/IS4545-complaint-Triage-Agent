import React, { useState } from 'react';
import {
  Search,
  Filter,
  Sparkles,
  Download,
  Trash2,
  ChevronRight,
  Flame,
  AlertTriangle,
  Clock,
  UserCheck,
  Building,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import type {
  ComplaintCategory,
  ComplaintRecord,
  HumanReviewStatus,
  SeverityLevel,
} from '../types/triage';
import {
  COMPLAINT_CATEGORIES,
  convertComplaintsToCSV,
} from '../utils/triageRules';

interface ComplaintTableProps {
  records: ComplaintRecord[];
  onSelectRecord: (record: ComplaintRecord) => void;
  onTriageSingle: (recordId: string) => void;
  onTriageBatch: () => void;
  onDeleteRecord: (recordId: string) => void;
  onClearAll: () => void;
  isBatchTriaging: boolean;
  batchProgress: { current: number; total: number };
}

export const ComplaintTable: React.FC<ComplaintTableProps> = ({
  records,
  onSelectRecord,
  onTriageSingle,
  onTriageBatch,
  onDeleteRecord,
  onClearAll,
  isBatchTriaging,
  batchProgress,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [humanReviewFilter, setHumanReviewFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter records
  const filteredRecords = records.filter((r) => {
    // Search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchText = r.rawText.toLowerCase().includes(q);
      const matchId = r.id.toLowerCase().includes(q);
      const matchChannel = r.sourceChannel.toLowerCase().includes(q);
      const matchPatient = (r.patientRef || '').toLowerCase().includes(q);
      const matchCat = (r.triage?.complaintCategory || '').toLowerCase().includes(q);
      if (!matchText && !matchId && !matchChannel && !matchPatient && !matchCat) {
        return false;
      }
    }

    // Severity
    if (severityFilter !== 'all') {
      if (!r.triage || String(r.triage.severityLevel) !== severityFilter) {
        return false;
      }
    }

    // Human Review Status
    if (humanReviewFilter !== 'all') {
      if (!r.triage || r.triage.humanReviewStatus !== humanReviewFilter) {
        return false;
      }
    }

    // Category
    if (categoryFilter !== 'all') {
      if (!r.triage || r.triage.complaintCategory !== categoryFilter) {
        return false;
      }
    }

    // Status
    if (statusFilter !== 'all') {
      if (r.status !== statusFilter) {
        return false;
      }
    }

    return true;
  });

  const pendingCount = records.filter((r) => r.status === 'pending').length;

  const handleExportCSV = () => {
    const csv = convertComplaintsToCSV(records);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Healthcare_Triage_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSeverityBadge = (level?: SeverityLevel, label?: string) => {
    if (!level) return <span className="text-xs text-slate-500 font-mono">-</span>;
    switch (level) {
      case 4:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <Flame className="w-3 h-3 text-rose-400" />
            L4 Critical
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            L3 High
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            L2 Moderate
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            L1 Low
          </span>
        );
    }
  };

  const getHumanReviewBadge = (status?: HumanReviewStatus) => {
    if (!status) return null;
    switch (status) {
      case 'Human Review Required':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <UserCheck className="w-3 h-3" />
            Human Required
          </span>
        );
      case 'Human Review Recommended':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
            Recommended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-normal bg-slate-800 text-slate-400 border border-slate-700">
            AI Review Only
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Control Bar */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/80 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by text, ID, patient, category, or source..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-800/90 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onTriageBatch}
              disabled={isBatchTriaging || pendingCount === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white shadow-xs transition"
            >
              {isBatchTriaging ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    Triaging ({batchProgress.current}/{batchProgress.total})...
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Triage All Pending ({pendingCount})</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportCSV}
              disabled={records.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {records.length > 0 && (
              <button
                onClick={onClearAll}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                title="Clear queue"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Severity */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300 focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">Severity: All</option>
            <option value="4">Level 4 - Critical</option>
            <option value="3">Level 3 - High</option>
            <option value="2">Level 2 - Moderate</option>
            <option value="1">Level 1 - Low</option>
          </select>

          {/* Human Review */}
          <select
            value={humanReviewFilter}
            onChange={(e) => setHumanReviewFilter(e.target.value)}
            className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300 focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">Human Review: All</option>
            <option value="Human Review Required">Human Review Required</option>
            <option value="Human Review Recommended">Human Review Recommended</option>
            <option value="AI Review Only">AI Review Only</option>
          </select>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300 focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">Category: All</option>
            {COMPLAINT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Triage Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300 focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">Status: All</option>
            <option value="triaged">Triaged</option>
            <option value="pending">Pending</option>
          </select>

          {(severityFilter !== 'all' ||
            humanReviewFilter !== 'all' ||
            categoryFilter !== 'all' ||
            statusFilter !== 'all' ||
            searchTerm) && (
            <button
              onClick={() => {
                setSeverityFilter('all');
                setHumanReviewFilter('all');
                setCategoryFilter('all');
                setStatusFilter('all');
                setSearchTerm('');
              }}
              className="text-xs text-teal-400 hover:text-teal-300 ml-1 underline"
            >
              Reset Filters
            </button>
          )}

          <div className="ml-auto text-xs text-slate-400">
            Showing {filteredRecords.length} of {records.length} complaints
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Grievance & Channel</th>
              <th className="py-3 px-4">Narrative Snippet</th>
              <th className="py-3 px-4">Step 1: Category</th>
              <th className="py-3 px-4">Step 2: Severity</th>
              <th className="py-3 px-4">Step 3: Risks</th>
              <th className="py-3 px-4">Step 4: Route</th>
              <th className="py-3 px-4">Step 5: Review</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="max-w-sm mx-auto space-y-2">
                    <p className="text-sm font-medium text-slate-300">No complaints match your view</p>
                    <p className="text-xs text-slate-500">
                      Upload a CSV/Excel file, click "Load Clinical Cases", or enter a single grievance.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRecords.map((r) => {
                const t = r.triage;
                const activeRisks = t ? t.riskFlags.filter((rf) => rf.flagged) : [];

                return (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-800/40 transition cursor-pointer group"
                    onClick={() => onSelectRecord(r)}
                  >
                    {/* ID & Channel */}
                    <td className="py-3.5 px-4 font-mono font-medium text-white whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{r.id}</span>
                        {r.humanSignOff?.signedOff && (
                          <span title="Human Reviewer Signed Off">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                        {r.sourceChannel}
                      </div>
                    </td>

                    {/* Complaint Text */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="text-slate-200 line-clamp-2 leading-relaxed font-sans">
                        {r.rawText}
                      </p>
                    </td>

                    {/* Step 1: Category */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {t ? (
                        <div>
                          <div className="font-semibold text-slate-200">
                            {t.complaintCategory}
                          </div>
                          {t.secondaryCategories.length > 0 && (
                            <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                              + {t.secondaryCategories.join(', ')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Unprocessed</span>
                      )}
                    </td>

                    {/* Step 2: Severity */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {t ? (
                        getSeverityBadge(t.severityLevel, t.severityLabel)
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Step 3: Risk Flags */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {t ? (
                        activeRisks.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-bold text-rose-300">
                              {activeRisks.length} Risk{activeRisks.length > 1 ? 's' : ''}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[130px]">
                              {activeRisks.map((x) => x.type.replace(' Risk', '')).join(', ')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500">None</span>
                        )
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    {/* Step 4: Route */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {t ? (
                        <div>
                          <div className="text-slate-200 font-medium truncate max-w-[140px]">
                            {t.recommendedDepartment}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-amber-400 mt-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{t.escalationPriority}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    {/* Step 5: Human Review */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {t ? (
                        getHumanReviewBadge(t.humanReviewStatus)
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td
                      className="py-3.5 px-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        {!t && (
                          <button
                            onClick={() => onTriageSingle(r.id)}
                            className="px-2.5 py-1 rounded bg-teal-600/80 hover:bg-teal-600 text-white text-[11px] font-medium transition"
                            title="Run 6-Step Triage"
                          >
                            Triage
                          </button>
                        )}

                        <button
                          onClick={() => onSelectRecord(r)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-slate-800 transition"
                          title="View 6-Step Dossier"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onDeleteRecord(r.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                          title="Delete Complaint"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
