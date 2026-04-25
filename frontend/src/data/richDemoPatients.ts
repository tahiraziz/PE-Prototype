/**
 * Rich Demo Patient Data for Luminur PE Decision Support
 * 
 * These patients provide complete clinical data for testing the dashboard
 * when FHIR connection fails or times out. Each patient exercises specific
 * clinical logic and UI components.
 * 
 * DATA SOURCE: Frontend fixtures (no backend/FHIR calls)
 * Used when: FHIR.oauth2.ready() fails or times out (3s)
 */

import type { APIAssessmentResponse, DemoScenario } from '../types/assessment';
import type { 
  MedicationDispense, 
  VitalSigns, 
  LabValues, 
  AllergyInfo, 
  PatientDemographics 
} from '../utils/clinicalLogic';

// ===========================================================================
// Rich Patient Interfaces
// ===========================================================================

export interface RichDemoPatient {
  id: string;
  name: string;
  description: string;
  
  // Demographics
  demographics: PatientDemographics;
  
  // Clinical Data
  vitals: VitalSigns;
  labs: LabValues;
  allergies: AllergyInfo[];
  
  // Medication History
  medicationDispenses: MedicationDispense[];
  activeMedications: {
    name: string;
    status: 'active' | 'discontinued' | 'on-hold';
    type: 'DOAC' | 'Warfarin' | 'Heparin_LMWH' | 'Antiplatelet' | 'Other';
  }[];
  
  // Imaging History
  priorImaging: {
    date: string;
    modality: 'CTA' | 'V/Q' | 'CXR' | 'CT Chest' | 'CTPA';
    result: string;
    code?: string;
  }[];
  
  // Clinical Flags
  historyFlags: {
    prior_pe: boolean;
    prior_dvt_vte: boolean;
    active_cancer: boolean;
    recent_surgery: boolean;
    immobilization: boolean;
    thrombophilia: boolean;
    pregnancy_estrogen: boolean;
  };
  
  // Assessment Result
  assessmentData: APIAssessmentResponse;
  
  // Expected UI Outcomes (for testing)
  expectedAlerts: {
    medicationGap: boolean;
    contrastRisk: boolean;
    iodineAllergy: boolean;
    duplicateOrdering: boolean;
    shockIndexHigh: boolean;
  };
}

// ===========================================================================
// Helper: Date Math
// ===========================================================================

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function hoursAgo(hours: number): string {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date.toISOString();
}

function yearsAgo(years: number): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date.toISOString();
}

// ===========================================================================
// HIGH RISK PATIENT: Test, HighRisk
// ===========================================================================

