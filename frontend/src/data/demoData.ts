/**
 * Clinical Demo Scenarios for Luminur PE Calculator
 * 
 * 13 Teaching Cases curated by Clinical Lead
 *
 * FDA 21st Century Cures Act Compliant:
 * - No AI predictions or probability scores
 * - Standard medical calculators only (Wells, PERC, 4PEPS, Shock Index, MSI)
 * - Factual data presentation
 *
 * Cases 1-5: "False Positive D-Dimer" (High D-Dimer, PE Unlikely due to confounders)
 * Cases 6-10: "Pre-Workup" (D-Dimer Pending)
 * Case 11: "Classic PE" (True Positive - Textbook Presentation)
 * Cases 12-13: "Equivocal PERC Fail" (Age-Driven & HR/Estrogen)
 */

import type { DemoScenario } from '../types/assessment';

// ===========================================================================
// Strict Types
// ===========================================================================

export interface Vitals {
  hr: number;
  sbp: number;
  dbp: number;
  rr: number;
  spo2: number;
  temp: number;
  o2Device?: string; // "Room Air", "2L NC", "NRB", etc.
}

export interface DDimer {
  value: number | null; // NULL = Pending/Not Resulted
  unit: string;
  timestamp?: string;
}

export interface PriorImaging {
  modality: 'CTPA' | 'VQ';
  date: string; // ISO date
  result: 'Positive' | 'Negative' | 'Indeterminate';
  reportSummary: string;
}

export interface Medication {
  name: string;
  category: 'Anticoagulant' | 'Cardiovascular' | 'Hormonal' | 'Psychiatric' | 'Respiratory' | 'Analgesic' | 'Antibiotic' | 'Chemotherapy' | 'Immunosuppressant' | 'Other';
  dose: string;
  lastRefill: string;
  daysSupply: number;
}

export interface TimelineEvent {
  date: string;
  type: 'Imaging' | 'Diagnosis' | 'Lab' | 'Medication' | 'Procedure';
  title: string;
  subtitle?: string;
  status?: 'Positive' | 'Negative' | 'Neutral';
}

export interface TeachingCase {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female';
  mrn: string;
  clinicalDescriptor: string;
  chiefComplaint: string;
  vitals: Vitals;
  ddimer: DDimer;
  wellsScore: number;
  wellsRisk: 'low' | 'moderate' | 'high';
  percScore: number;
  percNegative: boolean;
  creatinine: number;
  egfr: number;
  troponin: number | null;
  activeProblems: string[];
  relevantHistory: string[];
  physicalExam: string[];
  medications: Medication[];
  timeline: TimelineEvent[];
  priorImaging: PriorImaging | null;
  // 4PEPS specific fields
  hasChronicRespiratoryDisease: boolean;
  hasPriorVTE: boolean;
  priorPEDate?: string; // "MM/DD/YYYY" – date of prior PE if hasPriorVTE is true
  hasRecentSurgery: boolean; // < 4 weeks
  recentImmobilization?: { date: string; description: string }; // last 3 days
  priorThrombophilia?: boolean;
  usesEstrogen: boolean;
  hasContrastAllergy: boolean;
  bleedingRisk: 'low' | 'moderate' | 'high';
  totalRadiationExposureMSV?: number; // mSv accumulated last 4 weeks
}

// ===========================================================================
// 4PEPS Score Calculation (4-Level PE Probability Score)
// ===========================================================================

export interface FourPEPSResult {
  score: number;
  tier: 'Very Low' | 'Low' | 'Intermediate' | 'High';
  breakdown: string[];
}

export function calculate4PEPS(patient: TeachingCase): FourPEPSResult {
  let score = 0;
  const breakdown: string[] = [];
  
  // Age scoring
  if (patient.age < 50) {
    // 0 points
  } else if (patient.age >= 50 && patient.age < 65) {
    score += 1;
    breakdown.push(`Age ${patient.age} (50-64): +1`);
  } else {
    score += 2;
    breakdown.push(`Age ${patient.age} (≥65): +2`);
  }
  
  // Sex
  if (patient.gender === 'Male') {
    score += 2;
    breakdown.push('Male sex: +2');
  }
  
  // Heart Rate
  if (patient.vitals.hr >= 100) {
    score += 2;
    breakdown.push(`HR ${patient.vitals.hr} (≥100): +2`);
  } else if (patient.vitals.hr >= 80) {
    score += 1;
    breakdown.push(`HR ${patient.vitals.hr} (80-99): +1`);
  }
  
  // SpO2
  if (patient.vitals.spo2 < 95) {
    score += 2;
    breakdown.push(`SpO2 ${patient.vitals.spo2}% (<95%): +2`);
  }
  
  // Prior VTE
  if (patient.hasPriorVTE) {
    score += 2;
    breakdown.push('History of DVT/PE: +2');
  }
  
  // Recent Surgery
  if (patient.hasRecentSurgery) {
    score += 2;
    breakdown.push('Recent surgery (<4wks): +2');
  }
  
  // Estrogen Use
  if (patient.usesEstrogen) {
    score += 1;
    breakdown.push('Estrogen use: +1');
  }
  
  // Chronic Respiratory Disease (reduces suspicion, -1)
  if (patient.hasChronicRespiratoryDisease) {
    score -= 1;
    breakdown.push('Chronic respiratory disease: -1');
  }
  
  // Determine tier
  let tier: FourPEPSResult['tier'];
  if (score < 0) {
    tier = 'Very Low';
  } else if (score <= 5) {
    tier = 'Low';
  } else if (score <= 12) {
    tier = 'Intermediate';
  } else {
    tier = 'High';
  }
  
  return { score, tier, breakdown };
}

