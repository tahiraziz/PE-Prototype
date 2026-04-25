/**
 * Demo Context - "Safe Mode" Data Layer
 * 
 * Provides hardcoded demo data that CANNOT fail to load.
 * Automatically activates when:
 * 1. ?demo=true is in the URL
 * 2. useAutoAuth fails or times out
 * 3. Backend is unreachable
 * 
 * The UI will ALWAYS render with this data as fallback.
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';

// ===========================================================================
// Hardcoded "Test, HighRisk" Patient - CANNOT FAIL
// ===========================================================================

const HIGH_RISK_PATIENT = {
  id: 'TEST-HIGH-RISK-001',
  name: 'Test, HighRisk',
  
  demographics: {
    age: 55,
    sex: 'male' as const,
    weight: 82,
    height: 175,
  },
  
  vitals: {
    hr: 105,
    sbp: 110,
    dbp: 72,
    rr: 22,
    spo2: 93,
    temp: 37.2,
    timestamp: new Date().toISOString(),
  },
  
  labs: {
    ddimer: 0.65,
    ddimerUnits: 'µg/mL' as const,
    creatinine: 1.4,
    gfr: 52,
    troponin: 0.03,
    inr: null,
  },
  
  // Medication with 45-day gap (30-day supply dispensed 45 days ago)
  medications: {
    current: [
      { name: 'Apixaban 5mg BID', type: 'DOAC', status: 'active' },
      { name: 'Metoprolol 50mg', type: 'Beta-blocker', status: 'active' },
    ],
    lastDispense: {
      drug: 'Apixaban 5mg',
      date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
      daysSupply: 30,
    },
  },
  
  allergies: [
    { substance: 'Penicillin', reaction: 'Rash', severity: 'moderate' },
  ],
  
  priorImaging: [
    {
      date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year ago
      modality: 'CTA Chest',
      result: 'Negative for PE',
    },
    {
      date: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 2 years ago
      modality: 'CT Chest',
      result: 'Mild emphysema, no PE',
    },
  ],
  
  clinicalHistory: {
    priorDVT: { diagnosed: true, date: new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString() },
    priorPE: { diagnosed: false },
    recentSurgery: null,
    immobilization: false,
    activeCancer: false,
    estrogenUse: false,
    pregnancy: false,
  },
  
  // Pre-calculated scores
  scores: {
    wellsScore: 4.5,
    wellsRisk: 'moderate' as const,
    percScore: 3,
    percNegative: false,
    shockIndex: 0.95,
    probability: 0.18,
  },
  
  // Expected alerts for this patient
  alerts: {
    medicationGap: true,
    gapDays: 15, // 45 - 30 = 15 days overdue
    renalCaution: true, // GFR 52 is in caution range
    contrastRisk: false, // GFR > 30
    allergyWarning: false, // No contrast/iodine allergy
    duplicateScan: false, // Last scan was 1 year ago
    shockIndexHigh: true, // SI > 0.7
  },
};

// ===========================================================================
// Context Types
// ===========================================================================

interface DemoPatient {
  id: string;
  name: string;
  demographics: {
    age: number;
    sex: 'male' | 'female';
    weight: number;
    height: number;
  };
  vitals: {
    hr: number;
    sbp: number;
    dbp: number;
    rr: number;
    spo2: number;
    temp: number;
    timestamp: string;
  };
  labs: {
    ddimer: number | null;
    ddimerUnits: string;
    creatinine: number | null;
    gfr: number | null;
    troponin: number | null;
    inr: number | null;
  };
  medications: {
    current: Array<{ name: string; type: string; status: string }>;
    lastDispense: {
      drug: string;
      date: string;
      daysSupply: number;
    } | null;
  };
  allergies: Array<{ substance: string; reaction?: string; severity?: string }>;
  priorImaging: Array<{ date: string; modality: string; result?: string }>;
  clinicalHistory: {
    priorDVT?: { diagnosed: boolean; date?: string };
    priorPE?: { diagnosed: boolean; date?: string };
    recentSurgery?: { date: string; type: string } | null;
    immobilization?: boolean;
    activeCancer?: boolean;
    estrogenUse?: boolean;
    pregnancy?: boolean;
  };
  scores: {
    wellsScore: number;
    wellsRisk: 'low' | 'moderate' | 'high';
    percScore: number;
    percNegative: boolean;
    shockIndex: number;
    probability: number;
  };
  alerts: {
    medicationGap: boolean;
    gapDays?: number;
    renalCaution: boolean;
    contrastRisk: boolean;
    allergyWarning: boolean;
    duplicateScan: boolean;
    shockIndexHigh: boolean;
  };
}

interface DemoContextValue {
  // State
  isDemoMode: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Patient data (always available)
  patient: DemoPatient;
  
  // Actions
  enableDemoMode: () => void;
  disableDemoMode: () => void;
  toggleDemoMode: () => void;
}

// ===========================================================================
// Context
// ===========================================================================

const DemoContext = createContext<DemoContextValue | null>(null);

// ===========================================================================
// Provider
// ===========================================================================

interface DemoProviderProps {
  children: ReactNode;
  authFailed?: boolean;
  authTimedOut?: boolean;
}

export function DemoProvider({ children, authFailed = false, authTimedOut = false }: DemoProviderProps) {
  // Check URL for ?demo=true
  const urlHasDemo = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('demo') === 'true';
  }, []);

  // Demo mode is active if URL says so, or auth failed/timed out
  const [isDemoMode, setIsDemoMode] = useState(() => {
    return urlHasDemo || authFailed || authTimedOut;
  });
  
  const [isLoading] = useState(false); // Demo data never "loads"
  const [error] = useState<string | null>(null); // Demo data never errors

  // Sync with auth state
  useEffect(() => {
    if (authFailed || authTimedOut) {
      console.log('[DemoContext] Auth failed/timed out - activating demo mode');
      setIsDemoMode(true);
    }
  }, [authFailed, authTimedOut]);

  // Actions
  const enableDemoMode = useCallback(() => {
    console.log('[DemoContext] Demo mode enabled');
    setIsDemoMode(true);
    // Update URL without reload
    const url = new URL(window.location.href);
    url.searchParams.set('demo', 'true');
    window.history.replaceState({}, '', url.toString());
  }, []);

  const disableDemoMode = useCallback(() => {
    console.log('[DemoContext] Demo mode disabled');
    setIsDemoMode(false);
    // Update URL without reload
    const url = new URL(window.location.href);
    url.searchParams.delete('demo');
    window.history.replaceState({}, '', url.toString());
  }, []);

  const toggleDemoMode = useCallback(() => {
    if (isDemoMode) {
      disableDemoMode();
    } else {
      enableDemoMode();
    }
  }, [isDemoMode, enableDemoMode, disableDemoMode]);

  // Context value - patient is ALWAYS available
  const value: DemoContextValue = useMemo(() => ({
    isDemoMode,
    isLoading,
    error,
    patient: HIGH_RISK_PATIENT,
    enableDemoMode,
    disableDemoMode,
    toggleDemoMode,
  }), [isDemoMode, isLoading, error, enableDemoMode, disableDemoMode, toggleDemoMode]);

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
}

// ===========================================================================
// Hook
// ===========================================================================

/**
 * useDemoData - Access demo patient data
 * 
 * This hook ALWAYS returns valid data. It cannot fail.
 * Use it as the fallback data source when FHIR connections fail.
 */
