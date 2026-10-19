import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  Flame,
  AlertTriangle,
  Clock,
  Building,
  UserCheck,
  CheckCircle,
  FileText,
  Copy,
  Check,
  Printer,
  ChevronRight,
  Sparkles,
  Info,
} from 'lucide-react';
import type { ComplaintRecord, RecommendedDepartment, SeverityLevel } from '../types/triage';
import {
  RECOMMENDED_DEPARTMENTS,
  getSeverityLabel,
  getSlaWindow,
} from '../utils/triageRules';

interface ComplaintDossierModalProps {
  record: ComplaintRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSignOff: (
    recordId: string,
    signOffData: {
      signedOff: boolean;
      reviewerName?: string;
      reviewerRole?: string;
      clinicalNotes?: string;
      overrideDepartment?: RecommendedDepartment;
      overrideSeverity?: SeverityLevel;
    }
  ) => void;
  onReTriage?: (recordId: string) => void;
}

export const ComplaintDossierModal: React.FC<ComplaintDossierModalProps> = ({
  record,
  isOpen,
  onClose,
  onUpdateSignOff,
  onReTriage,
}) => {
  const [activeTab, setActiveTab] = useState<'dossier' | 'rawOutput' | 'humanSignOff'>('dossier');
  const [copied, setCopied] = useState(false);

  // Human sign-off form state
  const [reviewerName, setReviewerName] = useState(record?.humanSignOff?.reviewerName || '');
  const [reviewerRole, setReviewerRole] = useState(record?.humanSignOff?.reviewerRole || 'Clinical Triage Officer');
  const [clinicalNotes, setClinicalNotes] = useState(record?.humanSignOff?.clinicalNotes || '');
  const [overrideDept, setOverrideDept] = useState<RecommendedDepartment | ''>(
    record?.humanSignOff?.overrideDepartment || ''
  );
  const [overrideSev, setOverrideSev] = useState<SeverityLevel | ''>(
    record?.humanSignOff?.overrideSeverity || ''
  );
  const [isSignedOff, setIsSignedOff] = useState(Boolean(record?.humanSignOff?.signedOff));
  const [signOffSuccessMsg, setSignOffSuccessMsg] = useState(false);

  if (!isOpen || !record) return null;

  const t = record.triage;
  const sla = t ? getSlaWindow(t.escalationPriority) : null;

  const handleCopyFormatted = () => {
    if (!t) return;
    navigator.clipboard.writeText(t.formattedOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveSignOff = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSignOff(record.id, {
      signedOff: true,
      reviewerName: reviewerName.trim() || 'Staff Clinician',
      reviewerRole: reviewerRole.trim() || 'Clinical Reviewer',
      clinicalNotes: clinicalNotes.trim(),
      overrideDepartment: overrideDept ? (overrideDept as RecommendedDepartment) : undefined,
      overrideSeverity: overrideSev ? (Number(overrideSev) as SeverityLevel) : undefined,
    });
    setIsSignedOff(true);
    setSignOffSuccessMsg(true);
    setTimeout(() => setSignOffSuccessMsg(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  const getSeverityColor = (level: number) => {
    switch (level) {
      case 4:
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
          badge: 'bg-rose-600 text-white',
          border: 'border-rose-500/40',
        };
      case 3:
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          badge: 'bg-amber-600 text-white',
          border: 'border-amber-500/40',
        };
      case 2:
        return {
          bg: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
          badge: 'bg-blue-600 text-white',
          border: 'border-blue-500/40',
        };
      default:
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          badge: 'bg-emerald-600 text-white',
          border: 'border-emerald-500/40',
        };
    }
  };

  const sevColors = t ? getSeverityColor(t.severityLevel) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">
                  {record.id}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-xs text-slate-400">{record.sourceChannel}</span>
                {record.patientRef && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className="text-xs text-slate-300 font-medium">{record.patientRef}</span>
                  </>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Healthcare Grievance & Triage Dossier
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Print Dossier"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 border-b border-slate-800 bg-slate-900/50 shrink-0 text-xs">
          <button
            onClick={() => setActiveTab('dossier')}
            className={`py-3 px-3 font-medium border-b-2 transition ${
              activeTab === 'dossier'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            6-Step Triage Breakdown
          </button>
          <button
            onClick={() => setActiveTab('rawOutput')}
            className={`py-3 px-3 font-medium border-b-2 transition ${
              activeTab === 'rawOutput'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Formatted Output (Prompt Spec)
          </button>
          <button
            onClick={() => setActiveTab('humanSignOff')}
            className={`py-3 px-3 font-medium border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'humanSignOff'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Human Review Sign-Off</span>
            {isSignedOff && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Patient Complaint Raw Text Card */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1.5">
              <span>Original Patient Submission / Grievance Narrative</span>
              <span>Received: {record.dateReceived}</span>
            </div>
            <p className="text-sm text-slate-100 font-sans leading-relaxed whitespace-pre-wrap">
              "{record.rawText}"
            </p>
          </div>

          {!t ? (
            <div className="p-8 text-center text-slate-400">
              <Sparkles className="w-8 h-8 text-teal-400 mx-auto mb-2 animate-spin" />
              <p className="text-sm">Complaint pending triage. Click below to analyze.</p>
              {onReTriage && (
                <button
                  onClick={() => onReTriage(record.id)}
                  className="mt-4 px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-500"
                >
                  Run 6-Step AI Triage
                </button>
              )}
            </div>
          ) : activeTab === 'dossier' ? (
            /* TAB 1: 6-STEP DOSSIER BREAKDOWN */
            <div className="space-y-5">
              {/* Top Highlights Grid (Severity + Category + Department + Human Status) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* STEP 1 & 2: Category & Severity */}
                <div
                  className={`p-3.5 rounded-xl border ${sevColors?.bg} ${sevColors?.border}`}
                >
                  <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                    STEP 1 & 2: Category & Severity
                  </div>
                  <div className="text-lg font-bold text-white mt-1">
                    {t.complaintCategory}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${sevColors?.badge}`}
                    >
                      LEVEL {t.severityLevel} • {t.severityLabel}
                    </span>
                    {t.secondaryCategories.length > 0 && (
                      <span className="text-xs text-slate-300">
                        + {t.secondaryCategories.join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* STEP 4: Escalation Route */}
                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
                  <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-cyan-400" />
                    STEP 4: Recommended Route
                  </div>
                  <div className="text-base font-bold text-white mt-1">
                    {t.recommendedDepartment}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        t.escalationPriority === 'Immediate'
                          ? 'bg-red-600 text-white'
                          : t.escalationPriority === 'Priority'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {t.escalationPriority} Escalation
                    </span>
                    <span className="text-xs text-slate-400">{sla?.badge}</span>
                  </div>
                </div>

                {/* STEP 5: Human Review Requirement */}
                <div
                  className={`p-3.5 rounded-xl border ${
                    t.humanReviewStatus === 'Human Review Required'
                      ? 'bg-purple-950/40 border-purple-800/60 text-purple-300'
                      : t.humanReviewStatus === 'Human Review Recommended'
                      ? 'bg-blue-950/40 border-blue-800/60 text-blue-300'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300'
                  }`}
                >
                  <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                    STEP 5: Human Review Status
                  </div>
                  <div className="text-base font-bold text-white mt-1">
                    {t.humanReviewStatus}
                  </div>
                  <div className="text-xs text-slate-300 mt-2 line-clamp-2">
                    {t.humanReviewReason || 'Standard protocol verification.'}
                  </div>
                </div>
              </div>

              {/* STEP 2: Detailed Severity Justification */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-400 uppercase tracking-wider mb-1">
                  <span>STEP 2: Severity Justification</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {t.severityJustification}
                </p>
              </div>

              {/* STEP 3: Risk Detection Matrix */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                    STEP 3: Risk Detection Matrix (8 Dimensions)
                  </div>
                  <div className="text-xs text-slate-400">
                    {t.riskFlags.filter((r) => r.flagged).length} risk(s) flagged
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {t.riskFlags.map((risk) => (
                    <div
                      key={risk.type}
                      className={`p-2.5 rounded-lg border text-xs transition ${
                        risk.flagged
                          ? 'bg-rose-950/20 border-rose-500/40 text-slate-200'
                          : 'bg-slate-800/30 border-slate-700/40 text-slate-400 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`font-semibold ${
                            risk.flagged ? 'text-rose-400' : 'text-slate-400'
                          }`}
                        >
                          {risk.type}
                        </span>
                        {risk.flagged ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            FLAGGED
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">Unflagged</span>
                        )}
                      </div>
                      <p className="text-[11px] leading-snug">
                        {risk.explanation || 'No immediate indicator.'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* STEP 4: Escalation & SLA Protocol */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70">
                <div className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-2">
                  STEP 4: Escalation & Clinical SLA Protocol
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="space-y-1">
                    <div className="text-xs text-slate-400">Assigned Routing Target:</div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <Building className="w-4 h-4 text-cyan-400" />
                      {t.recommendedDepartment}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-slate-400">Response Window / SLA:</div>
                    <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      {sla?.timeframe}
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 6: Executive Summary */}
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    STEP 6: Executive Summary
                  </div>
                  <button
                    onClick={handleCopyFormatted}
                    className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                  {t.executiveSummary}
                </p>
              </div>
            </div>
          ) : activeTab === 'rawOutput' ? (
            /* TAB 2: EXACT PROMPT OUTPUT FORMAT */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Verbatim standardized 6-step prompt format
                </span>
                <button
                  onClick={handleCopyFormatted}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition shadow-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied to Clipboard' : 'Copy Full Output'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-teal-300 border border-slate-800 whitespace-pre-wrap leading-relaxed select-all">
                {t.formattedOutput}
              </pre>
            </div>
          ) : (
            /* TAB 3: HUMAN REVIEW SIGN-OFF & AUDIT */
            <form onSubmit={handleSaveSignOff} className="space-y-4">
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider mb-1">
                  <UserCheck className="w-4 h-4 text-purple-400" />
                  <span>Human-in-the-Loop Clinical Verification & Audit Sign-Off</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Healthcare regulatory standards require qualified human oversight for clinical,
                  privacy, equity, and safety grievances before final escalation or closure.
                </p>
              </div>

              {signOffSuccessMsg && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Human sign-off recorded successfully in compliance audit log!</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Reviewer Name
                  </label>
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="e.g. Dr. Eleanor Vance, MD / Sarah Chen, RN"
                    className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Role / Title
                  </label>
                  <input
                    type="text"
                    value={reviewerRole}
                    onChange={(e) => setReviewerRole(e.target.value)}
                    placeholder="e.g. Patient Safety Officer, Risk Manager"
                    className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Override Department Route (Optional)
                  </label>
                  <select
                    value={overrideDept}
                    onChange={(e) => setOverrideDept(e.target.value as RecommendedDepartment)}
                    className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="">Keep AI Recommendation ({t.recommendedDepartment})</option>
                    {RECOMMENDED_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Override Severity Level (Optional)
                  </label>
                  <select
                    value={overrideSev}
                    onChange={(e) => setOverrideSev(e.target.value ? (Number(e.target.value) as SeverityLevel) : '')}
                    className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="">
                      Keep AI Severity (Level {t.severityLevel} - {t.severityLabel})
                    </option>
                    <option value="1">Level 1 - Low</option>
                    <option value="2">Level 2 - Moderate</option>
                    <option value="3">Level 3 - High</option>
                    <option value="4">Level 4 - Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Clinical Triage Notes & Action Plan
                </label>
                <textarea
                  rows={3}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Document clinical investigation steps, direct patient contact details, or remediation actions taken..."
                  className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium shadow-sm transition"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{isSignedOff ? 'Update Clinical Sign-Off' : 'Confirm & Sign-Off Grievance'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 shrink-0 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400"></span>
            <span>Healthcare Triage Standard • HIPAA & JCAHO Aligned</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