// ===========================================================================
// CASE 1-5: FALSE POSITIVE D-DIMER (High D-Dimer, PE Unlikely)
// ===========================================================================

const CASE_001_PNEUMONIA: TeachingCase = {
  id: 'case-1',
  name: 'Johnson, Robert',
  age: 62,
  gender: 'Male',
  mrn: 'MRN-7842391',
  clinicalDescriptor: 'Pneumonia with Elevated D-Dimer',
  chiefComplaint: 'Fever, productive cough, SOB',
  vitals: {
    hr: 102,
    sbp: 128,
    dbp: 78,
    rr: 24,
    spo2: 93,
    temp: 38.6,
    o2Device: '2L NC',
  },
  ddimer: { value: 1.85, unit: 'µg/mL', timestamp: '2026-01-27T14:30:00Z' },
  wellsScore: 1.5,
  wellsRisk: 'low',
  percScore: 2,
  percNegative: false,
  creatinine: 1.0,
  egfr: 78,
  troponin: 0.02,
  activeProblems: ['Lobar Pneumonia', 'Hypertension'],
  relevantHistory: [
    'Productive cough x 5 days',
    'Fever up to 39°C',
    'Prior PE 02/15/2023 — on Warfarin',
    'Recent immobilization (fall, broken hip 03/1/2026)',
  ],
  physicalExam: [
    'Febrile, tachypneic',
    'Decreased breath sounds RLL',
    'Crackles at right base',
    'No leg swelling',
  ],
  medications: [
    { name: 'Warfarin', category: 'Anticoagulant', dose: '5mg 2x/day', lastRefill: '2026-01-27', daysSupply: 30 },
    { name: 'Azithromycin', category: 'Antibiotic', dose: '500mg daily', lastRefill: '2026-01-27', daysSupply: 5 },
    { name: 'Lisinopril', category: 'Cardiovascular', dose: '10mg daily', lastRefill: '2026-01-10', daysSupply: 90 },
  ],
  timeline: [
    { date: '5 days ago', type: 'Diagnosis', title: 'Cough Onset', subtitle: 'Productive with yellow sputum' },
    { date: '2 days ago', type: 'Diagnosis', title: 'Fever Developed', subtitle: 'Up to 39°C' },
    { date: 'Today', type: 'Imaging', title: 'CXR', subtitle: 'RLL consolidation', status: 'Positive' },
  ],
  priorImaging: {
    modality: 'CTPA',
    date: '2024-02-15',
    result: 'Positive',
    reportSummary: 'Acute pulmonary embolism identified. Filling defect in the right lower lobe segmental artery. No evidence of right heart strain.',
  },
  hasChronicRespiratoryDisease: false,
  hasPriorVTE: true,
  priorPEDate: '02/15/2023',
  hasRecentSurgery: false,
  recentImmobilization: { date: '03/1/2026', description: 'Fall due to broken hip' },
  priorThrombophilia: false,
  usesEstrogen: false,
  hasContrastAllergy: false,
  bleedingRisk: 'low',
  totalRadiationExposureMSV: 120,
};

const CASE_002_MALIGNANCY: TeachingCase = {
  id: 'case-2',
  name: 'Williams, Patricia',
  age: 55,
  gender: 'Female',
  mrn: 'MRN-5291837',
  clinicalDescriptor: 'Metastatic Cancer with High Baseline',
  chiefComplaint: 'Mild chest discomfort during chemotherapy',
  vitals: {
    hr: 88,
    sbp: 118,
    dbp: 72,
    rr: 18,
    spo2: 97,
    temp: 36.9,
    o2Device: 'Room Air',
  },
  ddimer: { value: 3.20, unit: 'µg/mL', timestamp: '2026-01-27T15:45:00Z' },
  wellsScore: 1.0,
  wellsRisk: 'low',
  percScore: 1,
  percNegative: false,
  creatinine: 0.9,
  egfr: 82,
  troponin: 0.01,
  activeProblems: ['Metastatic Breast Cancer', 'Chemotherapy', 'Anemia'],
  relevantHistory: [
    'Metastatic breast cancer (stage IV)',
    'On chemotherapy (cycle 4 of 6)',
    'Prior D-Dimer 2.8 (2 months ago)',
    'No prior VTE',
  ],
  physicalExam: [
    'Cachectic appearance',
    'Port-a-cath in place',
    'Clear lung sounds',
    'No leg edema',
  ],
  medications: [
    { name: 'Paclitaxel', category: 'Chemotherapy', dose: 'Per protocol', lastRefill: '2026-01-25', daysSupply: 21 },
    { name: 'Ondansetron', category: 'Other', dose: '8mg PRN', lastRefill: '2026-01-25', daysSupply: 30 },
    { name: 'Dexamethasone', category: 'Other', dose: '4mg daily', lastRefill: '2026-01-25', daysSupply: 21 },
  ],
  timeline: [
    { date: '8 months ago', type: 'Diagnosis', title: 'Breast Cancer Dx', subtitle: 'Stage IV with bone mets' },
    { date: '2 months ago', type: 'Lab', title: 'Prior D-Dimer', subtitle: '2.8 µg/mL (baseline)', status: 'Neutral' },
    { date: '3 days ago', type: 'Procedure', title: 'Chemo Cycle 4', subtitle: 'Completed' },
  ],
  priorImaging: null,
  hasChronicRespiratoryDisease: false,
  hasPriorVTE: false,
  hasRecentSurgery: false,
  usesEstrogen: false,
  hasContrastAllergy: false,
  bleedingRisk: 'moderate', // Due to cancer
};

