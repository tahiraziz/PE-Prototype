// AUTO-GENERATED — do not edit manually.
// Source: frontend/src/docs/clinical-thresholds.json
// Last synced: 2026-04-25T20:46:27Z
// To update: edit thresholds in the Clinical Thresholds doc tab — changes sync here automatically.

export const CT = {
  vitals: {
    /** Alert fires when HR exceeds this value (bpm) */
    HR_ALERT: 100.0,
    /** Alert fires when SBP falls below this value (mmHg) */
    SBP_ALERT: 90.0,
    /** Alert fires when SpO2 falls below this value (%) */
    SPO2_ALERT: 95.0,
    /** Alert fires when RR exceeds this value (/min) */
    RR_ALERT: 20.0,
    /** Alert fires when temperature exceeds this value (°C) */
    TEMP_ALERT: 38.0,
  },
  shockIndex: {
    /** Shock index ≤ this value → Safe */
    SAFE_MAX: 0.7,
    /** Shock index ≤ this value → Caution (above SAFE_MAX) */
    CAUTION_MAX: 0.9,
  },
  gfr: {
    /** GFR ≥ this value → Safe for contrast */
    SAFE_MIN: 60.0,
    /** GFR ≥ this value → Caution (below SAFE_MIN) */
    CAUTION_MIN: 30.0,
  },
  years: {
    /** D-dimer threshold (ng/mL) when YEARS score = 0 */
    DDIMER_ZERO_SCORE_NGML: 1000.0,
    /** D-dimer threshold (ng/mL) when YEARS score ≥ 1 */
    DDIMER_HIGH_SCORE_NGML: 500.0,
  },
} as const;

export type ClinicalThresholds = typeof CT;