export const HIGH_RISK_PATIENT: RichDemoPatient = {
  id: 'DEMO-HIGH-RISK',
  name: 'Test, HighRisk',
  description: 'High risk patient with medication gap, contrast warning, prior CTAs, and iodine allergy',
  
  demographics: {
    age: 62,
    sex: 'male',
    weight: 85,
    height: 175,
  },
  
  vitals: {
    hr: 105,
    sbp: 108,
    dbp: 68,
    rr: 22,
    spo2: 91,
    temp: 37.2,
    timestamp: hoursAgo(1),
  },
  
  labs: {
    ddimer: 1.85,        // µg/mL - elevated
    ddimerUnits: 'µg/mL',
    creatinine: 1.8,     // mg/dL - elevated, triggers contrast warning
    troponin: 0.04,      // ng/mL - borderline
    inr: null,           // Not on warfarin
    gfr: 45,             // Calculated: ~45, triggers CAUTION
  },
  
  allergies: [
    {
      substance: 'Iodine',
      code: '227574005',
      reaction: 'Anaphylaxis',
      severity: 'high',
    },
    {
      substance: 'Penicillin',
      code: '91936005',
      reaction: 'Rash',
      severity: 'low',
    },
  ],
  
  // Apixaban last refilled 45 days ago with 30-day supply = 15-day gap
  medicationDispenses: [
    {
      medication: 'Apixaban 5mg',
      medicationCode: '1364430',
      whenHandedOver: daysAgo(45),
      daysSupply: 30,
      quantity: 60,
      dosageInstruction: 'Take 5mg by mouth twice daily',
    },
    {
      medication: 'Apixaban 5mg',
      medicationCode: '1364430',
      whenHandedOver: daysAgo(75),
      daysSupply: 30,
      quantity: 60,
      dosageInstruction: 'Take 5mg by mouth twice daily',
    },
  ],
  
  activeMedications: [
    { name: 'Apixaban 5mg BID', status: 'active', type: 'DOAC' },
    { name: 'Metoprolol 25mg', status: 'active', type: 'Other' },
    { name: 'Lisinopril 10mg', status: 'active', type: 'Other' },
  ],
  
  // Prior CTAs: 1 year ago and 3 years ago
  priorImaging: [
    {
      date: yearsAgo(1),
      modality: 'CTA',
      result: 'Negative for PE. Mild cardiomegaly noted.',
      code: '169067001',
    },
    {
      date: yearsAgo(3),
      modality: 'CTA',
      result: 'Negative for PE. No significant findings.',
      code: '169067001',
    },
    {
      date: daysAgo(7),
      modality: 'CXR',
      result: 'Mild pulmonary vascular congestion. No focal consolidation.',
      code: '399208008',
    },
  ],
  
  historyFlags: {
    prior_pe: false,
    prior_dvt_vte: true,  // Prior DVT
    active_cancer: false,
    recent_surgery: false,
    immobilization: true,
    thrombophilia: false,
    pregnancy_estrogen: false,
  },
  
  assessmentData: {
    patient_id: 'DEMO-HIGH-RISK',
    timestamp: new Date().toISOString(),
    probability: 0.234,
    threshold: 0.08,
    decision: 'continue_workup',
    explanation: 'HIGH probability of PE (23.4%). Multiple concerning features: tachycardia (HR 105), hypoxia (SpO2 91%), elevated D-Dimer (1.85 µg/mL), prior DVT, and immobilization. Anticoagulation gap detected (15 days). CONTRAST CAUTION: GFR 45, Iodine allergy present.',
    feature_summary: {
      age: 62,
      gender_male: 1,
      gender_female: 0,
      bmi: 27.8,
      triage_hr: 105,
      triage_rr: 22,
      triage_o2sat: 91,
      triage_sbp: 108,
      triage_dbp: 68,
      triage_temp: 37.2,
      d_dimer: 1.85,
      troponin: 0.04,
      creatinine: 1.8,
      wells_score: 4.5,
      wells_tachycardia: 1,
      wells_dvt_signs: 0,
      wells_pe_likely: 1,
      wells_hemoptysis: 0,
      geneva_score: 7,
      perc_score: 5,
      perc_negative: 0,
      shock_index: 0.97,
      prior_pe_diagnosis: 0,
      prior_dvt_diagnosis: 1,
      prior_pe_dvt: true,
      prior_cancer: 0,
      active_cancer: false,
      active_malignancy: false,
      recent_surgery: 0,
      immobilization: 1,
      estrogen_use: 0,
      pregnancy: false,
      thrombophilia: false,
      cc_dyspnea: 1,
      cc_chest_pain: 1,
      cc_leg_pain_swelling: 0,
      arrival_ambulance: 1,
    },
    safety_note: 'SAFETY ALERTS: (1) Medication Gap Detected - 15 days since last Apixaban (2) Contrast Caution - GFR 45 (3) Iodine Allergy - Premedication required',
  },
  
  expectedAlerts: {
    medicationGap: true,        // 45 days ago - 30 supply = 15 day gap
    contrastRisk: true,         // GFR 45, Creatinine 1.8
    iodineAllergy: true,        // Iodine allergy documented
    duplicateOrdering: false,   // Last CTA was 1 year ago
    shockIndexHigh: true,       // 105/108 = 0.97
  },
};

// ===========================================================================
// LOW RISK PATIENT: Test, LowRisk
// ===========================================================================