const CASE_003_PREGNANCY: TeachingCase = {
  id: 'case-3',
  name: 'Garcia, Maria',
  age: 29,
  gender: 'Female',
  mrn: 'MRN-9182736',
  clinicalDescriptor: 'Third Trimester Pregnancy',
  chiefComplaint: 'Bilateral leg swelling, mild SOB',
  vitals: {
    hr: 110,
    sbp: 108,
    dbp: 68,
    rr: 18,
    spo2: 99,
    temp: 36.8,
    o2Device: 'Room Air',
  },
  ddimer: { value: 1.45, unit: 'µg/mL', timestamp: '2026-01-27T12:00:00Z' },
  wellsScore: 1.5,
  wellsRisk: 'low',
  percScore: 2,
  percNegative: false,
  creatinine: 0.6,
  egfr: 128,
  troponin: null,
  activeProblems: ['Pregnancy (34 weeks)', 'Gestational Diabetes'],
  relevantHistory: [
    'G2P1 at 34 weeks gestation',
    'Gestational diabetes (diet controlled)',
    'Normal pregnancy course',
    'No prior VTE',
  ],
  physicalExam: [
    'Gravid uterus consistent with dates',
    'Physiologic tachycardia',
    'Bilateral symmetric ankle edema',
    'No calf tenderness',
  ],
  medications: [
    { name: 'Prenatal Vitamins', category: 'Other', dose: '1 daily', lastRefill: '2026-01-15', daysSupply: 90 },
    { name: 'Iron Supplement', category: 'Other', dose: '325mg daily', lastRefill: '2026-01-15', daysSupply: 90 },
  ],
  timeline: [
    { date: '34 weeks ago', type: 'Diagnosis', title: 'Pregnancy Confirmed', subtitle: 'EDD March 10' },
    { date: '10 weeks ago', type: 'Diagnosis', title: 'GDM Diagnosed', subtitle: 'Diet controlled' },
  ],
  priorImaging: null,
  hasChronicRespiratoryDisease: false,
  hasPriorVTE: false,
  hasRecentSurgery: false,
  usesEstrogen: false, // Pregnancy is different from exogenous estrogen
  hasContrastAllergy: false,
  bleedingRisk: 'low',
};

const CASE_004_POSTOP: TeachingCase = {
  id: 'case-4',
  name: 'Thompson, David',
  age: 45,
  gender: 'Male',
  mrn: 'MRN-3847291',
  clinicalDescriptor: 'Post-Op Knee Replacement',
  chiefComplaint: 'Routine post-op follow-up, no symptoms',
  vitals: {
    hr: 78,
    sbp: 128,
    dbp: 82,
    rr: 14,
    spo2: 98,
    temp: 36.9,
    o2Device: 'Room Air',
  },
  ddimer: { value: 0.92, unit: 'µg/mL', timestamp: '2026-01-27T16:20:00Z' },
  wellsScore: 1.5,
  wellsRisk: 'low',
  percScore: 1,
  percNegative: false,
  creatinine: 0.9,
  egfr: 98,
  troponin: 0.01,
  activeProblems: ['Post-Op State', 'Knee Replacement', 'Osteoarthritis'],
  relevantHistory: [
    'TKA (right knee) 2 weeks ago',
    'On DVT prophylaxis (Lovenox)',
    'Ambulatory since POD 2',
    'No prior VTE',
  ],
  physicalExam: [
    'Well-appearing male',
    'Surgical incision healing well',
    'Mild symmetric leg edema (expected)',
    'No calf tenderness',
  ],
  medications: [
    { name: 'Enoxaparin', category: 'Anticoagulant', dose: '40mg SC daily', lastRefill: '2026-01-13', daysSupply: 21 },
    { name: 'Acetaminophen', category: 'Analgesic', dose: '650mg Q6H PRN', lastRefill: '2026-01-13', daysSupply: 14 },
    { name: 'Oxycodone', category: 'Analgesic', dose: '5mg Q4H PRN', lastRefill: '2026-01-13', daysSupply: 14 },
  ],
  timeline: [
    { date: '2 weeks ago', type: 'Procedure', title: 'Right TKA', subtitle: 'Uncomplicated' },
    { date: '12 days ago', type: 'Procedure', title: 'Hospital Discharge', subtitle: 'On Lovenox prophylaxis' },
    { date: '3 days ago', type: 'Imaging', title: 'CTPA', subtitle: 'Negative for PE', status: 'Negative' },
  ],
  priorImaging: {
    modality: 'CTPA',
    date: '2026-01-24', // 3 days ago
    result: 'Negative',
    reportSummary: 'No pulmonary embolism. Small bilateral pleural effusions.',
  },
  hasChronicRespiratoryDisease: false,
  hasPriorVTE: false,
  hasRecentSurgery: true, // < 4 weeks
  usesEstrogen: false,
  hasContrastAllergy: false,
  bleedingRisk: 'low',
};

