import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  checkMandatoryHumanReview,
  formatTriageOutput,
  getSeverityLabel,
  COMPLAINT_CATEGORIES,
  RECOMMENDED_DEPARTMENTS,
  RISK_FLAG_TYPES,
} from './src/utils/triageRules.ts';
import type {
  ComplaintCategory,
  EscalationPriority,
  HumanReviewStatus,
  IdentifiedRisk,
  RecommendedDepartment,
  RiskFlagType,
  SeverityLevel,
  TriageResult,
} from './src/types/triage.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const SYSTEM_INSTRUCTION = `You are an expert Healthcare Complaint Triage Assistant.
Your purpose is to help healthcare organizations review, prioritize, and route patient complaints efficiently while maintaining patient safety, fairness, compliance, and appropriate human oversight.
You will receive patient complaints, patient portal messages, survey comments, grievance reports, online reviews, or feedback submissions.
Your role is NOT to resolve complaints.
Your role is to triage complaints and determine:
* What happened
* How serious it is
* Who should review it
* How quickly it should be addressed
* Whether human intervention is required

For every complaint, complete the following 6 standardized steps:

STEP 1: Complaint Category
Classify into ONE primary category from:
- Communication
- Scheduling
- Wait Time
- Technology / Patient Portal
- Billing
- Clinical Care
- Discharge and Follow-Up
- Accessibility and Equity
- Patient Safety
- Privacy or Security
- Staff Conduct
- Other
If multiple categories are present, identify the primary category and list any secondary categories.

STEP 2: Severity Assessment
Assign a severity level:
- LEVEL 1 - Low: Minor inconvenience, routine dissatisfaction, general suggestion
- LEVEL 2 - Moderate: Repeated service failures, significant frustration, communication breakdown
- LEVEL 3 - High: Potential patient harm, medication-related concern, serious accessibility issue, escalated complaint
- LEVEL 4 - Critical: Immediate patient safety risk, potential legal exposure, serious privacy violation, discrimination allegation
Provide clear clinical/operational reasoning for the assigned severity.

STEP 3: Risk Detection
Identify applicable risks from:
- Patient Safety Risk
- Clinical Risk
- Compliance Risk
- Privacy Risk
- Accessibility Risk
- Equity Risk
- Reputational Risk
- Operational Risk
For each risk, specify whether it is flagged (true/false) and explain why it was flagged.

STEP 4: Escalation Recommendation
ROUTE TO:
- Patient Experience Team
- Nursing Leadership
- Physician Leadership
- Quality Improvement Team
- Compliance Office
- Information Technology
- Revenue Cycle / Billing
- Accessibility Coordinator
- Risk Management
- Executive Review

Indicate whether escalation is:
- Routine
- Priority
- Immediate

STEP 5: Human Review Requirement
Determine whether:
- AI Review Only
- Human Review Recommended
- Human Review Required

CRITICAL SAFETY DIRECTIVE: "Human Review Required" MUST be selected whenever:
* Patient safety concerns exist
* Discrimination is alleged
* Privacy concerns exist
* Legal or compliance risks are present
* The complaint is ambiguous and requires investigation
* Level 4 Critical severity is assigned

