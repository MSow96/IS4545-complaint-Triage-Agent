export type ComplaintCategory =
  | 'Communication'
  | 'Scheduling'
  | 'Wait Time'
  | 'Technology / Patient Portal'
  | 'Billing'
  | 'Clinical Care'
  | 'Discharge and Follow-Up'
  | 'Accessibility and Equity'
  | 'Patient Safety'
  | 'Privacy or Security'
  | 'Staff Conduct'
  | 'Other';

export type SeverityLevel = 1 | 2 | 3 | 4;
export type SeverityLabel = 'Low' | 'Moderate' | 'High' | 'Critical';

export type RiskFlagType =
  | 'Patient Safety Risk'
  | 'Clinical Risk'
  | 'Compliance Risk'
  | 'Privacy Risk'
  | 'Accessibility Risk'
  | 'Equity Risk'
  | 'Reputational Risk'
  | 'Operational Risk';

export interface IdentifiedRisk {
  type: RiskFlagType;
  flagged: boolean;
  explanation: string;
}

export type RecommendedDepartment =
  | 'Patient Experience Team'
  | 'Nursing Leadership'
  | 'Physician Leadership'
  | 'Quality Improvement Team'
  | 'Compliance Office'
  | 'Information Technology'
  | 'Revenue Cycle / Billing'
  | 'Accessibility Coordinator'
  | 'Risk Management'
  | 'Executive Review';

export type EscalationPriority = 'Routine' | 'Priority' | 'Immediate';

export type HumanReviewStatus =
  | 'AI Review Only'
  | 'Human Review Recommended'
  | 'Human Review Required';

export interface TriageResult {
  complaintCategory: ComplaintCategory;
  secondaryCategories: ComplaintCategory[];
  severityLevel: SeverityLevel;
  severityLabel: SeverityLabel;
  severityJustification: string;
  riskFlags: IdentifiedRisk[];
  recommendedDepartment: RecommendedDepartment;
  escalationPriority: EscalationPriority;
  humanReviewStatus: HumanReviewStatus;
  humanReviewReason: string;
  executiveSummary: string;
  formattedOutput: string;
}

export interface HumanReviewSignOff {
  signedOff: boolean;
  reviewerName?: string;
  reviewerRole?: string;
  signedAt?: string;
  clinicalNotes?: string;
  overrideDepartment?: RecommendedDepartment;
  overrideSeverity?: SeverityLevel;
}

export interface ComplaintRecord {
  id: string;
  rawText: string;
  sourceChannel: string;
  patientRef?: string;
  departmentTag?: string;
  dateReceived: string;
  status: 'pending' | 'triaging' | 'triaged' | 'error';
  errorMessage?: string;
  triage?: TriageResult;
  humanSignOff?: HumanReviewSignOff;
}