const CASE_005_RHEUMATOID: TeachingCase = {
  id: 'case-5',
  name: 'Anderson, Jennifer',
  age: 40,
  gender: 'Female',
  mrn: 'MRN-6729183',
  clinicalDescriptor: 'Rheumatoid Arthritis Flare',
  chiefComplaint: 'Joint pain flare, mild SOB',
  vitals: {
    hr: 95,
    sbp: 122,
    dbp: 78,
    rr: 18,
    spo2: 98,
    temp: 37.4,
    o2Device: 'Room Air',
  },
  ddimer: { value: 0.88, unit: 'µg/mL', timestamp: '2026-01-27T17:00:00Z' },
  wellsScore: 0,
  wellsRisk: 'low',
  percScore: 0,
  percNegative: true,
  creatinine: 0.8,
  egfr: 95,
  troponin: 0.01,
  activeProblems: ['Rheumatoid Arthritis', 'Arthritis Flare', 'Anemia of Chronic Disease'],
  relevantHistory: [
    'Rheumatoid arthritis (15 years)',
    'Current flare (CRP elevated)',
    'On methotrexate',
    'No prior VTE',
  ],
  physicalExam: [
    'Swollen MCPs and PIPs bilaterally',
    'Symmetric joint involvement',
    'Clear lungs',
    'No leg swelling',
  ],
  medications: [
    { name: 'Methotrexate', category: 'Immunosuppressant', dose: '15mg weekly', lastRefill: '2026-01-10', daysSupply: 30 },
    { name: 'Folic Acid', category: 'Other', dose: '1mg daily', lastRefill: '2026-01-10', daysSupply: 90 },
    { name: 'Prednisone', category: 'Other', dose: '10mg daily (flare)', lastRefill: '2026-01-25', daysSupply: 14 },
  ],
  timeline: [
    { date: '15 years ago', type: 'Diagnosis', title: 'RA Diagnosed', subtitle: 'Seropositive' },
    { date: '1 week ago', type: 'Diagnosis', title: 'Flare Onset', subtitle: 'Polyarticular involvement' },
    { date: 'Today', type: 'Lab', title: 'CRP', subtitle: '45 mg/L (elevated)', status: 'Positive' },
  ],
  priorImaging: null,
  hasChronicRespiratoryDisease: false,
  hasPriorVTE: false,
  hasRecentSurgery: false,
  usesEstrogen: false,
  hasContrastAllergy: false,
  bleedingRisk: 'low',
};

// ===========================================================================
// CASE 6-10: PRE-WORKUP (D-Dimer Pending)
// ===========================================================================

const CASE_006_TRIAGE_CP: TeachingCase = {
  id: 'case-6',
  name: 'Rodriguez, Carlos',
  age: 55,
  gender: 'Male',
  mrn: 'MRN-4821937',
  clinicalDescriptor: 'Triage Chest Pain',
  chiefComplaint: 'Substernal chest pressure, mild SOB',
  vitals: {
    hr: 88,
    sbp: 148,
    dbp: 92,
    rr: 18,
    spo2: 97,
    temp: 36.9,
    o2Device: 'Room Air',
  },
  ddimer: { value: null, unit: 'µg/mL' },
  wellsScore: 3.0,
  wellsRisk: 'moderate',
  percScore: 2,
  percNegative: false,
  creatinine: 1.0,
  egfr: 78,
  troponin: null,
  activeProblems: ['Hypertension', 'Hyperlipidemia'],
  relevantHistory: [
    'Hypertension (controlled)',
    'Hyperlipidemia',
    'Family history MI (father at 58)',
    'No prior VTE',
  ],
  physicalExam: [
    'Mildly diaphoretic',
    'Regular rhythm, no murmurs',
    'Lungs clear bilaterally',
    'No leg edema',
  ],
  medications: [
    { name: 'Lisinopril', category: 'Cardiovascular', dose: '20mg daily', lastRefill: '2026-01-10', daysSupply: 90 },
    { name: 'Atorvastatin', category: 'Cardiovascular', dose: '20mg daily', lastRefill: '2026-01-10', daysSupply: 90 },
    { name: 'Aspirin', category: 'Cardiovascular', dose: '81mg daily', lastRefill: '2026-01-10', daysSupply: 90 },
  ],
  timeline: [
    { date: 'Today 18:00', type: 'Lab', title: 'Troponin Ordered', subtitle: 'Pending', status: 'Neutral' },
  ],
  priorImaging: null,
  hasChronicRespiratoryDisease: false,
  hasPriorVTE: false,
  hasRecentSurgery: false,
  usesEstrogen: false,
  hasContrastAllergy: false,
  bleedingRisk: 'low',
};

