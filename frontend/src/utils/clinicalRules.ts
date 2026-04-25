/**
 * Clinical Rules Engine for Luminur HUD Dashboard
 *
 * Centralized logic for safety badges and clinical decision support.
 * All functions are pure and deterministic for easy testing.
 */

import { CT } from './clinicalThresholds.generated';

// ===========================================================================
// Types
// ===========================================================================

export type RenalSafetyStatus = 'safe' | 'caution' | 'stop';
export type MedAdherenceStatus = 'protected' | 'gap' | 'unknown';
export type AllergyRisk = 'none' | 'contrast' | 'iodine' | 'both';

export interface RenalSafetyResult {
  status: RenalSafetyStatus;
  gfr: number | null;
  creatinine: number | null;
  label: string;
  color: 'green' | 'yellow' | 'red' | 'gray';
}

export interface MedAdherenceResult {
  status: MedAdherenceStatus;
  drugName: string | null;
  daysGap: number | null;
  lastRefillDate: string | null;
  label: string;
  color: 'green' | 'red' | 'gray';
}

export interface AllergyResult {
  risk: AllergyRisk;
  hasContrastAllergy: boolean;
  hasIodineAllergy: boolean;
  substances: string[];
  label: string;
  visible: boolean;
}

export interface DuplicateScanResult {
  isDuplicate: boolean;
  lastScanDate: string | null;
  hoursAgo: number | null;
  scanType: string | null;
  label: string;
}

export interface DDimerThresholdResult {
  value: number;
  threshold: number;
  isAgeAdjusted: boolean;
  isElevated: boolean;
  percentOfThreshold: number;
  label: string;
}

export interface ClinicalTimelineEvent {
  id: string;
  type: 'imaging' | 'diagnosis' | 'procedure' | 'medication';
  title: string;
  date: string;
  relativeTime: string;
  relevance: 'high' | 'medium' | 'low';
  icon: string;
}

// ===========================================================================
// Renal Safety Logic
// ===========================================================================

/**
 * Calculate renal safety status for contrast administration
 * 
 * Rules:
 * - GFR > 60: Safe (Green)
 * - GFR 30-60: Caution (Yellow)  
 * - GFR < 30: Stop / Contrast Risk (Red)
 * - Creatinine > 1.5 also triggers caution
 * - Creatinine > 2.0 triggers stop
 */
export function calculateRenalSafety(
  creatinine: number | null | undefined,
  gfr: number | null | undefined
): RenalSafetyResult {
  // Normalize undefined to null
  const cr = creatinine ?? null;
  const g = gfr ?? null;
  
  // No data available
  if (cr === null && g === null) {
    return {
      status: 'caution',
      gfr: null,
      creatinine: null,
      label: 'Renal Unknown',
      color: 'gray'
    };
  }

  // GFR-based assessment (preferred)
  if (g !== null) {
    if (g < CT.gfr.CAUTION_MIN) {
      return {
        status: 'stop',
        gfr: g,
        creatinine: cr,
        label: 'Contrast Risk',
        color: 'red'
      };
    }
    if (g < CT.gfr.SAFE_MIN) {
      return {
        status: 'caution',
        gfr: g,
        creatinine: cr,
        label: 'Caution',
        color: 'yellow'
      };
    }
    return {
      status: 'safe',
      gfr: g,
      creatinine: cr,
      label: 'Safe',
      color: 'green'
    };
  }

  // Creatinine-only assessment (fallback)
  if (cr !== null) {
    if (cr > 2.0) {
      return {
        status: 'stop',
        gfr: null,
        creatinine: cr,
        label: 'Contrast Risk',
        color: 'red'
      };
    }
    if (cr > 1.5) {
      return {
        status: 'caution',
        gfr: null,
        creatinine: cr,
        label: 'Caution',
        color: 'yellow'
      };
    }
    return {
      status: 'safe',
      gfr: null,
      creatinine: cr,
      label: 'Safe',
      color: 'green'
    };
  }

  return {
    status: 'caution',
    gfr: null,
    creatinine: null,
    label: 'Unknown',
    color: 'gray'
  };
}

