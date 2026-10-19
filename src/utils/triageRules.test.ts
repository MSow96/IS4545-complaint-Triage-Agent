import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkMandatoryHumanReview,
  formatTriageOutput,
  getSeverityLabel,
  getSlaWindow,
  convertComplaintsToCSV,
} from './triageRules.ts';
import type { IdentifiedRisk, TriageResult, ComplaintRecord } from '../types/triage.ts';

test('getSeverityLabel returns correct human labels', () => {
  assert.equal(getSeverityLabel(1), 'Low');
  assert.equal(getSeverityLabel(2), 'Moderate');
  assert.equal(getSeverityLabel(3), 'High');
  assert.equal(getSeverityLabel(4), 'Critical');
});

test('checkMandatoryHumanReview triggers on Patient Safety Risk', () => {
  const risks: IdentifiedRisk[] = [
    { type: 'Patient Safety Risk', flagged: true, explanation: 'Allergic reaction ignored' },
    { type: 'Operational Risk', flagged: false, explanation: '' },
  ];
  const result = checkMandatoryHumanReview(3, risks, 'Nurse did not check allergy wristband');
  assert.equal(result.required, true);
  assert.match(result.reason, /Patient safety concerns/i);
});

test('checkMandatoryHumanReview triggers on Privacy Risk', () => {
  const risks: IdentifiedRisk[] = [
    { type: 'Privacy Risk', flagged: true, explanation: 'Medical chart given to wrong patient' },
  ];
  const result = checkMandatoryHumanReview(2, risks, 'Records mixed up');
  assert.equal(result.required, true);
  assert.match(result.reason, /Privacy or HIPAA/i);
});

test('checkMandatoryHumanReview triggers on discrimination allegation in text', () => {
  const risks: IdentifiedRisk[] = [];
  const result = checkMandatoryHumanReview(2, risks, 'The doctor showed racial bias and discrimination during my exam.');
  assert.equal(result.required, true);
  assert.match(result.reason, /discrimination/i);
});

test('checkMandatoryHumanReview triggers on Severity Level 4 Critical', () => {
  const risks: IdentifiedRisk[] = [];
  const result = checkMandatoryHumanReview(4, risks, 'Unconscious patient unattended');
  assert.equal(result.required, true);
  assert.match(result.reason, /Level 4 Critical/i);
});

test('checkMandatoryHumanReview allows AI Review Only for minor routine complaints', () => {
  const risks: IdentifiedRisk[] = [
    { type: 'Operational Risk', flagged: false, explanation: '' },
  ];
  const result = checkMandatoryHumanReview(1, risks, 'The waiting room coffee machine was broken.');
  assert.equal(result.required, false);
});

test('formatTriageOutput formats according to prompt specification', () => {
  const sampleTriage: Omit<TriageResult, 'formattedOutput'> = {
    complaintCategory: 'Clinical Care',
    secondaryCategories: ['Communication', 'Wait Time'],
    severityLevel: 3,
    severityLabel: 'High',
    severityJustification: 'Delayed medication administration caused acute respiratory distress.',
    riskFlags: [
      { type: 'Patient Safety Risk', flagged: true, explanation: 'Inhalation therapy delayed 3 hours' },
      { type: 'Clinical Risk', flagged: true, explanation: 'Oxygen desaturation observed' },
    ],
    recommendedDepartment: 'Nursing Leadership',
    escalationPriority: 'Priority',
    humanReviewStatus: 'Human Review Required',
    humanReviewReason: 'Patient safety risk flagged',
    executiveSummary: 'Clinical care failure involving 3-hour nebulizer delay requiring nursing leadership review.',
  };

  const output = formatTriageOutput(sampleTriage);

  assert.match(output, /Complaint Category: Clinical Care/);
  assert.match(output, /Secondary Categories: Communication, Wait Time/);
  assert.match(output, /Severity Level: Level 3 - High/);
  assert.match(output, /Severity Justification: Delayed medication administration/);
  assert.match(output, /Risk Flags: Patient Safety Risk \(Inhalation therapy delayed 3 hours\); Clinical Risk \(Oxygen desaturation observed\)/);
  assert.match(output, /Recommended Department: Nursing Leadership/);
  assert.match(output, /Escalation Priority: Priority/);
  assert.match(output, /Human Review Status: Human Review Required/);
  assert.match(output, /Executive Summary:\nClinical care failure involving/);
});

test('getSlaWindow returns appropriate SLA timeframe', () => {
  assert.equal(getSlaWindow('Immediate').hours, 2);
  assert.equal(getSlaWindow('Priority').hours, 48);
  assert.equal(getSlaWindow('Routine').hours, 168);
});

test('convertComplaintsToCSV creates valid CSV output', () => {
  const record: ComplaintRecord = {
    id: 'COMP-001',
    dateReceived: '2026-10-18',
    sourceChannel: 'Patient Portal',
    rawText: 'Doctor was 45 minutes late, no apology.',
    status: 'triaged',
    triage: {
      complaintCategory: 'Wait Time',
      secondaryCategories: ['Communication'],
      severityLevel: 2,
      severityLabel: 'Moderate',
      severityJustification: 'Significant delay with communication failure.',
      riskFlags: [{ type: 'Operational Risk', flagged: true, explanation: 'Clinic schedule backlog' }],
      recommendedDepartment: 'Patient Experience Team',
      escalationPriority: 'Routine',
      humanReviewStatus: 'Human Review Recommended',
      humanReviewReason: 'Communication breakdown',
      executiveSummary: 'Clinic delay without notification.',
      formattedOutput: '',
    },
  };

  const csv = convertComplaintsToCSV([record]);
  assert.match(csv, /COMP-001/);
  assert.match(csv, /Patient Experience Team/);
  assert.match(csv, /Moderate/);
});