const CASE_007_ELDERLY_SYNCOPE: TeachingCase = {
  id: 'case-7',
  name: "O'Brien, Patricia",
  age: 82,
  gender: 'Female',
  mrn: 'MRN-7391824',
  clinicalDescriptor: 'Syncope Unknown Cause',
  chiefComplaint: 'Syncopal episode in grocery store',
  vitals: {
    hr: 72,
    sbp: 124,
    dbp: 68,
    rr: 16,
    spo2: 96,
    temp: 36.4,
    o2Device: 'Room Air',
  },
  ddimer: { value: null, unit: 'µg/mL' },
  wellsScore: 1.5,
  wellsRisk: 'low',
  percScore: 2,
  percNegative: false,
  creatinine: 1.4,
  egfr: 38,
  troponin: 0.02,
  activeProblems: ['Atrial Fibrillation', 'CKD Stage 3b', 'Syncope'],
  relevantHistory: [
    'Atrial fibrillation (rate controlled)',
    'CKD Stage 3b (baseline Cr 1.3-1.5)',
    'On anticoagulation (Apixaban)',
    'No prior VTE',
  ],
  physicalExam: [
    'Alert, oriented x3',
    'Irregularly irregular rhythm',
    'No focal neurologic deficits',
    'No leg edema',
  ],
  medications: [
    { name: 'Apixaban', category: 'Anticoagulant', dose: '2.5mg BID', lastRefill: '2026-01-18', daysSupply: 30 },
    { name: 'Metoprolol Succinate', category: 'Cardiovascular', dose: '50mg daily', lastRefill: '2026-01-05', daysSupply: 90 },
    { name: 'Amlodipine', category: 'Cardiovascular', dose: '5mg daily', lastRefill: '2026-01-05', daysSupply: 90 },
  ],
  timeline: [
    { date: 'Today 14:30', type: 'Diagnosis', title: 'Syncope at Store', subtitle: 'Witnessed, brief LOC' },
  ],
  priorImaging: null,
  hasChronicRespiratoryDisease: false,
  hasPriorVTE: false,
  hasRecentSurgery: false,
  usesEstrogen: false,
  hasContrastAllergy: false,
  bleedingRisk: 'moderate', // On anticoagulation
};

const CASE_008_ANXIOUS_YOUNG: TeachingCase = {
  id: 'case-8',
  name: 'Kim, Jennifer',
  age: 22,
  gender: 'Female',
  mrn: 'MRN-2918374',
  clinicalDescriptor: 'Anxious Tachycardia',
  chiefComplaint: "Can't catch my breath, heart racing",
  vitals: {
    hr: 110,
    sbp: 112,
    dbp: 70,
    rr: 22,
    spo2: 99,
    temp: 36.7,
    o2Device: 'Room Air',
  },
  ddimer: { value: null, unit: 'µg/mL' },
  wellsScore: 1.5,
  wellsRisk: 'low',
  percScore: 1,
  percNegative: false,
  creatinine: 0.7,
  egfr: 118,
  troponin: null,
  activeProblems: ['Anxiety Disorder', 'Panic Attacks'],
  relevantHistory: [
    'Anxiety disorder (diagnosed age 18)',
    'Panic attacks (3-4 per month)',
    'On oral contraceptives',
    'No prior VTE',
  ],
  physicalExam: [
    'Anxious-appearing young female',
    'Tachycardic but regular',
    'Clear lungs',
    'No leg swelling',
  ],
  medications: [
    { name: 'Ethinyl Estradiol/Norgestimate', category: 'Hormonal', dose: '35mcg/0.25mg', lastRefill: '2026-01-20', daysSupply: 28 },
    { name: 'Sertraline', category: 'Psychiatric', dose: '50mg daily', lastRefill: '2026-01-15', daysSupply: 30 },
    { name: 'Lorazepam', category: 'Psychiatric', dose: '0.5mg PRN', lastRefill: '2026-01-15', daysSupply: 30 },
  ],
  timeline: [
    { date: '4 years ago', type: 'Diagnosis', title: 'Anxiety Disorder Dx', subtitle: 'Started SSRI' },
    { date: 'Today 19:30', type: 'Diagnosis', title: 'Panic Attack', subtitle: 'Triggered by work stress' },
  ],
  priorImaging: null,
  hasChronicRespiratoryDisease: false,
  hasPriorVTE: false,
  hasRecentSurgery: false,
  usesEstrogen: true, // On OCPs
  hasContrastAllergy: false,
  bleedingRisk: 'low',
};

const CASE_009_POSTOP_DYSPNEA: TeachingCase = {
  id: 'case-9',
  name: 'Mitchell, David',
  age: 65,
  gender: 'Male',
  mrn: 'MRN-8472916',
  clinicalDescriptor: 'Post-Op Dyspnea (HIGH RISK)',
  chiefComplaint: 'Progressive shortness of breath',
  vitals: {
    hr: 105,
    sbp: 118,
    dbp: 72,
    rr: 24,
    spo2: 93,
    temp: 37.2,
    o2Device: '2L NC',
  },
  ddimer: { value: null, unit: 'µg/mL' },
  wellsScore: 4.5,
  wellsRisk: 'high',
  percScore: 4,
  percNegative: false,
  creatinine: 1.2,
  egfr: 58,
  troponin: null,
  activeProblems: ['Post-Op State', 'Surgery', 'Hypertension'],
  relevantHistory: [
    'Knee replacement 2 weeks ago',
    'Limited mobility post-op',
    'Stopped Lovenox 5 days ago (completed course)',
    'Progressive dyspnea x 2 days',
  ],
  physicalExam: [
    'Tachypneic, using accessory muscles',
    'Tachycardic',
    'R calf slightly larger than L (2cm difference)',
    'Mild hypoxia on room air',
  ],
  medications: [
    { name: 'Oxycodone', category: 'Analgesic', dose: '5mg Q4H PRN', lastRefill: '2026-01-13', daysSupply: 14 },
    { name: 'Lisinopril', category: 'Cardiovascular', dose: '10mg daily', lastRefill: '2026-01-01', daysSupply: 90 },
  ],
  timeline: [
    { date: '2 weeks ago', type: 'Procedure', title: 'Right TKA', subtitle: 'Uncomplicated surgery' },
    { date: '5 days ago', type: 'Medication', title: 'Lovenox Stopped', subtitle: 'Completed 10-day course' },
    { date: '2 days ago', type: 'Diagnosis', title: 'Dyspnea Onset', subtitle: 'Progressive worsening' },
  ],
  priorImaging: null,
  hasChronicRespiratoryDisease: false,
  hasPriorVTE: false,
  hasRecentSurgery: true, // 2 weeks ago
  usesEstrogen: false,
  hasContrastAllergy: false,
  bleedingRisk: 'low',
};