export const LOW_RISK_PATIENT: RichDemoPatient = {
  id: 'DEMO-LOW-RISK',
  name: 'Test, LowRisk',
  description: 'Low risk patient with normal labs, no allergies, PERC negative',
  
  demographics: {
    age: 35,
    sex: 'female',
    weight: 65,
    height: 165,
  },
  
  vitals: {
    hr: 78,
    sbp: 118,
    dbp: 72,
    rr: 16,
    spo2: 98,
    temp: 36.8,
    timestamp: hoursAgo(0.5),
  },
  
  labs: {
    ddimer: 0.32,
    ddimerUnits: 'µg/mL',
    creatinine: 0.85,
    troponin: 0.01,
    inr: null,
    gfr: 95,
  },
  
  allergies: [],
  
  medicationDispenses: [],
  
  activeMedications: [
    { name: 'Oral Contraceptive', status: 'active', type: 'Other' },
  ],
  
  priorImaging: [
    {
      date: yearsAgo(5),
      modality: 'CXR',
      result: 'Normal chest radiograph.',
      code: '399208008',
    },
  ],
  
  historyFlags: {
    prior_pe: false,
    prior_dvt_vte: false,
    active_cancer: false,
    recent_surgery: false,
    immobilization: false,
    thrombophilia: false,
    pregnancy_estrogen: false,  // OCP but < 50 so PERC age criterion not met
  },
  
  assessmentData: {
    patient_id: 'DEMO-LOW-RISK',
    timestamp: new Date().toISOString(),
    probability: 0.028,
    threshold: 0.08,
    decision: 'rule_out',
    explanation: 'LOW probability of PE (2.8%). PERC negative. Normal vitals, low D-Dimer (0.32 µg/mL), no risk factors. PE may be safely ruled out in appropriate clinical context.',
    feature_summary: {
      age: 35,
      gender_male: 0,
      gender_female: 1,
      bmi: 23.9,
      triage_hr: 78,
      triage_rr: 16,
      triage_o2sat: 98,
      triage_sbp: 118,
      triage_dbp: 72,
      triage_temp: 36.8,
      d_dimer: 0.32,
      troponin: 0.01,
      creatinine: 0.85,
      wells_score: 0,
      wells_tachycardia: 0,
      wells_dvt_signs: 0,
      wells_pe_likely: 0,
      wells_hemoptysis: 0,
      geneva_score: 1,
      perc_score: 0,
      perc_negative: 1,
      shock_index: 0.66,
      prior_pe_diagnosis: 0,
      prior_dvt_diagnosis: 0,
      prior_pe_dvt: false,
      prior_cancer: 0,
      active_cancer: false,
      active_malignancy: false,
      recent_surgery: 0,
      immobilization: 0,
      estrogen_use: 0,
      pregnancy: false,
      thrombophilia: false,
      cc_dyspnea: 0,
      cc_chest_pain: 1,
      cc_leg_pain_swelling: 0,
      arrival_ambulance: 0,
    },
    safety_note: 'No safety concerns. Contrast safe. No allergies.',
  },
  
  expectedAlerts: {
    medicationGap: false,
    contrastRisk: false,
    iodineAllergy: false,
    duplicateOrdering: false,
    shockIndexHigh: false,
  },
};

// ===========================================================================
// WARFARIN PATIENT: Test, Warfarin
// ===========================================================================

