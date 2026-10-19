import type {
  ComplaintCategory,
  ComplaintRecord,
  EscalationPriority,
  HumanReviewStatus,
  IdentifiedRisk,
  RecommendedDepartment,
  RiskFlagType,
  SeverityLevel,
  SeverityLabel,
  TriageResult,
} from '../types/triage.ts';

export const COMPLAINT_CATEGORIES: ComplaintCategory[] = [
  'Communication',
  'Scheduling',
  'Wait Time',
  'Technology / Patient Portal',
  'Billing',
  'Clinical Care',
  'Discharge and Follow-Up',
  'Accessibility and Equity',
  'Patient Safety',
  'Privacy or Security',
  'Staff Conduct',
  'Other',
];

export const RISK_FLAG_TYPES: RiskFlagType[] = [
  'Patient Safety Risk',
  'Clinical Risk',
  'Compliance Risk',
  'Privacy Risk',
  'Accessibility Risk',
  'Equity Risk',
  'Reputational Risk',
  'Operational Risk',
];

export const RECOMMENDED_DEPARTMENTS: RecommendedDepartment[] = [
  'Patient Experience Team',
  'Nursing Leadership',
  'Physician Leadership',
  'Quality Improvement Team',
  'Compliance Office',
  'Information Technology',
  'Revenue Cycle / Billing',
  'Accessibility Coordinator',
  'Risk Management',
  'Executive Review',
];

export function getSeverityLabel(level: SeverityLevel): SeverityLabel {
  switch (level) {
    case 1:
      return 'Low';
    case 2:
      return 'Moderate';
    case 3:
      return 'High';
    case 4:
      return 'Critical';
    default:
      return 'Low';
  }
}

/**
 * STEP 5 Rule Enforcement:
 * Human Review Required should be selected whenever:
 * - Patient safety concerns exist
 * - Discrimination is alleged
 * - Privacy concerns exist
 * - Legal or compliance risks are present
 * - The complaint is ambiguous and requires investigation
 * - Level 4 Critical severity
 */
export function checkMandatoryHumanReview(
  severity: SeverityLevel,
  riskFlags: IdentifiedRisk[],
  rawText: string
): { required: boolean; reason: string } {
  const activeRisks = riskFlags.filter((r) => r.flagged);

  const hasPatientSafety = activeRisks.some(
    (r) => r.type === 'Patient Safety Risk'
  );
  if (hasPatientSafety) {
    return {
      required: true,
      reason: 'Mandatory Human Review: Patient safety concerns identified.',
    };
  }

  const hasPrivacy = activeRisks.some((r) => r.type === 'Privacy Risk');
  if (hasPrivacy) {
    return {
      required: true,
      reason: 'Mandatory Human Review: Privacy or HIPAA compliance concerns flagged.',
    };
  }

  const hasCompliance = activeRisks.some((r) => r.type === 'Compliance Risk');
  if (hasCompliance) {
    return {
      required: true,
      reason: 'Mandatory Human Review: Regulatory, legal, or compliance exposure flagged.',
    };
  }

  const hasEquity = activeRisks.some((r) => r.type === 'Equity Risk');
  const lowerText = rawText.toLowerCase();
  const discriminationKeywords = [
    'discriminat',
    'racis',
    'bias',
    'prejudice',
    'sexist',
    'disability',
    'civil rights',
  ];
  const mentionsDiscrimination = discriminationKeywords.some((kw) =>
    lowerText.includes(kw)
  );

  if (hasEquity || mentionsDiscrimination) {
    return {
      required: true,
      reason: 'Mandatory Human Review: Potential discrimination or health equity allegation.',
    };
  }

  if (severity === 4) {
    return {
      required: true,
      reason: 'Mandatory Human Review: Level 4 Critical severity assignment.',
    };
  }

  // Check for ambiguity / potential harm
  const ambiguityKeywords = [
    'lawsuit',
    'attorney',
    'overdose',
    'wrong medication',
    'sepsis',
    'fell out of bed',
  ];
  const matchedAmbiguous = ambiguityKeywords.find((kw) => lowerText.includes(kw));
  if (matchedAmbiguous) {
    return {
      required: true,
      reason: `Mandatory Human Review: High-risk grievance trigger detected ("${matchedAmbiguous}").`,
    };
  }

  return { required: false, reason: '' };
}

