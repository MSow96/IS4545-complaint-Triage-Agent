import { ComplaintRecord } from '../types/triage';

export const SAMPLE_COMPLAINTS: ComplaintRecord[] = [
  {
    id: 'GRV-2026-0811',
    dateReceived: '2026-10-18',
    sourceChannel: 'Grievance Report',
    patientRef: 'PT-94021 (Inpatient Surgical)',
    departmentTag: 'Post-Surgical 4 West',
    rawText:
      'My mother was discharged yesterday after knee replacement surgery without any insulin dosing instructions or follow-up prescriptions sent to the pharmacy. When we called the floor, the nurse said "it was on the paper" but the discharge envelope was empty. By midnight her blood glucose reached 380 mg/dL and we had to call 911 for emergency paramedic stabilization.',
    status: 'pending',
  },
  {
    id: 'PORTAL-2026-4029',
    dateReceived: '2026-10-19',
    sourceChannel: 'Patient Portal Message',
    patientRef: 'PT-18302 (Ambulatory Clinic)',
    departmentTag: 'OB/GYN Outpatient',
    rawText:
      'I requested a Spanish medical interpreter 3 times prior to my ultrasound and colposcopy exam. When I arrived, the receptionist laughed and told me "we speak English here, find someone to translate on your phone". The physician proceeded with an invasive procedure without ensuring I gave informed consent in my language. I felt completely violated, humiliated, and discriminated against because of my race and native language.',
    status: 'pending',
  },
  {
    id: 'SURV-2026-1934',
    dateReceived: '2026-10-17',
    sourceChannel: 'Press Ganey Survey',
    patientRef: 'PT-77194 (Cardiology Outpatient)',
    departmentTag: 'Heart & Vascular Clinic',
    rawText:
      'Waited 75 minutes in the exam room past my 10:00 AM scheduled appointment with no explanation or check-in from the front desk staff. The physician spent barely 5 minutes rushing through my pacemaker check. When I asked about palpitations, he said he was behind schedule and walked out.',
    status: 'pending',
  },
  {
    id: 'REV-2026-3391',
    dateReceived: '2026-10-18',
    sourceChannel: 'Online Review / Google',
    patientRef: 'Anonymous Reviewer',
    departmentTag: 'Emergency Department',
    rawText:
      'I was handed another patient’s printed pathology report and HIV screening results along with my discharge packet! The packet had Johnathan Doe’s full name, date of birth, home address, and diagnosis. This is an outrageous HIPAA violation and gross breach of patient confidentiality. I demand an explanation or I will be filing an OCR complaint.',
    status: 'pending',
  },
  {
    id: 'BILL-2026-5520',
    dateReceived: '2026-10-16',
    sourceChannel: 'Billing Dispute Form',
    patientRef: 'PT-31094 (Radiology)',
    departmentTag: 'Revenue Cycle',
    rawText:
      'I was given a written Good Faith Estimate of $280 for my knee MRI. Six weeks later, I received an unexpected bill for $2,450 including an out-of-network radiologist reading fee that was never disclosed to me. When I called billing, the representative was hostile and threatened to send my account to collections within 15 days.',
    status: 'pending',
  },
  {
    id: 'TECH-2026-2201',
    dateReceived: '2026-10-19',
    sourceChannel: 'Patient Portal Feedback',
    patientRef: 'PT-55612 (Primary Care)',
    departmentTag: 'Digital Health / IT',
    rawText:
      'The patient portal mobile app has been showing "502 Bad Gateway" for the last 3 days every time I try to refill my blood pressure medication or send a note to Dr. Henderson. The web version resets password every login.',
    status: 'pending',
  },
  {
    id: 'GRV-2026-0944',
    dateReceived: '2026-10-18',
    sourceChannel: 'Inpatient Grievance',
    patientRef: 'PT-66810 (Pediatric Unit)',
    departmentTag: 'Pediatrics 3 East',
    rawText:
      'My 6-year-old child was scheduled for amoxicillin at 08:00 AM. A traveler nurse brought in a syringe labeled for the child in the adjacent bed (a cephalosporin, which my child has an alert bracelet for severe anaphylaxis). I stopped the nurse just before she pushed the IV line. The nurse seemed distracted and said she was working a 16-hour double shift.',
    status: 'pending',
  },
];