const CASE_010_VIRAL: TeachingCase = {
  id: 'case-10',
  name: 'Park, Daniel',
  age: 35,
  gender: 'Male',
  mrn: 'MRN-5928471',
  clinicalDescriptor: 'Viral Illness with Cough',
  chiefComplaint: 'Cough, fever, mild SOB',
  vitals: {
    hr: 98,
    sbp: 122,
    dbp: 78,
    rr: 20,
    spo2: 97,
    temp: 38.2,
    o2Device: 'Room Air',
  },
  ddimer: { value: null, unit: 'µg/mL' },
  wellsScore: 0,
  wellsRisk: 'low',
  percScore: 0,
  percNegative: true,
  creatinine: 0.9,
  egfr: 98,
  troponin: null,
  activeProblems: ['Viral Infection', 'Fever'],
  relevantHistory: [
    'Recent sick contacts (coworker with flu)',
    'No chronic conditions',
    'No prior VTE',
    'Non-smoker',
  ],
  physicalExam: [
    'Appears mildly ill',
    'Pharyngeal erythema',
    'Scattered rhonchi bilaterally',
    'No leg swelling',
  ],
  medications: [],
  timeline: [
    { date: '4 days ago', type: 'Diagnosis', title: 'Symptom Onset', subtitle: 'Fever, malaise, body aches' },
    { date: '2 days ago', type: 'Diagnosis', title: 'Cough Developed', subtitle: 'Non-productive' },
  ],
  priorImaging: null,
  hasChronicRespiratoryDisease: false,
  hasPriorVTE: false,
  hasRecentSurgery: false,
  usesEstrogen: false,
  hasContrastAllergy: false,
  bleedingRisk: 'low',
};

// ===========================================================================
// CASE 11: CLASSIC PE (True Positive - Textbook Presentation)
// ===========================================================================

const CASE_011_CLASSIC_PE: TeachingCase = {
  id: 'case-11',
  name: 'Miller, James',
  age: 68,
  gender: 'Male',
  mrn: 'MRN-1029384',
  clinicalDescriptor: 'The Classic PE (Textbook Positive)',
  chiefComplaint: 'Sudden onset sharp chest pain & SOB',
  vitals: {
    hr: 118,
    sbp: 105,
    dbp: 65,
    rr: 26,
    spo2: 88, // On room air initially, corrected to 94% on NRB
    temp: 37.1,
    o2Device: 'NRB', // Non-Rebreather
  },
  ddimer: { value: 4.85, unit: 'µg/mL', timestamp: '2026-01-27T22:15:00Z' },
  wellsScore: 6.0,
  wellsRisk: 'high',
  percScore: 5,
  percNegative: false,
  creatinine: 1.1,
  egfr: 65,
  troponin: 0.08, // Mildly elevated (RV strain)
  activeProblems: ['Deep Vein Thrombosis (Right Leg)', 'Acute Pulmonary Embolism - Suspected'],
  relevantHistory: [
    'Long-haul flight 3 days ago (12 hours)',
    'Right calf pain and swelling x 2 days',
    'Sudden chest pain onset 2 hours ago',
    'History of hypertension',
  ],
  physicalExam: [
    'Diaphoretic, anxious appearance',
    'Tachycardic, tachypneic',
    'Right calf swollen, tender, erythematous',
    'JVD present',
    'Hypoxic requiring high-flow O2',
  ],
  medications: [
    { name: 'Lisinopril', category: 'Cardiovascular', dose: '10mg daily', lastRefill: '2026-01-15', daysSupply: 90 },
    { name: 'Aspirin', category: 'Cardiovascular', dose: '81mg daily', lastRefill: '2026-01-15', daysSupply: 90 },
  ],
  timeline: [
    { date: '3 days ago', type: 'Diagnosis', title: 'Long-Haul Flight', subtitle: '12-hour international flight' },
    { date: '2 days ago', type: 'Diagnosis', title: 'Calf Pain Onset', subtitle: 'Right leg swelling, pain' },
    { date: 'Today 20:00', type: 'Diagnosis', title: 'Acute Chest Pain', subtitle: 'Sudden sharp pleuritic pain' },
    { date: 'Today 22:00', type: 'Lab', title: 'Troponin', subtitle: '0.08 ng/mL (Elevated)', status: 'Positive' },
  ],
  priorImaging: null,
  hasChronicRespiratoryDisease: false,
  hasPriorVTE: true, // Current DVT counts
  hasRecentSurgery: false,
  usesEstrogen: false,
  hasContrastAllergy: false,
  bleedingRisk: 'low',
};

// ===========================================================================
// CASE 12-13: EQUIVOCAL PERC FAILS (Age-Driven & HR/Estrogen)
// ===========================================================================

