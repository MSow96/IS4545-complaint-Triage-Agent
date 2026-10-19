import React from 'react';
import {
  AlertTriangle,
  Flame,
  UserCheck,
  Clock,
  CheckCircle2,
  Inbox,
} from 'lucide-react';
import type { ComplaintRecord } from '../types/triage';

interface MetricsBarProps {
  records: ComplaintRecord[];
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ records }) => {
  const total = records.length;
  const triaged = records.filter((r) => r.status === 'triaged');
  const pending = records.filter((r) => r.status === 'pending');

  const criticalCount = triaged.filter((r) => r.triage?.severityLevel === 4).length;
  const highCount = triaged.filter((r) => r.triage?.severityLevel === 3).length;
  const humanReviewReqCount = triaged.filter(
    (r) => r.triage?.humanReviewStatus === 'Human Review Required'
  ).length;
  const immediateEscalations = triaged.filter(
    (r) => r.triage?.escalationPriority === 'Immediate'
  ).length;

  const humanReviewPercent =
    triaged.length > 0
      ? Math.round((humanReviewReqCount / triaged.length) * 100)
      : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-6">
      {/* Total Complaints */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3.5 flex items-center gap-3 shadow-xs">
        <div className="w-10 h-10 rounded-lg bg-slate-700/60 text-slate-300 flex items-center justify-center shrink-0">
          <Inbox className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xl font-bold text-white tracking-tight">{total}</div>
          <div className="text-xs text-slate-400 font-medium truncate">Total Grievances</div>
        </div>
      </div>

      {/* Triaged Status */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3.5 flex items-center gap-3 shadow-xs">
        <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xl font-bold text-teal-400 tracking-tight">
            {triaged.length}
            <span className="text-xs text-slate-400 font-normal ml-1">/ {total}</span>
          </div>
          <div className="text-xs text-slate-400 font-medium truncate">
            {pending.length} Pending
          </div>
        </div>
      </div>

      {/* Level 4 Critical */}
      <div className="bg-rose-950/30 border border-rose-900/50 rounded-xl p-3.5 flex items-center gap-3 shadow-xs">
        <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
          <Flame className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xl font-bold text-rose-300 tracking-tight">{criticalCount}</div>
          <div className="text-xs text-rose-400/90 font-medium truncate">Level 4 Critical</div>
        </div>
      </div>

      {/* Level 3 High */}
      <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-3.5 flex items-center gap-3 shadow-xs">
        <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xl font-bold text-amber-300 tracking-tight">{highCount}</div>
          <div className="text-xs text-amber-400/90 font-medium truncate">Level 3 High</div>
        </div>
      </div>

      {/* Human Review Required */}
      <div className="bg-purple-950/30 border border-purple-900/50 rounded-xl p-3.5 flex items-center gap-3 shadow-xs">
        <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
          <UserCheck className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xl font-bold text-purple-300 tracking-tight">
            {humanReviewReqCount}
            <span className="text-xs text-purple-400/80 font-normal ml-1">({humanReviewPercent}%)</span>
          </div>
          <div className="text-xs text-purple-300/80 font-medium truncate">Human Review Req</div>
        </div>
      </div>

      {/* Immediate Escalations */}
      <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-3.5 flex items-center gap-3 shadow-xs">
        <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xl font-bold text-red-300 tracking-tight">{immediateEscalations}</div>
          <div className="text-xs text-red-400 font-medium truncate">Immediate SLA (2h)</div>
        </div>
      </div>
    </div>
  );
};