export const WARFARIN_PATIENT: RichDemoPatient = {
  id: 'DEMO-WARFARIN',
  name: 'Test, Warfarin',
  description: 'Warfarin patient with subtherapeutic INR',
  
  demographics: {
    age: 72,
    sex: 'male',
    weight: 90,
    height: 180,
  },
  
  vitals: {
    hr: 88,
    sbp: 142,
    dbp: 88,
    rr: 18,
    spo2: 95,
    temp: 37.0,
    timestamp: hoursAgo(2),
  },
  
  labs: {
    ddimer: 0.72,        // Above age-adjusted threshold for 72 (0.72)
    ddimerUnits: 'µg/mL',
    creatinine: 1.2,
    troponin: 0.02,
    inr: 1.4,            // Subtherapeutic!
    gfr: 58,
  },
  
  allergies: [
    {
      substance: 'Sulfa',
      code: '387170002',
      reaction: 'Rash',
      severity: 'low',
    },
  ],
  
  medicationDispenses: [
    {
      medication: 'Warfarin 5mg',
      medicationCode: '855288',
      whenHandedOver: daysAgo(14),
      daysSupply: 30,
      quantity: 30,
      dosageInstruction: 'Take 5mg by mouth daily',
    },
  ],
  
  activeMedications: [
    { name: 'Warfarin 5mg', status: 'active', type: 'Warfarin' },
    { name: 'Aspirin 81mg', status: 'active', type: 'Antiplatelet' },
  ],
  
  priorImaging: [
    {
      date: yearsAgo(2),
      modality: 'CTA',
      result: 'Small subsegmental PE in right lower lobe.',
      code: '169067001',
    },
  ],
  
  historyFlags: {
    prior_pe: true,       // Had prior PE 2 years ago
    prior_dvt_vte: false,
    active_cancer: false,
    recent_surgery: false,
    immobilization: false,
    thrombophilia: false,
    pregnancy_estrogen: false,
  },
  
  assessmentData: {
    patient_id: 'DEMO-WARFARIN',
    timestamp: new Date().toISOString(),
    probability: 0.156,
    threshold: 0.08,
    decision: 'continue_workup',
    explanation: 'Moderate probability of PE (15.6%). Prior PE history, D-Dimer at age-adjusted threshold (0.72 µg/mL for age 72). WARNING: INR 1.4 is subtherapeutic - patient NOT fully anticoagulated.',
    feature_summary: {
      age: 72,
      gender_male: 1,
      gender_female: 0,
      bmi: 27.8,
      triage_hr: 88,
      triage_rr: 18,
      triage_o2sat: 95,
      triage_sbp: 142,
      triage_dbp: 88,
      triage_temp: 37.0,
      d_dimer: 0.72,
      troponin: 0.02,
      creatinine: 1.2,
      wells_score: 1.5,
      wells_tachycardia: 0,
      wells_dvt_signs: 0,
      wells_pe_likely: 0,
      wells_hemoptysis: 0,
      geneva_score: 4,
      perc_score: 2,
      perc_negative: 0,
      shock_index: 0.62,
      prior_pe_diagnosis: 1,
      prior_dvt_diagnosis: 0,
      prior_pe_dvt: true,
      prior_cancer: 0,
      active_cancer: false,
      active_malignancy: false,
      recent_surgery: 0,
      immobilization: 0,
      estrogen_use: 0,
      pregnancy: false,
      thrombophilia: false,
      cc_dyspnea: 1,
      cc_chest_pain: 0,
      cc_leg_pain_swelling: 0,
      arrival_ambulance: 0,
    },
    safety_note: 'WARNING: Warfarin subtherapeutic (INR 1.4). Patient is NOT adequately anticoagulated.',
  },
  
  expectedAlerts: {
    medicationGap: false,         // Has active refill
    contrastRisk: false,          // GFR 58 is caution zone but not red
    iodineAllergy: false,
    duplicateOrdering: false,
    shockIndexHigh: false,
  },
};

// ===========================================================================
// DUPLICATE SCAN PATIENT: Test, RecentCTA
// ===========================================================================