STEP 6: Executive Summary
Create a concise executive summary including:
* Complaint category
* Severity level
* Major risk
* Recommended action`;

// Response schema for Gemini 3.8 Flash
const TRIAGE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    complaintCategory: {
      type: Type.STRING,
      description: 'The single primary complaint category.',
    },
    secondaryCategories: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Zero or more secondary categories if multiple issues exist.',
    },
    severityLevel: {
      type: Type.INTEGER,
      description: 'Severity level integer from 1 (Low) to 4 (Critical).',
    },
    severityJustification: {
      type: Type.STRING,
      description: 'Clinical or operational reasoning for assigned severity.',
    },
    riskFlags: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          flagged: { type: Type.BOOLEAN },
          explanation: { type: Type.STRING },
        },
        required: ['type', 'flagged', 'explanation'],
      },
      description: 'List of all 8 risk types with flagged status and reasoning.',
    },
    recommendedDepartment: {
      type: Type.STRING,
      description: 'The exact healthcare department to route this complaint to.',
    },
    escalationPriority: {
      type: Type.STRING,
      description: 'One of: Routine, Priority, Immediate.',
    },
    humanReviewStatus: {
      type: Type.STRING,
      description: 'One of: AI Review Only, Human Review Recommended, Human Review Required.',
    },
    humanReviewReason: {
      type: Type.STRING,
      description: 'Detailed explanation for the human review recommendation.',
    },
    executiveSummary: {
      type: Type.STRING,
      description: 'Concise executive summary covering category, severity, major risk, recommended action.',
    },
  },
  required: [
    'complaintCategory',
    'secondaryCategories',
    'severityLevel',
    'severityJustification',
    'riskFlags',
    'recommendedDepartment',
    'escalationPriority',
    'humanReviewStatus',
    'humanReviewReason',
    'executiveSummary',
  ],
};

/**
 * Intelligent deterministic fallback triage when Gemini API key is missing or offline
 */
function heuristicFallbackTriage(complaintText: string): Omit<TriageResult, 'formattedOutput'> {
  const lower = complaintText.toLowerCase();

  let category: ComplaintCategory = 'Communication';
  const secondary: ComplaintCategory[] = [];
  let severity: SeverityLevel = 1;
  let severityReason = 'Routine patient feedback or service inconvenience.';
  const riskFlags: IdentifiedRisk[] = RISK_FLAG_TYPES.map((type) => ({
    type,
    flagged: false,
    explanation: 'No immediate trigger detected.',
  }));
  let department: RecommendedDepartment = 'Patient Experience Team';
  let priority: EscalationPriority = 'Routine';
  let humanStatus: HumanReviewStatus = 'AI Review Only';
  let humanReason = 'Standard operational feedback without clinical or safety risk.';

  // Check Privacy
  if (lower.includes('hipaa') || lower.includes('confidential') || lower.includes('privacy') || lower.includes('another patient')) {
    category = 'Privacy or Security';
    severity = 4;
    severityReason = 'Potential HIPAA breach or disclosure of unauthorized protected health information (PHI).';
    const privRisk = riskFlags.find((r) => r.type === 'Privacy Risk');
    if (privRisk) {
      privRisk.flagged = true;
      privRisk.explanation = 'PHI or unauthorized disclosure reported.';
    }
    const compRisk = riskFlags.find((r) => r.type === 'Compliance Risk');
    if (compRisk) {
      compRisk.flagged = true;
      compRisk.explanation = 'Regulatory exposure under HIPAA Security & Privacy Rules.';
    }
    department = 'Compliance Office';
    priority = 'Immediate';
    humanStatus = 'Human Review Required';
    humanReason = 'Privacy breaches require mandatory compliance officer audit and root cause investigation.';
  }
  // Check Equity / Discrimination
  else if (lower.includes('discriminat') || lower.includes('racis') || lower.includes('interpreter') || lower.includes('spanish') || lower.includes('civil rights') || lower.includes('bias')) {
    category = 'Accessibility and Equity';
    secondary.push('Communication');
    severity = 4;
    severityReason = 'Allegation of discrimination, refusal of interpreter, or violation of Title VI / Section 1557 ACA.';
    const eqRisk = riskFlags.find((r) => r.type === 'Equity Risk');
    if (eqRisk) {
      eqRisk.flagged = true;
      eqRisk.explanation = 'Denial of language access or alleged bias during clinical encounter.';
    }
    const legRisk = riskFlags.find((r) => r.type === 'Compliance Risk');
    if (legRisk) {
      legRisk.flagged = true;
      legRisk.explanation = 'Legal risk under federal healthcare non-discrimination mandates.';
    }
    department = 'Risk Management';
    priority = 'Immediate';
    humanStatus = 'Human Review Required';
    humanReason = 'Civil rights or language access grievances mandate human patient advocate review.';
  }
  // Check Medication / Safety / Clinical Harm
  else if (lower.includes('anaphylaxis') || lower.includes('wrong medication') || lower.includes('syringe') || lower.includes('911') || lower.includes('emergency') || lower.includes('glucose') || lower.includes('overdose') || lower.includes('allergic')) {
    category = 'Patient Safety';
    secondary.push('Clinical Care');
    severity = lower.includes('anaphylaxis') || lower.includes('emergency') ? 4 : 3;
    severityReason = 'Near-miss or adverse clinical event involving medication safety or post-discharge stability.';
    const psRisk = riskFlags.find((r) => r.type === 'Patient Safety Risk');
    if (psRisk) {
      psRisk.flagged = true;
      psRisk.explanation = 'Near-miss medication error or severe physiological destabilization.';
    }
    const clinRisk = riskFlags.find((r) => r.type === 'Clinical Risk');
    if (clinRisk) {
      clinRisk.flagged = true;
      clinRisk.explanation = 'Potential harm from medication omission or near-administration of contraindicated drug.';
    }
    department = 'Nursing Leadership';
    priority = 'Immediate';
    humanStatus = 'Human Review Required';
    humanReason = 'Clinical safety near-miss requires incident report filing and clinical supervisor investigation.';
  }
  // Check Discharge
  else if (lower.includes('discharge') || lower.includes('insulin') || lower.includes('prescription')) {
    category = 'Discharge and Follow-Up';
    secondary.push('Clinical Care');
    severity = 3;
    severityReason = 'Inadequate discharge instructions and delayed pharmacotherapy.';
    const psRisk = riskFlags.find((r) => r.type === 'Patient Safety Risk');
    if (psRisk) {
      psRisk.flagged = true;
      psRisk.explanation = 'Discharge coordination failure impacting chronic disease management.';
    }
    department = 'Physician Leadership';
    priority = 'Priority';
    humanStatus = 'Human Review Required';
    humanReason = 'Discharge safety gap requires clinical follow-up with attending physician.';
  }
  // Check Billing
  else if (lower.includes('bill') || lower.includes('estimate') || lower.includes('cost') || lower.includes('insurance') || lower.includes('collections') || lower.includes('$')) {
    category = 'Billing';
    severity = 2;
    severityReason = 'Disputed charges, unexpected out-of-network balance billing, or collection threat.';
    const opRisk = riskFlags.find((r) => r.type === 'Operational Risk');
    if (opRisk) {
      opRisk.flagged = true;
      opRisk.explanation = 'Dispute under No Surprises Act or revenue cycle discrepancy.';
    }
    department = 'Revenue Cycle / Billing';
    priority = 'Routine';
    humanStatus = 'Human Review Recommended';
    humanReason = 'Billing dispute requires account ledger review and patient financial advocate contact.';
  }
  // Check Technology / Portal
  else if (lower.includes('portal') || lower.includes('gateway') || lower.includes('app') || lower.includes('login') || lower.includes('password') || lower.includes('website')) {
    category = 'Technology / Patient Portal';
    severity = 2;
    severityReason = 'Repeated system failure blocking digital care access or messaging.';
    const opRisk = riskFlags.find((r) => r.type === 'Operational Risk');
    if (opRisk) {
      opRisk.flagged = true;
      opRisk.explanation = 'Service disruption impacting patient portal reliability.';
    }
    department = 'Information Technology';
    priority = 'Routine';
    humanStatus = 'AI Review Only';
    humanReason = 'Technical issue routeable to IT ticket queue without immediate clinical harm.';
  }
  // Check Wait time / scheduling
  else if (lower.includes('wait') || lower.includes('hour') || lower.includes('delay') || lower.includes('schedule') || lower.includes('appointment')) {
    category = 'Wait Time';
    secondary.push('Communication');
    severity = lower.includes('rushing') || lower.includes('palpitations') ? 2 : 1;
    severityReason = 'Prolonged clinic wait and communication breakdown during outpatient visit.';
    const repRisk = riskFlags.find((r) => r.type === 'Reputational Risk');
    if (repRisk) {
      repRisk.flagged = true;
      repRisk.explanation = 'Dissatisfaction impacts patient retention and survey ratings.';
    }
    department = 'Patient Experience Team';
    priority = 'Routine';
    humanStatus = 'Human Review Recommended';
    humanReason = 'Significant delay with communication gap warrants patient experience outreach.';
  }

  const executiveSummary = `Executive Summary: Complaint classified as ${category} at Severity Level ${severity} (${getSeverityLabel(severity)}). Major risk involves ${riskFlags.find((r) => r.flagged)?.type || 'Operational flow'}. Action: Route to ${department} with ${priority} escalation priority. Human review status: ${humanStatus}.`;

  return {
    complaintCategory: category,
    secondaryCategories: secondary,
    severityLevel: severity,
    severityLabel: getSeverityLabel(severity),
    severityJustification: severityReason,
    riskFlags,
    recommendedDepartment: department,
    escalationPriority: priority,
    humanReviewStatus: humanStatus,
    humanReviewReason: humanReason,
    executiveSummary,
  };
}

async function performTriage(rawText: string): Promise<TriageResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  let parsedResult: Omit<TriageResult, 'formattedOutput'>;

  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Please triage the following healthcare complaint thoroughly according to the 6-step protocol:\n\n"${rawText}"`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: TRIAGE_RESPONSE_SCHEMA,
          temperature: 0.1,
        },
      });

      const responseText = response.text?.trim() || '';
      const rawJson = JSON.parse(responseText);

      // Validate & normalize category
      const matchedCategory = COMPLAINT_CATEGORIES.find(
        (c) => c.toLowerCase() === (rawJson.complaintCategory || '').toLowerCase()
      ) || 'Other';

      // Validate & normalize secondary categories
      const secondaryCategories: ComplaintCategory[] = Array.isArray(rawJson.secondaryCategories)
        ? rawJson.secondaryCategories
            .map((sc: string) => COMPLAINT_CATEGORIES.find((c) => c.toLowerCase() === sc.toLowerCase()))
            .filter((c: ComplaintCategory | undefined): c is ComplaintCategory => !!c && c !== matchedCategory)
        : [];

      // Validate severity
      let severityLevel: SeverityLevel = 1;
      const parsedLevel = Number(rawJson.severityLevel);
      if ([1, 2, 3, 4].includes(parsedLevel)) {
        severityLevel = parsedLevel as SeverityLevel;
      }

      // Validate risk flags
      const riskFlags: IdentifiedRisk[] = RISK_FLAG_TYPES.map((riskType) => {
        const found = Array.isArray(rawJson.riskFlags)
          ? rawJson.riskFlags.find((r: { type?: string }) => (r.type || '').toLowerCase() === riskType.toLowerCase())
          : null;
        return {
          type: riskType,
          flagged: Boolean(found?.flagged),
          explanation: found?.explanation || (found?.flagged ? 'Risk condition detected.' : 'No immediate trigger.'),
        };
      });

      // Validate department
      const matchedDept = RECOMMENDED_DEPARTMENTS.find(
        (d) => d.toLowerCase() === (rawJson.recommendedDepartment || '').toLowerCase()
      ) || 'Patient Experience Team';

      // Validate escalation priority
      let escalationPriority: EscalationPriority = 'Routine';
      const normPriority = (rawJson.escalationPriority || '').toLowerCase();
      if (normPriority.includes('immediate')) escalationPriority = 'Immediate';
      else if (normPriority.includes('priority')) escalationPriority = 'Priority';

      // Validate human review status
      let humanReviewStatus: HumanReviewStatus = 'AI Review Only';
      const normHuman = (rawJson.humanReviewStatus || '').toLowerCase();
      if (normHuman.includes('required')) humanReviewStatus = 'Human Review Required';
      else if (normHuman.includes('recommended')) humanReviewStatus = 'Human Review Recommended';

      parsedResult = {
        complaintCategory: matchedCategory,
        secondaryCategories,
        severityLevel,
        severityLabel: getSeverityLabel(severityLevel),
        severityJustification: rawJson.severityJustification || 'Clinical assessment based on complaint details.',
        riskFlags,
        recommendedDepartment: matchedDept,
        escalationPriority,
        humanReviewStatus,
        humanReviewReason: rawJson.humanReviewReason || 'Standard protocol evaluation.',
        executiveSummary: rawJson.executiveSummary || 'Executive briefing summary.',
      };
    } catch (err) {
      console.warn('Gemini triage call failed, using heuristic clinical triage fallback:', err);
      parsedResult = heuristicFallbackTriage(rawText);
    }
  } else {
    parsedResult = heuristicFallbackTriage(rawText);
  }

  // Safety post-processing: enforce Step 5 mandatory human review rule
  const mandatoryCheck = checkMandatoryHumanReview(
    parsedResult.severityLevel,
    parsedResult.riskFlags,
    rawText
  );

  if (mandatoryCheck.required) {
    parsedResult.humanReviewStatus = 'Human Review Required';
    if (!parsedResult.humanReviewReason || !parsedResult.humanReviewReason.includes('Mandatory')) {
      parsedResult.humanReviewReason = mandatoryCheck.reason;
    }
  }

  // Generate standardized formatted output
  const formattedOutput = formatTriageOutput(parsedResult);

  return {
    ...parsedResult,
    formattedOutput,
  };
}

