/**
 * Utility functions for transforming API responses into UI-friendly formats
 */

import type {
  APIAssessmentResponse,
  AssessmentResult,
  DataCompletenessLevel,
  MissingField,
  KeyContributor,
  Decision
} from '../types/assessment';

// Fields that are critical for assessment reliability
const CRITICAL_FIELDS = ['age', 'triage_hr', 'triage_rr', 'triage_o2sat', 'triage_sbp'];
const IMPORTANT_FIELDS = ['d_dimer', 'gender_male', 'gender_female', 'triage_dbp', 'triage_temp'];
const OPTIONAL_FIELDS = ['troponin', 'creatinine', 'bmi', 'wells_score', 'perc_score'];

// Human-readable field names
const FIELD_DISPLAY_NAMES: Record<string, string> = {
  age: 'Age',
  gender_male: 'Sex (Male)',
  gender_female: 'Sex (Female)',
  bmi: 'BMI',
  triage_hr: 'Heart Rate',
  triage_rr: 'Respiratory Rate',
  triage_o2sat: 'Oxygen Saturation (SpO₂)',
  triage_sbp: 'Systolic Blood Pressure',
  triage_dbp: 'Diastolic Blood Pressure',
  triage_temp: 'Temperature',
  d_dimer: 'D-Dimer',
  troponin: 'Troponin',
  creatinine: 'Creatinine',
  wells_score: 'Wells Score',
  perc_score: 'PERC Score',
  prior_pe_diagnosis: 'Prior PE History',
  prior_dvt_diagnosis: 'Prior DVT History',
  prior_cancer: 'Cancer History',
  cc_dyspnea: 'Dyspnea Present',
  cc_chest_pain: 'Chest Pain Present',
  cc_leg_pain_swelling: 'Leg Pain/Swelling'
};

// Troubleshooting hints for missing fields
const TROUBLESHOOTING_HINTS: Record<string, string> = {
  age: 'Check that patient demographics are present in the chart (Age/DOB).',
  gender_male: 'Verify patient sex is documented in demographics.',
  gender_female: 'Verify patient sex is documented in demographics.',
  triage_hr: 'Heart rate may not have been recorded during triage. Check vitals flowsheet.',
  triage_rr: 'Respiratory rate may not have been recorded during triage.',
  triage_o2sat: 'SpO₂ may not have been recorded. Check if pulse oximetry was performed.',
  triage_sbp: 'Blood pressure may not have been recorded during triage.',
  d_dimer: 'D-Dimer lab may not have been ordered or resulted yet.',
  troponin: 'Troponin lab may not have been ordered or resulted yet.',
  creatinine: 'Basic metabolic panel may not have been ordered or resulted yet.'
};

/**
 * Analyze feature summary to determine data completeness level
 */
export function analyzeDataCompleteness(features: Record<string, any>): {
  level: DataCompletenessLevel;
  missingFields: MissingField[];
} {
  const missingFields: MissingField[] = [];
  
  // Check critical fields
  for (const field of CRITICAL_FIELDS) {
    if (features[field] === null || features[field] === undefined) {
      missingFields.push({
        fieldName: field,
        displayName: FIELD_DISPLAY_NAMES[field] || field,
        isCritical: true,
        troubleshootingHint: TROUBLESHOOTING_HINTS[field]
      });
    }
  }
  
  // Check important fields
  for (const field of IMPORTANT_FIELDS) {
    if (features[field] === null || features[field] === undefined) {
      missingFields.push({
        fieldName: field,
        displayName: FIELD_DISPLAY_NAMES[field] || field,
        isCritical: false,
        troubleshootingHint: TROUBLESHOOTING_HINTS[field]
      });
    }
  }
  
  // Check optional fields (mark as non-critical)
  for (const field of OPTIONAL_FIELDS) {
    if (features[field] === null || features[field] === undefined) {
      missingFields.push({
        fieldName: field,
        displayName: FIELD_DISPLAY_NAMES[field] || field,
        isCritical: false,
        troubleshootingHint: TROUBLESHOOTING_HINTS[field]
      });
    }
  }
  
  // Determine overall level
  const criticalMissingCount = missingFields.filter(f => f.isCritical).length;
  const totalMissingCount = missingFields.length;
  
  let level: DataCompletenessLevel;
  if (criticalMissingCount > 0) {
    level = 'critical_missing';
  } else if (totalMissingCount > 0) {
    level = 'some_missing';
  } else {
    level = 'complete';
  }
  
  return { level, missingFields };
}

/**
 * Derive key contributors from feature summary
 * This is a simplified rule-based approach; a real implementation would use model coefficients
 */