const CASE_012_EQUIVOCAL_LEG: TeachingCase = {
  id: 'case-12',
  name: 'Barnes, Richard',
  age: 52,
  gender: 'Male',
  mrn: 'MRN-6193827',
  clinicalDescriptor: 'The Equivocal Leg (Age-Driven PERC Fail)',
  chiefComplaint: 'Left calf cramping x 3 days, mild SOB today',
  vitals: {
    hr: 85,
    sbp: 130,
    dbp: 80,
    rr: 16,
    spo2: 98,
    temp: 36.8,
    o2Device: 'Room Air',
  },
  ddimer: { value: 0.65, unit: 'µg/mL', timestamp: '2026-01-27T16:00:00Z' },
  wellsScore: 0,
  wellsRisk: 'low',
  percScore: 1,
  percNegative: false,
  creatinine: 1.0,
  egfr: 85,
  troponin: 0.01,
  activeProblems: ['Calf Pain', 'Hyperlipidemia'],
  relevantHistory: [
    'Left calf cramping after long drive (6 hours)',
    'No prior VTE',
    'Mild SOB started today',
    'Active lifestyle, regular jogger',
  ],
  physicalExam: [
    'Well-appearing male',
    'Left calf mildly tender, no erythema',
    'No measurable asymmetry',
    'Lungs clear',
    'No JVD',
  ],
  medications: [
    { name: 'Atorvastatin', category: 'Cardiovascular', dose: '20mg daily', lastRefill: '2026-01-10', daysSupply: 90 },
  ],
  timeline: [
    { date: '3 days ago', type: 'Diagnosis', title: 'Calf Cramping Onset', subtitle: 'After 6-hour drive' },
    { date: 'Today', type: 'Diagnosis', title: 'Mild SOB', subtitle: 'Noticed on exertion' },
    { date: 'Today 16:00', type: 'Lab', title: 'D-Dimer', subtitle: '0.65 µg/mL', status: 'Neutral' },
  ],
  priorImaging: null,
  hasChronicRespiratoryDisease: false,
  hasPriorVTE: false,
  hasRecentSurgery: false,
  usesEstrogen: false,
  hasContrastAllergy: false,
  bleedingRisk: 'low',
};

const CASE_013_TACHYCARDIC_PILL: TeachingCase = {
  id: 'case-13',
  name: 'Chen, Lisa',
  age: 35,
  gender: 'Female',
  mrn: 'MRN-7281946',
  clinicalDescriptor: 'The Tachycardic Pill (HR/Estrogen PERC Fail)',
  chiefComplaint: 'Palpitations, mild chest tightness',
  vitals: {
    hr: 102,
    sbp: 115,
    dbp: 70,
    rr: 18,
    spo2: 99,
    temp: 36.7,
    o2Device: 'Room Air',
  },
  ddimer: { value: 0.85, unit: 'µg/mL', timestamp: '2026-01-27T17:30:00Z' },
  wellsScore: 1.5,
  wellsRisk: 'low',
  percScore: 2,
  percNegative: false,
  creatinine: 0.7,
  egfr: 115,
  troponin: null,
  activeProblems: ['Oral Contraceptive Use', 'Palpitations'],
  relevantHistory: [
    'On oral contraceptives x 2 years',
    'Episodes of palpitations (intermittent)',
    'No prior VTE',
    'Non-smoker',
    'No family history of clotting disorders',
  ],
  physicalExam: [
    'Anxious but well-appearing',
    'Tachycardic, regular rhythm',
    'Lungs clear bilaterally',
    'No leg swelling or tenderness',
    'No JVD',
  ],
  medications: [
    { name: 'Ethinyl Estradiol/Levonorgestrel', category: 'Hormonal', dose: '30mcg/0.15mg', lastRefill: '2026-01-20', daysSupply: 28 },
    { name: 'Ibuprofen', category: 'Analgesic', dose: '400mg PRN', lastRefill: '2026-01-15', daysSupply: 30 },
  ],
  timeline: [
    { date: '2 years ago', type: 'Medication', title: 'OCP Started', subtitle: 'Combined oral contraceptive' },
    { date: '1 week ago', type: 'Diagnosis', title: 'Palpitation Episode', subtitle: 'Lasted ~30 minutes' },
    { date: 'Today', type: 'Diagnosis', title: 'Recurrent Palpitations', subtitle: 'With mild chest tightness' },
    { date: 'Today 17:30', type: 'Lab', title: 'D-Dimer', subtitle: '0.85 µg/mL', status: 'Neutral' },
  ],
  priorImaging: {
    modality: 'CTPA',
    date: '2024-03-10',
    result: 'Negative',
    reportSummary: 'No pulmonary embolism. Normal cardiac silhouette.',
  },
  hasChronicRespiratoryDisease: false,
  hasPriorVTE: false,
  hasRecentSurgery: false,
  usesEstrogen: true,
  hasContrastAllergy: false,
  bleedingRisk: 'low',
};

// ===========================================================================
// Export All Cases
// ===========================================================================

export const TEACHING_CASES: TeachingCase[] = [
  CASE_001_PNEUMONIA,
  CASE_002_MALIGNANCY,
  CASE_003_PREGNANCY,
  CASE_004_POSTOP,
  CASE_005_RHEUMATOID,
  CASE_006_TRIAGE_CP,
  CASE_007_ELDERLY_SYNCOPE,
  CASE_008_ANXIOUS_YOUNG,
  CASE_009_POSTOP_DYSPNEA,
  CASE_010_VIRAL,
  CASE_011_CLASSIC_PE,
  CASE_012_EQUIVOCAL_LEG,
  CASE_013_TACHYCARDIC_PILL,
];

