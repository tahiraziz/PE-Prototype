/**
 * Clinical Logic Engine for Luminur PE Decision Support
 *
 * Centralized calculations for:
 * - Medication adherence analysis
 * - Shock Index calculation
 * - Age-adjusted D-Dimer thresholding
 * - Wells/PERC score calculations
 * - GFR estimation
 */

import { CT } from './clinicalThresholds.generated';

// ===========================================================================
// Types
// ===========================================================================

export interface MedicationDispense {
  medication: string;
  medicationCode?: string;
  whenHandedOver: string; // ISO date
  daysSupply?: number;
  quantity?: number;
  dosageInstruction?: string;
}

export interface VitalSigns {
  hr?: number | null;
  sbp?: number | null;
  dbp?: number | null;
  rr?: number | null;
  spo2?: number | null;
  temp?: number | null;
  timestamp?: string | null;
}

export interface LabValues {
  ddimer?: number | null;
  ddimerUnits?: string | null;
  creatinine?: number | null;
  troponin?: number | null;
  inr?: number | null;
  gfr?: number | null;
}

export interface PatientDemographics {
  age?: number | null;
  sex?: 'male' | 'female' | 'unknown';
  weight?: number | null; // kg
  height?: number | null; // cm
}

export interface AllergyInfo {
  substance: string;
  code?: string;
  reaction?: string;
  severity?: 'low' | 'high' | 'unable-to-assess';
}

export interface AnticoagulationStatus {
  status: 'protected' | 'subtherapeutic' | 'gap' | 'none' | 'unknown';
  medication?: string;
  inr?: number | null;
  lastDispenseDate?: string | null;
  daysGap?: number | null;
  isAdherent: boolean;
}

export interface ShockIndexResult {
  value: number;
  risk: 'normal' | 'elevated' | 'high';
  description: string;
}

export interface DDimerResult {
  value: number;
  units: string;
  threshold: number;
  isAgeAdjusted: boolean;
  isElevated: boolean;
  interpretation: string;
}

export interface GFRResult {
  value: number;
  stage: 'G1' | 'G2' | 'G3a' | 'G3b' | 'G4' | 'G5';
  contrastSafe: boolean;
  description: string;
}

export interface SafetyFlags {
  gfrStatus: GFRResult | null;
  contrastAllergy: boolean;
  iodineAllergy: boolean;
  anticoagStatus: AnticoagulationStatus;
  canScan: boolean;
  warnings: string[];
}

// ===========================================================================
// Anticoagulant Classifications
// ===========================================================================

const ANTICOAGULANTS = {
  doacs: [
    'apixaban', 'eliquis',
    'rivaroxaban', 'xarelto',
    'dabigatran', 'pradaxa',
    'edoxaban', 'savaysa', 'lixiana'
  ],
  warfarin: ['warfarin', 'coumadin', 'jantoven'],
  heparins: [
    'heparin', 'enoxaparin', 'lovenox',
    'dalteparin', 'fragmin',
    'fondaparinux', 'arixtra',
    'tinzaparin'
  ],
  antiplatelets: [
    'aspirin', 'clopidogrel', 'plavix',
    'prasugrel', 'effient',
    'ticagrelor', 'brilinta'
  ]
};

// ===========================================================================
// Medication Adherence Logic
// ===========================================================================

/**
 * Determine if a medication is an anticoagulant
 */
export function isAnticoagulant(medicationName: string): boolean {
  const normalized = medicationName.toLowerCase();
  return [
    ...ANTICOAGULANTS.doacs,
    ...ANTICOAGULANTS.warfarin,
    ...ANTICOAGULANTS.heparins
  ].some(med => normalized.includes(med));
}

/**
 * Get anticoagulant type
 */
export function getAnticoagulantType(medicationName: string): 'doac' | 'warfarin' | 'heparin' | 'antiplatelet' | 'unknown' {
  const normalized = medicationName.toLowerCase();
  
  if (ANTICOAGULANTS.doacs.some(med => normalized.includes(med))) return 'doac';
  if (ANTICOAGULANTS.warfarin.some(med => normalized.includes(med))) return 'warfarin';
  if (ANTICOAGULANTS.heparins.some(med => normalized.includes(med))) return 'heparin';
  if (ANTICOAGULANTS.antiplatelets.some(med => normalized.includes(med))) return 'antiplatelet';
  
  return 'unknown';
}

/**
 * Calculate medication adherence from MedicationDispense history
 * 
 * Logic: Find latest dispense of anticoagulant, check if (Today - HandedOverDate) > daysSupply
 * If true, patient may be non-adherent
 */