export function deriveKeyContributors(features: Record<string, any>, decision: Decision): KeyContributor[] {
  const contributors: KeyContributor[] = [];
  
  // Check vitals for abnormalities
  if (features.triage_hr !== null && features.triage_hr !== undefined) {
    if (features.triage_hr > 100) {
      contributors.push({
        factor: 'Tachycardia',
        direction: 'increases',
        description: `Heart rate elevated (${features.triage_hr} bpm > 100)`
      });
    } else if (features.triage_hr < 60) {
      contributors.push({
        factor: 'Bradycardia',
        direction: 'neutral',
        description: `Heart rate low (${features.triage_hr} bpm)`
      });
    }
  }
  
  if (features.triage_o2sat !== null && features.triage_o2sat !== undefined) {
    if (features.triage_o2sat < 95) {
      contributors.push({
        factor: 'Hypoxia',
        direction: 'increases',
        description: `SpO₂ below normal (${features.triage_o2sat}% < 95%)`
      });
    }
  }
  
  if (features.triage_rr !== null && features.triage_rr !== undefined) {
    if (features.triage_rr > 20) {
      contributors.push({
        factor: 'Tachypnea',
        direction: 'increases',
        description: `Respiratory rate elevated (${features.triage_rr}/min > 20)`
      });
    }
  }
  
  // Check D-Dimer
  if (features.d_dimer !== null && features.d_dimer !== undefined) {
    if (features.d_dimer > 0.5) {
      contributors.push({
        factor: 'Elevated D-Dimer',
        direction: 'increases',
        description: `D-Dimer ${features.d_dimer} μg/mL (>0.5)`
      });
    } else {
      contributors.push({
        factor: 'Normal D-Dimer',
        direction: 'decreases',
        description: `D-Dimer ${features.d_dimer} μg/mL (≤0.5)`
      });
    }
  }
  
  // Check shock index
  if (features.shock_index !== null && features.shock_index !== undefined) {
    if (features.shock_index > 1.0) {
      contributors.push({
        factor: 'Elevated Shock Index',
        direction: 'increases',
        description: `Shock index ${features.shock_index.toFixed(2)} (>1.0)`
      });
    }
  }
  
  // Check history
  if (features.prior_pe_diagnosis === 1 || features.prior_pe_diagnosis === true) {
    contributors.push({
      factor: 'Prior PE',
      direction: 'increases',
      description: 'History of prior pulmonary embolism'
    });
  }
  
  if (features.prior_dvt_diagnosis === 1 || features.prior_dvt_diagnosis === true) {
    contributors.push({
      factor: 'Prior DVT',
      direction: 'increases',
      description: 'History of deep vein thrombosis'
    });
  }
  
  if (features.prior_cancer === 1 || features.prior_cancer === true) {
    contributors.push({
      factor: 'Cancer History',
      direction: 'increases',
      description: 'Active or recent malignancy'
    });
  }
  
  // Check PERC
  if (features.perc_negative === 1 || features.perc_negative === true) {
    contributors.push({
      factor: 'PERC Negative',
      direction: 'decreases',
      description: 'Patient meets PERC criteria for low risk'
    });
  }
  
  // Age factor
  if (features.age !== null && features.age !== undefined) {
    if (features.age >= 65) {
      contributors.push({
        factor: 'Advanced Age',
        direction: 'increases',
        description: `Age ${features.age} years (≥65)`
      });
    } else if (features.age < 50 && decision === 'rule_out') {
      contributors.push({
        factor: 'Younger Age',
        direction: 'decreases',
        description: `Age ${features.age} years (<50)`
      });
    }
  }
  
  // Sort by direction: increases first for continue_workup, decreases first for rule_out
  if (decision === 'continue_workup') {
    contributors.sort((a, b) => {
      if (a.direction === 'increases' && b.direction !== 'increases') return -1;
      if (a.direction !== 'increases' && b.direction === 'increases') return 1;
      return 0;
    });
  } else {
    contributors.sort((a, b) => {
      if (a.direction === 'decreases' && b.direction !== 'decreases') return -1;
      if (a.direction !== 'decreases' && b.direction === 'decreases') return 1;
      return 0;
    });
  }
  
  return contributors.slice(0, 5); // Top 5 contributors
}

/**
 * Transform API response to UI-friendly format
 */
export function transformAPIResponse(response: APIAssessmentResponse): AssessmentResult {
  const { level, missingFields } = analyzeDataCompleteness(response.feature_summary);
  const decision = response.decision as Decision;
  const keyContributors = deriveKeyContributors(response.feature_summary, decision);
  
  return {
    patientId: response.patient_id,
    timestamp: response.timestamp,
    probability: response.probability,
    threshold: response.threshold,
    decision,
    explanation: response.explanation,
    featureSummary: response.feature_summary,
    safetyNote: response.safety_note,
    dataCompleteness: level,
    missingFields,
    keyContributors
  };
}

/**
 * Format probability as percentage
 */
export function formatProbability(prob: number): string {
  return `${(prob * 100).toFixed(1)}%`;
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Calculate time ago string
 */
export function timeAgo(isoString: string): string {
  const now = new Date();
  const then = new Date(isoString);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * Get human-readable field name
 */
export function getFieldDisplayName(fieldName: string): string {
  return FIELD_DISPLAY_NAMES[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