export const DEFAULT_CASE = TEACHING_CASES[0];

// ===========================================================================
// Clinical Context Logic
// ===========================================================================

export interface ClinicalContext {
  hasInfection: boolean;
  hasMalignancy: boolean;
  hasPregnancy: boolean;
  hasPostOp: boolean;
  hasInflammation: boolean;
  contextMessages: string[];
}

export function getClinicalContext(activeProblems: string[]): ClinicalContext {
  const lowerProblems = activeProblems.map(p => p.toLowerCase());
  const contextMessages: string[] = [];
  
  const infectionKeywords = ['pneumonia', 'sepsis', 'viral', 'infection', 'fever'];
  const hasInfection = lowerProblems.some(p => infectionKeywords.some(kw => p.includes(kw)));
  if (hasInfection) contextMessages.push('Active Infection (Potential D-Dimer Elevator)');
  
  const malignancyKeywords = ['cancer', 'metastatic', 'chemotherapy', 'malignancy'];
  const hasMalignancy = lowerProblems.some(p => malignancyKeywords.some(kw => p.includes(kw)));
  if (hasMalignancy) contextMessages.push('Active Malignancy (Baseline D-Dimer Elevation)');
  
  const pregnancyKeywords = ['pregnancy', 'pregnant', 'gestational'];
  const hasPregnancy = lowerProblems.some(p => pregnancyKeywords.some(kw => p.includes(kw)));
  if (hasPregnancy) contextMessages.push('Physiologic D-Dimer Elevation (Pregnancy)');
  
  const postOpKeywords = ['post-op', 'surgery', 'replacement', 'postop'];
  const hasPostOp = lowerProblems.some(p => postOpKeywords.some(kw => p.includes(kw)));
  if (hasPostOp) contextMessages.push('Recent Surgery (Expected Elevation)');
  
  const inflammatoryKeywords = ['rheumatoid', 'lupus', 'arthritis', 'flare'];
  const hasInflammation = lowerProblems.some(p => inflammatoryKeywords.some(kw => p.includes(kw)));
  if (hasInflammation) contextMessages.push('Chronic Inflammation (Baseline Elevation)');
  
  return { hasInfection, hasMalignancy, hasPregnancy, hasPostOp, hasInflammation, contextMessages };
}

export function hasConfoundingContext(activeProblems: string[]): boolean {
  return getClinicalContext(activeProblems).contextMessages.length > 0;
}

// ===========================================================================
// Hemodynamic Calculations
// ===========================================================================

export interface HemodynamicMetrics {
  shockIndex: number | null;        // HR / SBP
  modifiedShockIndex: number | null; // HR / MAP (NEW)
  map: number;                       // (SBP + 2*DBP) / 3
  pulsePressure: number;             // SBP - DBP
}

export function calculateHemodynamics(vitals: Vitals): HemodynamicMetrics {
  const { hr, sbp, dbp } = vitals;
  const map = Math.round((sbp + 2 * dbp) / 3);
  return {
    shockIndex: sbp > 0 ? hr / sbp : null,
    modifiedShockIndex: map > 0 ? hr / map : null, // MSI = HR / MAP
    map,
    pulsePressure: sbp - dbp,
  };
}

export function calculateAgeAdjustedDdimer(age: number): number {
  return age > 50 ? age * 0.01 : 0.50;
}

// ===========================================================================
// Prior Imaging Helpers
// ===========================================================================

export function getDaysSincePriorImaging(priorImaging: PriorImaging | null): number | null {
  if (!priorImaging) return null;
  const imagingDate = new Date(priorImaging.date);
  const today = new Date();
  return Math.floor((today.getTime() - imagingDate.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatPriorImagingDate(priorImaging: PriorImaging | null): string {
  if (!priorImaging) return 'None on file';
  const days = getDaysSincePriorImaging(priorImaging);
  if (days === null) return 'Unknown';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

// ===========================================================================
// Legacy Compatibility
// ===========================================================================

export function teachingCaseToScenario(tc: TeachingCase): DemoScenario {
  return {
    id: tc.id,
    name: tc.name,
    description: tc.clinicalDescriptor,
    data: {
      patient_id: tc.id,
      timestamp: new Date().toISOString(),
      probability: 0,
      threshold: 0.08,
      decision: 'rule_out',
      explanation: '',
      feature_summary: {
        age: tc.age,
        gender_male: tc.gender === 'Male' ? 1 : 0,
        gender_female: tc.gender === 'Female' ? 1 : 0,
        triage_hr: tc.vitals.hr,
        triage_sbp: tc.vitals.sbp,
        triage_dbp: tc.vitals.dbp,
        triage_rr: tc.vitals.rr,
        triage_o2sat: tc.vitals.spo2,
        triage_temp: tc.vitals.temp,
        d_dimer: tc.ddimer.value ?? 0,
        creatinine: tc.creatinine,
        gfr: tc.egfr,
        wells_score: tc.wellsScore,
        perc_score: tc.percScore,
        perc_negative: tc.percNegative ? 1 : 0,
        shock_index: calculateHemodynamics(tc.vitals).shockIndex ?? 0,
      },
      safety_note: '',
    },
  };
}

export const DEMO_SCENARIOS: DemoScenario[] = TEACHING_CASES.map(teachingCaseToScenario);
export const DEFAULT_DEMO_SCENARIO = DEMO_SCENARIOS[0];