export const RECENT_CTA_PATIENT: RichDemoPatient = {
  id: 'DEMO-RECENT-CTA',
  name: 'Test, RecentCTA',
  description: 'Patient with CTA performed 6 hours ago - duplicate ordering flag',
  
  demographics: {
    age: 55,
    sex: 'female',
    weight: 70,
    height: 168,
  },
  
  vitals: {
    hr: 92,
    sbp: 128,
    dbp: 78,
    rr: 18,
    spo2: 96,
    temp: 37.1,
    timestamp: hoursAgo(0.25),
  },
  
  labs: {
    ddimer: 0.68,
    ddimerUnits: 'µg/mL',
    creatinine: 0.95,
    troponin: 0.01,
    inr: null,
    gfr: 72,
  },
  
  allergies: [],
  
  medicationDispenses: [],
  
  activeMedications: [],
  
  priorImaging: [
    {
      date: hoursAgo(6),    // 6 hours ago - should trigger duplicate warning
      modality: 'CTA',
      result: 'Negative for PE. Incidental 4mm pulmonary nodule, recommend follow-up.',
      code: '169067001',
    },
    {
      date: hoursAgo(8),
      modality: 'CXR',
      result: 'Clear lungs bilaterally.',
      code: '399208008',
    },
  ],
  
  historyFlags: {
    prior_pe: false,
    prior_dvt_vte: false,
    active_cancer: false,
    recent_surgery: false,
    immobilization: false,
    thrombophilia: false,
    pregnancy_estrogen: true,  // On HRT
  },
  
  assessmentData: {
    patient_id: 'DEMO-RECENT-CTA',
    timestamp: new Date().toISOString(),
    probability: 0.089,
    threshold: 0.08,
    decision: 'continue_workup',
    explanation: 'Borderline probability of PE (8.9%). Elevated D-Dimer (0.68 µg/mL above age-adjusted threshold 0.55). ALERT: CTA performed 6 hours ago was NEGATIVE. Consider if repeat imaging is warranted.',
    feature_summary: {
      age: 55,
      gender_male: 0,
      gender_female: 1,
      bmi: 24.8,
      triage_hr: 92,
      triage_rr: 18,
      triage_o2sat: 96,
      triage_sbp: 128,
      triage_dbp: 78,
      triage_temp: 37.1,
      d_dimer: 0.68,
      troponin: 0.01,
      creatinine: 0.95,
      wells_score: 1.5,
      wells_tachycardia: 0,
      wells_dvt_signs: 0,
      wells_pe_likely: 0,
      wells_hemoptysis: 0,
      geneva_score: 3,
      perc_score: 2,
      perc_negative: 0,
      shock_index: 0.72,
      prior_pe_diagnosis: 0,
      prior_dvt_diagnosis: 0,
      prior_pe_dvt: false,
      prior_cancer: 0,
      active_cancer: false,
      active_malignancy: false,
      recent_surgery: 0,
      immobilization: 0,
      estrogen_use: 1,
      pregnancy: false,
      thrombophilia: false,
      cc_dyspnea: 1,
      cc_chest_pain: 1,
      cc_leg_pain_swelling: 0,
      arrival_ambulance: 0,
    },
    safety_note: 'DUPLICATE ORDERING ALERT: CTA was performed 6 hours ago and was NEGATIVE for PE.',
  },
  
  expectedAlerts: {
    medicationGap: false,
    contrastRisk: false,
    iodineAllergy: false,
    duplicateOrdering: true,     // CTA < 48 hours ago
    shockIndexHigh: false,
  },
};

// ===========================================================================
// SEVERE RENAL PATIENT: Test, CKD
// ===========================================================================

