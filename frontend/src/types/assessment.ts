/**
 * Type definitions for PE Rule-Out Dashboard
 * These types model the data flowing from the backend API and internal UI state.
 */

export type Decision = 'rule_out' | 'continue_workup';

export type DataCompletenessLevel = 'complete' | 'some_missing' | 'critical_missing';

export interface VitalSign {
  value: number | null;
  unit: string;
  timestamp?: string;
  isMissing: boolean;
  isAbnormal?: boolean;
  normalRange?: { min: number; max: number };
}

export interface LabValue {
  value: number | null;
  unit: string;
  timestamp?: string;
  isMissing: boolean;
  isAbnormal?: boolean;
  normalRange?: { min: number; max: number };
}

export interface PatientContext {
  id: string;
  name?: string;
  age?: number;
  sex?: 'Male' | 'Female' | 'Unknown';
  encounterTimestamp?: string;
  lastUpdated: string;
}

export interface FeatureSummary {
  // Demographics
  age?: number;
  sex?: string;
  bmi?: number;
  
  // Vitals
  heartRate?: number;
  respiratoryRate?: number;
  spO2?: number;
  systolicBP?: number;
  diastolicBP?: number;
  temperature?: number;
  
  // Labs
  dDimer?: number;
  troponin?: number;
  creatinine?: number;
  
  // Clinical scores
  wellsScore?: number;
  percScore?: number;
  shockIndex?: number;
  
  // Risk factors
  priorPE?: boolean;
  priorDVT?: boolean;
  cancer?: boolean;
  recentSurgery?: boolean;
  immobilization?: boolean;
  
  // Chief complaints
  dyspnea?: boolean;
  chestPain?: boolean;
  legPainSwelling?: boolean;
  
  // Raw feature map from API
  [key: string]: any;
}

export interface MissingField {
  fieldName: string;
  displayName: string;
  isCritical: boolean;
  troubleshootingHint?: string;
}

export interface KeyContributor {
  factor: string;
  direction: 'increases' | 'decreases' | 'neutral';
  description: string;
}

export interface AssessmentResult {
  patientId: string;
  timestamp: string;
  probability: number;
  threshold: number;
  decision: Decision;
  explanation: string;
  featureSummary: FeatureSummary;
  safetyNote: string;
  
  // Derived fields for UI
  dataCompleteness: DataCompletenessLevel;
  missingFields: MissingField[];
  keyContributors: KeyContributor[];
}

export interface AssessmentError {
  message: string;
  code?: string;
  details?: string;
  canRetry: boolean;
}

// API response shape (snake_case from backend)
export interface APIAssessmentResponse {
  patient_id: string;
  timestamp: string;
  probability: number;
  threshold: number;
  decision: string;
  explanation: string;
  feature_summary: Record<string, any>;
  safety_note: string;
}

// Demo data for testing without backend
export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  data: APIAssessmentResponse;
  // Extended data for HUD components (optional, used by pitch scenarios)
  extendedData?: {
    vitals?: {
      hr?: number | null;
      sbp?: number | null;
      dbp?: number | null;
      rr?: number | null;
      spo2?: number | null;
      temp?: number | null;
      timestamp?: string;
    };
    labs?: {
      ddimer?: number | null;
      ddimerUnits?: string;
      creatinine?: number | null;
      gfr?: number | null;
      troponin?: number | null;
      inr?: number | null;
    };
    medications?: {
      current?: Array<{ name: string; type: string; status: string }>;
      lastDispense?: {
        drug?: string;
        date?: string;
        daysSupply?: number;
      };
    };
    allergies?: Array<{ substance: string; reaction?: string; code?: string }>;
    priorImaging?: Array<{ date: string; modality: string; result?: string }>;
    clinicalHistory?: {
      priorDVT?: { date?: string; diagnosed?: boolean };
      priorPE?: { date?: string; diagnosed?: boolean };
      recentSurgery?: { date?: string; type?: string };
    };
  };
}