export function useDemoData(): DemoContextValue {
  const context = useContext(DemoContext);
  
  // If used outside provider, return standalone demo data
  if (!context) {
    console.warn('[useDemoData] Used outside DemoProvider - returning standalone demo data');
    return {
      isDemoMode: true,
      isLoading: false,
      error: null,
      patient: HIGH_RISK_PATIENT,
      enableDemoMode: () => {},
      disableDemoMode: () => {},
      toggleDemoMode: () => {},
    };
  }
  
  return context;
}

// ===========================================================================
// Utility: Get demo data directly (no context needed)
// ===========================================================================

/**
 * getDemoPatient - Get hardcoded demo patient directly
 * 
 * Use this when you need demo data outside of React components.
 */
export function getDemoPatient(): DemoPatient {
  return HIGH_RISK_PATIENT;
}

/**
 * getDemoFeatureSummary - Get demo data in feature summary format
 * 
 * Compatible with the existing assessment result format.
 */
export function getDemoFeatureSummary(): Record<string, unknown> {
  const p = HIGH_RISK_PATIENT;
  return {
    // Demographics
    age: p.demographics.age,
    gender_male: p.demographics.sex === 'male' ? 1 : 0,
    gender_female: p.demographics.sex === 'female' ? 1 : 0,
    bmi: p.demographics.weight / ((p.demographics.height / 100) ** 2),
    
    // Vitals
    triage_hr: p.vitals.hr,
    triage_rr: p.vitals.rr,
    triage_o2sat: p.vitals.spo2,
    triage_sbp: p.vitals.sbp,
    triage_dbp: p.vitals.dbp,
    triage_temp: p.vitals.temp,
    
    // Labs
    d_dimer: p.labs.ddimer,
    creatinine: p.labs.creatinine,
    gfr: p.labs.gfr,
    troponin: p.labs.troponin,
    
    // Scores
    wells_score: p.scores.wellsScore,
    perc_score: p.scores.percScore,
    perc_negative: p.scores.percNegative ? 1 : 0,
    shock_index: p.scores.shockIndex,
    
    // History
    prior_pe_diagnosis: p.clinicalHistory.priorPE?.diagnosed ? 1 : 0,
    prior_dvt_diagnosis: p.clinicalHistory.priorDVT?.diagnosed ? 1 : 0,
    prior_cancer: p.clinicalHistory.activeCancer ? 1 : 0,
    recent_surgery: p.clinicalHistory.recentSurgery ? 1 : 0,
    immobilization: p.clinicalHistory.immobilization ? 1 : 0,
    estrogen_use: p.clinicalHistory.estrogenUse ? 1 : 0,
    pregnancy: p.clinicalHistory.pregnancy ? 1 : 0,
  };
}

export default DemoContext;