export const SEVERE_RENAL_PATIENT: RichDemoPatient = {
  id: 'DEMO-CKD',
  name: 'Test, CKD',
  description: 'Patient with severe CKD - GFR 22 - contrast contraindicated',
  
  demographics: {
    age: 68,
    sex: 'male',
    weight: 82,
    height: 172,
  },
  
  vitals: {
    hr: 78,
    sbp: 145,
    dbp: 92,
    rr: 16,
    spo2: 97,
    temp: 36.9,
    timestamp: hoursAgo(1),
  },
  
  labs: {
    ddimer: 0.52,
    ddimerUnits: 'µg/mL',
    creatinine: 2.8,      // Severely elevated
    troponin: 0.02,
    inr: null,
    gfr: 22,              // CKD Stage 4
  },
  
  allergies: [],
  
  medicationDispenses: [
    {
      medication: 'Enoxaparin 80mg',
      medicationCode: '854228',
      whenHandedOver: daysAgo(3),
      daysSupply: 7,
      quantity: 7,
      dosageInstruction: '80mg subcutaneous daily',
    },
  ],
  
  activeMedications: [
    { name: 'Enoxaparin 80mg daily', status: 'active', type: 'Heparin_LMWH' },
  ],
  
  priorImaging: [
    {
      date: daysAgo(90),
      modality: 'V/Q',
      result: 'Low probability for PE.',
      code: '372096002',
    },
  ],
  
  historyFlags: {
    prior_pe: false,
    prior_dvt_vte: true,
    active_cancer: false,
    recent_surgery: true,
    immobilization: false,
    thrombophilia: false,
    pregnancy_estrogen: false,
  },
  
  assessmentData: {
    patient_id: 'DEMO-CKD',
    timestamp: new Date().toISOString(),
    probability: 0.145,
    threshold: 0.08,
    decision: 'continue_workup',
    explanation: 'Moderate probability of PE (14.5%). Prior DVT and recent surgery are risk factors. CRITICAL: GFR 22 - CONTRAST CONTRAINDICATED. Consider V/Q scan as alternative.',
    feature_summary: {
      age: 68,
      gender_male: 1,
      gender_female: 0,
      bmi: 27.7,
      triage_hr: 78,
      triage_rr: 16,
      triage_o2sat: 97,
      triage_sbp: 145,
      triage_dbp: 92,
      triage_temp: 36.9,
      d_dimer: 0.52,
      troponin: 0.02,
      creatinine: 2.8,
      wells_score: 3.0,
      wells_tachycardia: 0,
      wells_dvt_signs: 0,
      wells_pe_likely: 1,
      wells_hemoptysis: 0,
      geneva_score: 5,
      perc_score: 2,
      perc_negative: 0,
      shock_index: 0.54,
      prior_pe_diagnosis: 0,
      prior_dvt_diagnosis: 1,
      prior_pe_dvt: true,
      prior_cancer: 0,
      active_cancer: false,
      active_malignancy: false,
      recent_surgery: 1,
      immobilization: 0,
      estrogen_use: 0,
      pregnancy: false,
      thrombophilia: false,
      cc_dyspnea: 1,
      cc_chest_pain: 0,
      cc_leg_pain_swelling: 0,
      arrival_ambulance: 0,
    },
    safety_note: 'CRITICAL: GFR 22 - CKD Stage 4. Contrast is CONTRAINDICATED. Consider V/Q scan.',
  },
  
  expectedAlerts: {
    medicationGap: false,       // On enoxaparin, still covered
    contrastRisk: true,         // GFR < 30 = RED
    iodineAllergy: false,
    duplicateOrdering: false,
    shockIndexHigh: false,
  },
};

// ===========================================================================
// Exports
// ===========================================================================

export const RICH_DEMO_PATIENTS: RichDemoPatient[] = [
  HIGH_RISK_PATIENT,
  LOW_RISK_PATIENT,
  WARFARIN_PATIENT,
  RECENT_CTA_PATIENT,
  SEVERE_RENAL_PATIENT,
];

export const DEFAULT_RICH_PATIENT = HIGH_RISK_PATIENT;

/**
 * Convert RichDemoPatient to DemoScenario for compatibility with existing demo selector
 */
export function richPatientToDemoScenario(patient: RichDemoPatient): DemoScenario {
  return {
    id: patient.id,
    name: patient.name,
    description: patient.description,
    data: patient.assessmentData,
  };
}

/**
 * Get all rich patients as DemoScenario array
 */
export function getRichDemoScenarios(): DemoScenario[] {
  return RICH_DEMO_PATIENTS.map(richPatientToDemoScenario);
}

/**
 * Find rich patient by ID
 */
export function findRichPatient(id: string): RichDemoPatient | undefined {
  return RICH_DEMO_PATIENTS.find(p => p.id === id);
}