// Single complaint triage endpoint
app.post('/api/triage/single', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Complaint text is required.' });
      return;
    }

    const triage = await performTriage(text);
    res.json({ triage });
  } catch (error: unknown) {
    console.error('Error in /api/triage/single:', error);
    res.status(500).json({
      error: 'Failed to triage complaint.',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Batch triage endpoint (handles uploaded CSV/Excel records)
app.post('/api/triage/batch', async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'Expected items array.' });
      return;
    }

    // Process with concurrency limit of 3 to respect Gemini API rate limits
    const results: Array<{ id: string; triage?: TriageResult; error?: string }> = [];
    const poolSize = 3;

    for (let i = 0; i < items.length; i += poolSize) {
      const chunk = items.slice(i, i + poolSize);
      const chunkPromises = chunk.map(async (item: { id: string; rawText: string }) => {
        try {
          const triage = await performTriage(item.rawText);
          return { id: item.id, triage };
        } catch (err) {
          return {
            id: item.id,
            error: err instanceof Error ? err.message : 'Triage failed',
          };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    res.json({ results });
  } catch (error: unknown) {
    console.error('Error in /api/triage/batch:', error);
    res.status(500).json({
      error: 'Failed to process batch triage.',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    agent: 'Healthcare Complaint Triage Assistant',
    timestamp: new Date().toISOString(),
  });
});

// Vite or static production serving
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Healthcare Complaint Triage Agent running on port ${port}`);
});