export function calculateMedicationAdherence(
  dispenses: MedicationDispense[]
): AnticoagulationStatus {
  if (!dispenses || dispenses.length === 0) {
    return {
      status: 'unknown',
      isAdherent: true, // Assume adherent if no data
    };
  }

  // Filter to anticoagulants only
  const anticoagDispenses = dispenses.filter(d => isAnticoagulant(d.medication));
  
  if (anticoagDispenses.length === 0) {
    return {
      status: 'none',
      isAdherent: true,
    };
  }

  // Sort by date descending to get latest
  const sorted = anticoagDispenses.sort((a, b) => 
    new Date(b.whenHandedOver).getTime() - new Date(a.whenHandedOver).getTime()
  );

  const latest = sorted[0];
  const dispenseDate = new Date(latest.whenHandedOver);
  const today = new Date();
  const daysSinceDispense = Math.floor(
    (today.getTime() - dispenseDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Default to 30-day supply if not specified
  const daysSupply = latest.daysSupply || 30;
  
  // Calculate gap: if daysSinceDispense > daysSupply, there's a gap
  const gap = daysSinceDispense - daysSupply;
  const isNonAdherent = gap > 0;

  if (isNonAdherent) {
    return {
      status: 'gap',
      medication: latest.medication,
      lastDispenseDate: latest.whenHandedOver,
      daysGap: gap,
      isAdherent: false,
    };
  }

  return {
    status: 'protected',
    medication: latest.medication,
    lastDispenseDate: latest.whenHandedOver,
    daysGap: 0,
    isAdherent: true,
  };
}

/**
 * Get detailed anticoagulation status including INR for warfarin patients
 */
export function getAnticoagulationStatus(
  dispenses: MedicationDispense[],
  currentInr?: number | null
): AnticoagulationStatus {
  const adherenceStatus = calculateMedicationAdherence(dispenses);
  
  // If on warfarin, check INR status
  if (adherenceStatus.medication && 
      getAnticoagulantType(adherenceStatus.medication) === 'warfarin') {
    if (currentInr != null) {
      if (currentInr < 2.0) {
        return {
          ...adherenceStatus,
          status: 'subtherapeutic',
          inr: currentInr,
        };
      } else if (currentInr >= 2.0 && currentInr <= 3.0) {
        return {
          ...adherenceStatus,
          status: 'protected',
          inr: currentInr,
        };
      } else {
        // INR > 3.0 - supratherapeutic but still protected
        return {
          ...adherenceStatus,
          status: 'protected',
          inr: currentInr,
        };
      }
    }
  }
  
  return adherenceStatus;
}

// ===========================================================================
// Shock Index Calculation
// ===========================================================================

/**
 * Calculate Shock Index from vitals
 * 
 * Shock Index = Heart Rate / Systolic Blood Pressure
 * 
 * Interpretation:
 * - Normal: 0.5-0.7
 * - Elevated: 0.7-1.0 (concerning)
 * - High: >1.0 (shock, high mortality risk)
 */
export function calculateShockIndex(vitals: VitalSigns): ShockIndexResult | null {
  if (vitals.hr == null || vitals.sbp == null || vitals.sbp === 0) {
    return null;
  }

  const value = vitals.hr / vitals.sbp;
  const roundedValue = Math.round(value * 100) / 100;

  let risk: 'normal' | 'elevated' | 'high';
  let description: string;

  if (value <= CT.shockIndex.SAFE_MAX) {
    risk = 'normal';
    description = 'Normal hemodynamic status';
  } else if (value <= CT.shockIndex.CAUTION_MAX) {
    risk = 'elevated';
    description = 'Elevated - concerning for hemodynamic compromise';
  } else {
    risk = 'high';
    description = 'High risk - suggests shock or significant hemodynamic instability';
  }

  return {
    value: roundedValue,
    risk,
    description,
  };
}

// ===========================================================================
// Age-Adjusted D-Dimer Thresholding
// ===========================================================================

/**
 * Calculate age-adjusted D-Dimer threshold
 * 
 * Logic:
 * - If Age > 50: Threshold = Age × 10 ng/mL (or Age × 0.01 µg/mL)
 * - If Age ≤ 50: Threshold = 500 ng/mL (or 0.50 µg/mL)
 * 
 * Supports both ng/mL and µg/mL (FEU) units
 */
export function calculateAgeAdjustedDDimerThreshold(
  age: number,
  units: 'ng/mL' | 'ug/mL' | 'µg/mL' = 'ug/mL'
): number {
  const isNgMl = units === 'ng/mL';
  const baseThreshold = isNgMl ? 500 : 0.5;
  
  if (age <= 50) {
    return baseThreshold;
  }
  
  // Age-adjusted: age × 10 ng/mL or age × 0.01 µg/mL
  if (isNgMl) {
    return age * 10;
  } else {
    return age * 0.01;
  }
}

/**
 * Evaluate D-Dimer with age-adjusted threshold
 */
export function evaluateDDimer(
  value: number,
  age: number | null,
  units: string = 'µg/mL'
): DDimerResult {
  // Normalize units
  const normalizedUnits = units.toLowerCase().includes('ng') ? 'ng/mL' : 'ug/mL';
  
  // Convert value if needed for consistent comparison
  const valueInUgMl = normalizedUnits === 'ng/mL' ? value / 1000 : value;
  
  const canAgeAdjust = age != null && age > 50;
  const threshold = age != null 
    ? calculateAgeAdjustedDDimerThreshold(age, 'ug/mL')
    : 0.5;
  
  const isElevated = valueInUgMl > threshold;
  
  let interpretation: string;
  if (!isElevated) {
    interpretation = canAgeAdjust 
      ? `Below age-adjusted threshold (${threshold.toFixed(2)} µg/mL)`
      : 'Below standard threshold (0.50 µg/mL)';
  } else {
    interpretation = canAgeAdjust
      ? `Elevated above age-adjusted threshold (${threshold.toFixed(2)} µg/mL)`
      : 'Elevated above standard threshold (0.50 µg/mL)';
  }

  return {
    value: valueInUgMl,
    units: 'µg/mL',
    threshold,
    isAgeAdjusted: canAgeAdjust,
    isElevated,
    interpretation,
  };
}

// ===========================================================================
// GFR Estimation (CKD-EPI 2021)
// ===========================================================================

/**
 * Estimate GFR using CKD-EPI 2021 equation (race-free)
 * 
 * GFR = 142 × min(SCr/κ, 1)^α × max(SCr/κ, 1)^-1.200 × 0.9938^Age × 1.012 [if female]
 * 
 * Where:
 * - κ = 0.7 for females, 0.9 for males
 * - α = -0.241 for females, -0.302 for males
 */
export function estimateGFR(
  creatinine: number,
  age: number,
  sex: 'male' | 'female' | 'unknown'
): GFRResult | null {
  if (creatinine <= 0 || age <= 0) {
    return null;
  }

  // Default to female values if unknown (more conservative)
  const kappa = sex === 'male' ? 0.9 : 0.7;
  const alpha = sex === 'male' ? -0.302 : -0.241;
  const sexMultiplier = sex === 'male' ? 1.0 : 1.012;

  const scrOverKappa = creatinine / kappa;
  const minTerm = Math.min(scrOverKappa, 1);
  const maxTerm = Math.max(scrOverKappa, 1);

  const gfr = 142 * 
    Math.pow(minTerm, alpha) * 
    Math.pow(maxTerm, -1.200) * 
    Math.pow(0.9938, age) * 
    sexMultiplier;

  const roundedGfr = Math.round(gfr);

  // Determine CKD stage
  let stage: 'G1' | 'G2' | 'G3a' | 'G3b' | 'G4' | 'G5';
  let contrastSafe: boolean;
  let description: string;

  if (roundedGfr >= 90) {
    stage = 'G1';
    contrastSafe = true;
    description = 'Normal kidney function';
  } else if (roundedGfr >= 60) {
    stage = 'G2';
    contrastSafe = true;
    description = 'Mildly decreased kidney function';
  } else if (roundedGfr >= 45) {
    stage = 'G3a';
    contrastSafe = true;
    description = 'Mild-moderate decrease - contrast generally safe with hydration';
  } else if (roundedGfr >= 30) {
    stage = 'G3b';
    contrastSafe = false;
    description = 'Moderate-severe decrease - contrast risk elevated';
  } else if (roundedGfr >= 15) {
    stage = 'G4';
    contrastSafe = false;
    description = 'Severely decreased - high contrast nephropathy risk';
  } else {
    stage = 'G5';
    contrastSafe = false;
    description = 'Kidney failure - contrast contraindicated';
  }

  return {
    value: roundedGfr,
    stage,
    contrastSafe,
    description,
  };
}

// ===========================================================================
// Allergy Checking
// ===========================================================================

const CONTRAST_ALLERGY_TERMS = [
  'contrast', 'iodine', 'iodinated', 'iopamidol', 'isovue',
  'iohexol', 'omnipaque', 'ioxaglate', 'hexabrix',
  'iopromide', 'ultravist', 'iodixanol', 'visipaque',
  'gadolinium', 'magnevist', 'omniscan', 'prohance'
];

/**
 * Check if any allergies indicate contrast or iodine sensitivity
 */
export function checkContrastAllergies(allergies: AllergyInfo[]): {
  hasContrastAllergy: boolean;
  hasIodineAllergy: boolean;
  relevantAllergies: AllergyInfo[];
} {
  const relevantAllergies: AllergyInfo[] = [];
  let hasContrastAllergy = false;
  let hasIodineAllergy = false;

  for (const allergy of allergies) {
    const normalized = allergy.substance.toLowerCase();
    
    if (normalized.includes('iodine') || normalized.includes('iodide')) {
      hasIodineAllergy = true;
      relevantAllergies.push(allergy);
    }
    
    if (CONTRAST_ALLERGY_TERMS.some(term => normalized.includes(term))) {
      hasContrastAllergy = true;
      relevantAllergies.push(allergy);
    }
  }

  return {
    hasContrastAllergy,
    hasIodineAllergy,
    relevantAllergies,
  };
}

// ===========================================================================
// Comprehensive Safety Assessment
// ===========================================================================

/**
 * Generate comprehensive safety flags for the "Can I Scan?" badge
 */
export function assessSafetyFlags(
  demographics: PatientDemographics,
  labs: LabValues,
  allergies: AllergyInfo[],
  dispenses: MedicationDispense[]
): SafetyFlags {
  const warnings: string[] = [];

  // GFR Assessment
  let gfrStatus: GFRResult | null = null;
  if (labs.creatinine != null && demographics.age != null && demographics.sex) {
    gfrStatus = estimateGFR(labs.creatinine, demographics.age, demographics.sex);
    if (gfrStatus && !gfrStatus.contrastSafe) {
      warnings.push(`GFR ${gfrStatus.value} - ${gfrStatus.description}`);
    }
  } else if (labs.gfr != null) {
    // Use provided GFR if creatinine not available
    const providedGfr = labs.gfr;
    gfrStatus = {
      value: providedGfr,
      stage: providedGfr >= 90 ? 'G1' : providedGfr >= 60 ? 'G2' : providedGfr >= 45 ? 'G3a' : providedGfr >= 30 ? 'G3b' : providedGfr >= 15 ? 'G4' : 'G5',
      contrastSafe: providedGfr >= 30,
      description: providedGfr >= 30 ? 'Contrast generally safe' : 'Contrast risk elevated',
    };
    if (!gfrStatus.contrastSafe) {
      warnings.push(`GFR ${gfrStatus.value} - contrast risk elevated`);
    }
  }

  // Allergy Assessment
  const allergyCheck = checkContrastAllergies(allergies);
  if (allergyCheck.hasContrastAllergy) {
    warnings.push('Documented contrast allergy');
  }
  if (allergyCheck.hasIodineAllergy) {
    warnings.push('Documented iodine allergy');
  }

  // Anticoagulation Assessment
  const anticoagStatus = getAnticoagulationStatus(dispenses, labs.inr);
  if (anticoagStatus.status === 'gap' && anticoagStatus.daysGap) {
    warnings.push(`Medication gap: ${anticoagStatus.daysGap} days since last anticoagulant`);
  }
  if (anticoagStatus.status === 'subtherapeutic') {
    warnings.push(`Warfarin subtherapeutic (INR: ${anticoagStatus.inr})`);
  }

  // Overall "Can Scan" determination
  const canScan = (gfrStatus?.contrastSafe ?? true) && 
                  !allergyCheck.hasContrastAllergy && 
                  !allergyCheck.hasIodineAllergy;

  return {
    gfrStatus,
    contrastAllergy: allergyCheck.hasContrastAllergy,
    iodineAllergy: allergyCheck.hasIodineAllergy,
    anticoagStatus,
    canScan,
    warnings,
  };
}

// ===========================================================================
// Clinical Score Calculations
// ===========================================================================

export interface WellsScoreInputs {
  clinicalDvtSigns?: boolean;
  peLikelyDiagnosis?: boolean;
  heartRateOver100?: boolean;
  immobilizationOrSurgery?: boolean;
  previousPeDvt?: boolean;
  hemoptysis?: boolean;
  malignancy?: boolean;
}

export interface PERCInputs {
  ageOver50?: boolean;
  heartRateOver100?: boolean;
  spo2Under95?: boolean;
  previousPeDvt?: boolean;
  surgeryOrTrauma4Weeks?: boolean;
  hemoptysis?: boolean;
  unilateralLegSwelling?: boolean;
  estrogenUse?: boolean;
}

/**
 * Calculate Wells Score for PE
 * 
 * Scoring:
 * - Clinical signs of DVT: 3 points
 * - PE most likely diagnosis: 3 points
 * - Heart rate > 100: 1.5 points
 * - Immobilization/surgery in past 4 weeks: 1.5 points
 * - Previous PE/DVT: 1.5 points
 * - Hemoptysis: 1 point
 * - Active malignancy: 1 point
 */
export function calculateWellsScore(inputs: WellsScoreInputs): {
  score: number;
  risk: 'low' | 'moderate' | 'high';
  criteria: { name: string; points: number; met: boolean }[];
} {
  const criteria = [
    { name: 'Clinical signs of DVT', points: 3, met: inputs.clinicalDvtSigns ?? false },
    { name: 'PE most likely diagnosis', points: 3, met: inputs.peLikelyDiagnosis ?? false },
    { name: 'Heart rate > 100', points: 1.5, met: inputs.heartRateOver100 ?? false },
    { name: 'Immobilization/surgery (4 weeks)', points: 1.5, met: inputs.immobilizationOrSurgery ?? false },
    { name: 'Previous PE/DVT', points: 1.5, met: inputs.previousPeDvt ?? false },
    { name: 'Hemoptysis', points: 1, met: inputs.hemoptysis ?? false },
    { name: 'Active malignancy', points: 1, met: inputs.malignancy ?? false },
  ];

  const score = criteria.reduce((sum, c) => c.met ? sum + c.points : sum, 0);

  let risk: 'low' | 'moderate' | 'high';
  if (score < 2) {
    risk = 'low';
  } else if (score <= 6) {
    risk = 'moderate';
  } else {
    risk = 'high';
  }

  return { score, risk, criteria };
}

/**
 * Calculate PERC Rule
 * 
 * All 8 criteria must be NEGATIVE to rule out PE without D-Dimer:
 * 1. Age < 50
 * 2. Heart rate < 100
 * 3. SpO2 ≥ 95%
 * 4. No prior PE/DVT
 * 5. No surgery/trauma in past 4 weeks
 * 6. No hemoptysis
 * 7. No unilateral leg swelling
 * 8. No estrogen use
 */
export function calculatePERC(inputs: PERCInputs): {
  isNegative: boolean;
  positiveCount: number;
  criteria: { name: string; met: boolean }[];
} {
  const criteria = [
    { name: 'Age ≥ 50', met: inputs.ageOver50 ?? false },
    { name: 'Heart rate ≥ 100', met: inputs.heartRateOver100 ?? false },
    { name: 'SpO₂ < 95%', met: inputs.spo2Under95 ?? false },
    { name: 'Prior PE/DVT', met: inputs.previousPeDvt ?? false },
    { name: 'Surgery/trauma (4 weeks)', met: inputs.surgeryOrTrauma4Weeks ?? false },
    { name: 'Hemoptysis', met: inputs.hemoptysis ?? false },
    { name: 'Unilateral leg swelling', met: inputs.unilateralLegSwelling ?? false },
    { name: 'Estrogen use', met: inputs.estrogenUse ?? false },
  ];

  const positiveCount = criteria.filter(c => c.met).length;
  const isNegative = positiveCount === 0;

  return { isNegative, positiveCount, criteria };
}

// ===========================================================================
// Utility Formatters
// ===========================================================================

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Format anticoag status for display
 */
export function formatAnticoagStatus(status: AnticoagulationStatus): {
  badge: string;
  color: 'green' | 'yellow' | 'red' | 'gray';
  detail: string;
} {
  switch (status.status) {
    case 'protected':
      return {
        badge: `Protected (${status.medication || 'Anticoag'})`,
        color: 'green',
        detail: status.medication || 'On anticoagulation',
      };
    case 'subtherapeutic':
      return {
        badge: `Warfarin (INR: ${status.inr?.toFixed(1)} - Subtherapeutic)`,
        color: 'yellow',
        detail: `INR ${status.inr?.toFixed(1)} below therapeutic range`,
      };
    case 'gap':
      return {
        badge: `Med Gap: ${status.daysGap} Days`,
        color: 'red',
        detail: `Last ${status.medication} dispense was ${status.daysGap} days ago`,
      };
    case 'none':
      return {
        badge: 'No Anticoag',
        color: 'gray',
        detail: 'No active anticoagulation therapy',
      };
    default:
      return {
        badge: 'Unknown',
        color: 'gray',
        detail: 'Anticoagulation status not determined',
      };
  }
}