// ===========================================================================
// Medication Adherence Logic
// ===========================================================================

/**
 * Calculate medication adherence status
 * 
 * Rules:
 * - If (Today - LastRefillDate) > (DaysSupply + 5): Gap Detected (Red)
 * - If covered: Protected (Green)
 * - No data: Unknown (Gray)
 */
export function calculateMedAdherence(
  lastDispenseDate: string | null | undefined,
  daysSupply: number | null | undefined,
  drugName: string | null | undefined
): MedAdherenceResult {
  // No data - return "Unknown Risk" gracefully
  if (!lastDispenseDate || daysSupply === null || daysSupply === undefined) {
    return {
      status: 'unknown',
      drugName: drugName ?? null,
      daysGap: null,
      lastRefillDate: null,
      label: 'Unknown Risk',
      color: 'gray'
    };
  }

  // Validate date string - handle invalid dates gracefully
  const dispenseDate = new Date(lastDispenseDate);
  if (isNaN(dispenseDate.getTime())) {
    return {
      status: 'unknown',
      drugName: drugName ?? null,
      daysGap: null,
      lastRefillDate: null,
      label: 'Unknown Risk',
      color: 'gray'
    };
  }

  const today = new Date();
  const daysSinceDispense = Math.floor(
    (today.getTime() - dispenseDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Gap threshold: daysSupply + 5 days grace period
  const gapThreshold = daysSupply + 5;
  const daysGap = daysSinceDispense - daysSupply;

  if (daysSinceDispense > gapThreshold) {
    return {
      status: 'gap',
      drugName: drugName ?? null,
      daysGap: daysGap,
      lastRefillDate: lastDispenseDate,
      label: `Gap: ${daysGap}d`,
      color: 'red'
    };
  }

  return {
    status: 'protected',
    drugName: drugName ?? null,
    daysGap: 0,
    lastRefillDate: lastDispenseDate,
    label: `Protected: ${drugName || 'Anticoag'}`,
    color: 'green'
  };
}

// ===========================================================================
// Allergy Logic
// ===========================================================================

const CONTRAST_TERMS = [
  'contrast', 'iodinated', 'iopamidol', 'isovue', 'iohexol',
  'omnipaque', 'ioxaglate', 'iopromide', 'iodixanol', 'visipaque'
];

const IODINE_TERMS = ['iodine', 'iodide', 'iodinated'];

/**
 * Check for contrast/iodine allergies
 */
export function checkAllergyRisk(
  allergies: Array<{ substance: string; code?: string }> | null | undefined
): AllergyResult {
  if (!allergies || allergies.length === 0) {
    return {
      risk: 'none',
      hasContrastAllergy: false,
      hasIodineAllergy: false,
      substances: [],
      label: '',
      visible: false
    };
  }

  let hasContrast = false;
  let hasIodine = false;
  const relevantSubstances: string[] = [];

  for (const allergy of allergies) {
    const normalized = allergy.substance.toLowerCase();
    
    if (CONTRAST_TERMS.some(term => normalized.includes(term))) {
      hasContrast = true;
      relevantSubstances.push(allergy.substance);
    }
    
    if (IODINE_TERMS.some(term => normalized.includes(term))) {
      hasIodine = true;
      if (!relevantSubstances.includes(allergy.substance)) {
        relevantSubstances.push(allergy.substance);
      }
    }
  }

  if (hasContrast && hasIodine) {
    return {
      risk: 'both',
      hasContrastAllergy: true,
      hasIodineAllergy: true,
      substances: relevantSubstances,
      label: 'Contrast & Iodine',
      visible: true
    };
  }

  if (hasContrast) {
    return {
      risk: 'contrast',
      hasContrastAllergy: true,
      hasIodineAllergy: false,
      substances: relevantSubstances,
      label: 'Contrast Allergy',
      visible: true
    };
  }

  if (hasIodine) {
    return {
      risk: 'iodine',
      hasContrastAllergy: false,
      hasIodineAllergy: true,
      substances: relevantSubstances,
      label: 'Iodine Allergy',
      visible: true
    };
  }

  return {
    risk: 'none',
    hasContrastAllergy: false,
    hasIodineAllergy: false,
    substances: [],
    label: '',
    visible: false
  };
}

// ===========================================================================
// Duplicate Scan Detection
// ===========================================================================

/**
 * Check if a recent scan exists (< 48 hours)
 * 
 * Returns true if last scan was within 48 hours (duplicate ordering risk)
 */
export function isDuplicateScan(
  lastScanDate: string | null | undefined,
  scanType?: string | null
): DuplicateScanResult {
  if (!lastScanDate) {
    return {
      isDuplicate: false,
      lastScanDate: null,
      hoursAgo: null,
      scanType: null,
      label: ''
    };
  }

  const scanDate = new Date(lastScanDate);
  const now = new Date();
  const hoursAgo = Math.floor((now.getTime() - scanDate.getTime()) / (1000 * 60 * 60));

  const isDup = hoursAgo < 48;

  return {
    isDuplicate: isDup,
    lastScanDate,
    hoursAgo,
    scanType: scanType ?? null,
    label: isDup 
      ? `Duplicate Risk: ${scanType || 'Scan'} ${hoursAgo}h ago`
      : ''
  };
}

// ===========================================================================
// D-Dimer Age-Adjusted Threshold
// ===========================================================================

/**
 * Calculate age-adjusted D-Dimer threshold
 * 
 * Rules:
 * - Age ≤ 50: Threshold = 0.50 µg/mL (500 ng/mL)
 * - Age > 50: Threshold = Age × 0.01 µg/mL (Age × 10 ng/mL)
 */
export function calculateDDimerThreshold(
  value: number | null | undefined,
  age: number | null | undefined,
  units: 'ug/mL' | 'ng/mL' = 'ug/mL'
): DDimerThresholdResult {
  // Normalize value to µg/mL
  const normalizedValue = value != null 
    ? (units === 'ng/mL' ? value / 1000 : value)
    : 0;

  const patientAge = age ?? 50; // Default to 50 if unknown
  const isAgeAdjusted = patientAge > 50;

  // Thresholds sourced from CT (clinical-thresholds.json via codegen)
  const highScoreThresholdUgMl = CT.years.DDIMER_HIGH_SCORE_NGML / 1000; // 500 ng/mL → 0.5 µg/mL
  const threshold = isAgeAdjusted
    ? patientAge * (CT.years.DDIMER_HIGH_SCORE_NGML / 1000 / 50) // age × 0.01 µg/mL
    : highScoreThresholdUgMl;

  const isElevated = normalizedValue > threshold;
  const percentOfThreshold = threshold > 0 
    ? Math.round((normalizedValue / threshold) * 100)
    : 0;

  let label: string;
  if (value == null) {
    label = 'Pending';
  } else if (isElevated) {
    label = `Elevated (>${threshold.toFixed(2)})`;
  } else {
    label = `Normal (<${threshold.toFixed(2)})`;
  }

  return {
    value: normalizedValue,
    threshold,
    isAgeAdjusted,
    isElevated,
    percentOfThreshold,
    label
  };
}

// ===========================================================================
// Clinical Timeline Generation
// ===========================================================================

/**
 * Generate PE-relevant clinical timeline events
 * 
 * Only includes PE-relevant history:
 * - Prior CT/CTA/V/Q scans
 * - DVT/PE diagnoses
 * - Recent surgeries
 * - Relevant medications
 */
export function generateClinicalTimeline(data: {
  priorImaging?: Array<{ date: string; modality: string; result?: string }>;
  priorDVT?: { date?: string; diagnosed?: boolean };
  priorPE?: { date?: string; diagnosed?: boolean };
  recentSurgery?: { date?: string; type?: string };
  immobilization?: { date?: string; reason?: string };
}): ClinicalTimelineEvent[] {
  const events: ClinicalTimelineEvent[] = [];

  // Prior imaging (CT, CTA, V/Q)
  if (data.priorImaging) {
    for (const img of data.priorImaging) {
      const modality = img.modality.toUpperCase();
      if (modality.includes('CT') || modality.includes('CTA') || 
          modality.includes('V/Q') || modality.includes('CTPA')) {
        events.push({
          id: `img-${img.date}`,
          type: 'imaging',
          title: `${img.modality} - ${img.result || 'Result pending'}`,
          date: img.date,
          relativeTime: formatRelativeTime(img.date),
          relevance: 'high',
          icon: '📷'
        });
      }
    }
  }

  // Prior DVT
  if (data.priorDVT?.diagnosed && data.priorDVT.date) {
    events.push({
      id: `dvt-${data.priorDVT.date}`,
      type: 'diagnosis',
      title: 'DVT Diagnosed',
      date: data.priorDVT.date,
      relativeTime: formatRelativeTime(data.priorDVT.date),
      relevance: 'high',
      icon: '🩺'
    });
  }

  // Prior PE
  if (data.priorPE?.diagnosed && data.priorPE.date) {
    events.push({
      id: `pe-${data.priorPE.date}`,
      type: 'diagnosis',
      title: 'Prior PE',
      date: data.priorPE.date,
      relativeTime: formatRelativeTime(data.priorPE.date),
      relevance: 'high',
      icon: '🫁'
    });
  }

  // Recent surgery
  if (data.recentSurgery?.date) {
    events.push({
      id: `surgery-${data.recentSurgery.date}`,
      type: 'procedure',
      title: `Surgery: ${data.recentSurgery.type || 'Procedure'}`,
      date: data.recentSurgery.date,
      relativeTime: formatRelativeTime(data.recentSurgery.date),
      relevance: 'medium',
      icon: '🔪'
    });
  }

  // Immobilization
  if (data.immobilization?.date) {
    events.push({
      id: `immob-${data.immobilization.date}`,
      type: 'procedure',
      title: `Immobilized: ${data.immobilization.reason || 'Extended bed rest'}`,
      date: data.immobilization.date,
      relativeTime: formatRelativeTime(data.immobilization.date),
      relevance: 'medium',
      icon: '🛏️'
    });
  }

  // Sort by date (most recent first)
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return events;
}

// ===========================================================================
// Utility Functions
// ===========================================================================

/**
 * Format relative time (e.g., "3 days ago", "2 years ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
}

/**
 * Calculate Wells Score from components
 */
export function calculateWellsScore(components: {
  clinicalDVT?: boolean;
  peLikely?: boolean;
  hr100?: boolean;
  immobilization?: boolean;
  priorVTE?: boolean;
  hemoptysis?: boolean;
  malignancy?: boolean;
}): { score: number; risk: 'low' | 'moderate' | 'high' } {
  let score = 0;
  
  if (components.clinicalDVT) score += 3;
  if (components.peLikely) score += 3;
  if (components.hr100) score += 1.5;
  if (components.immobilization) score += 1.5;
  if (components.priorVTE) score += 1.5;
  if (components.hemoptysis) score += 1;
  if (components.malignancy) score += 1;

  const risk = score < 2 ? 'low' : score <= 6 ? 'moderate' : 'high';

  return { score, risk };
}

/**
 * Calculate PERC Rule
 */
export function calculatePERC(components: {
  age50?: boolean;
  hr100?: boolean;
  spo2lt95?: boolean;
  priorVTE?: boolean;
  surgery4wk?: boolean;
  hemoptysis?: boolean;
  legSwelling?: boolean;
  estrogenUse?: boolean;
}): { positiveCount: number; isNegative: boolean } {
  const positiveCount = Object.values(components).filter(Boolean).length;
  return {
    positiveCount,
    isNegative: positiveCount === 0
  };
}