/**
 * Builds the exact string format required by the prompt instructions:
 * 
 * OUTPUT FORMAT
 * Complaint Category:
 * Secondary Categories:
 * Severity Level:
 * Severity Justification:
 * Risk Flags:
 * Recommended Department:
 * Escalation Priority:
 * Human Review Status:
 * Executive Summary:
 */
export function formatTriageOutput(triage: Omit<TriageResult, 'formattedOutput'>): string {
  const secondary =
    triage.secondaryCategories && triage.secondaryCategories.length > 0
      ? triage.secondaryCategories.join(', ')
      : 'None';

  const activeRisks = triage.riskFlags.filter((r) => r.flagged);
  const riskFlagsString =
    activeRisks.length > 0
      ? activeRisks.map((r) => `${r.type} (${r.explanation})`).join('; ')
      : 'None detected';

  return `Complaint Category: ${triage.complaintCategory}
Secondary Categories: ${secondary}
Severity Level: Level ${triage.severityLevel} - ${triage.severityLabel}
Severity Justification: ${triage.severityJustification}
Risk Flags: ${riskFlagsString}
Recommended Department: ${triage.recommendedDepartment}
Escalation Priority: ${triage.escalationPriority}
Human Review Status: ${triage.humanReviewStatus}${triage.humanReviewReason ? ` (${triage.humanReviewReason})` : ''}
Executive Summary:
${triage.executiveSummary}`;
}

export function getSlaWindow(priority: EscalationPriority): {
  badge: string;
  timeframe: string;
  hours: number;
} {
  switch (priority) {
    case 'Immediate':
      return {
        badge: 'Within 2 Hours',
        timeframe: 'Immediate executive/clinical response protocol (same-shift review)',
        hours: 2,
      };
    case 'Priority':
      return {
        badge: '24-48 Hours',
        timeframe: 'Priority department leadership review and initial patient contact',
        hours: 48,
      };
    case 'Routine':
      return {
        badge: '5-7 Days',
        timeframe: 'Standard patient grievance workflow and survey resolution cycle',
        hours: 168,
      };
  }
}

export function convertComplaintsToCSV(records: ComplaintRecord[]): string {
  const headers = [
    'ID',
    'Received Date',
    'Source Channel',
    'Complaint Text',
    'Triage Status',
    'Primary Category',
    'Secondary Categories',
    'Severity Level',
    'Severity Label',
    'Severity Justification',
    'Flagged Risks',
    'Recommended Department',
    'Escalation Priority',
    'Human Review Status',
    'Human Review Justification',
    'Executive Summary',
    'Human Sign-Off Status',
    'Reviewer Notes',
  ];

  const escapeCell = (val: unknown): string => {
    if (val === undefined || val === null) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = records.map((rec) => {
    const t = rec.triage;
    const flaggedRisks = t
      ? t.riskFlags
          .filter((r) => r.flagged)
          .map((r) => `${r.type}: ${r.explanation}`)
          .join(' | ')
      : '';

    return [
      escapeCell(rec.id),
      escapeCell(rec.dateReceived),
      escapeCell(rec.sourceChannel),
      escapeCell(rec.rawText),
      escapeCell(rec.status),
      escapeCell(t?.complaintCategory ?? ''),
      escapeCell(t?.secondaryCategories?.join(', ') ?? ''),
      escapeCell(t?.severityLevel ?? ''),
      escapeCell(t?.severityLabel ?? ''),
      escapeCell(t?.severityJustification ?? ''),
      escapeCell(flaggedRisks),
      escapeCell(t?.recommendedDepartment ?? ''),
      escapeCell(t?.escalationPriority ?? ''),
      escapeCell(t?.humanReviewStatus ?? ''),
      escapeCell(t?.humanReviewReason ?? ''),
      escapeCell(t?.executiveSummary ?? ''),
      escapeCell(rec.humanSignOff?.signedOff ? 'Signed Off' : 'Pending Review'),
      escapeCell(rec.humanSignOff?.clinicalNotes ?? ''),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
