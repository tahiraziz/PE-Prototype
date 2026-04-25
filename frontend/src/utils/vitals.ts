/**
 * Vitals normalization utilities
 * Single source of truth for extracting/formatting vital signs
 */

export interface VitalPoint {
  value: number;
  time: string;
  unit?: string;
}

export interface VitalsSeries {
  hr?: VitalPoint[];
  spo2?: VitalPoint[];
  rr?: VitalPoint[];
  sbp?: VitalPoint[];
  dbp?: VitalPoint[];
}

export interface LatestVitals {
  hr: { value: number | null; ts: string | null; unit: string };
  spo2: { value: number | null; ts: string | null; unit: string };
  rr: { value: number | null; ts: string | null; unit: string };
  sbp: { value: number | null; ts: string | null; unit: string };
  lastUpdated: string | null;
}

/**
 * Extract latest vitals from a vitals series
 * Used by BOTH the top strip AND the vitals chart
 */
export function extractLatestVitals(series: VitalsSeries | null | undefined): LatestVitals {
  const result: LatestVitals = {
    hr: { value: null, ts: null, unit: 'bpm' },
    spo2: { value: null, ts: null, unit: '%' },
    rr: { value: null, ts: null, unit: '/min' },
    sbp: { value: null, ts: null, unit: 'mmHg' },
    lastUpdated: null
  };

  if (!series) return result;

  // Extract latest from each series
  const hrPoints = series.hr || [];
  if (hrPoints.length > 0) {
    const latest = hrPoints[0];
    result.hr = { value: latest.value, ts: latest.time, unit: 'bpm' };
  }

  const spo2Points = series.spo2 || [];
  if (spo2Points.length > 0) {
    const latest = spo2Points[0];
    result.spo2 = { value: latest.value, ts: latest.time, unit: '%' };
  }

  const rrPoints = series.rr || [];
  if (rrPoints.length > 0) {
    const latest = rrPoints[0];
    result.rr = { value: latest.value, ts: latest.time, unit: '/min' };
  }

  const sbpPoints = series.sbp || [];
  if (sbpPoints.length > 0) {
    const latest = sbpPoints[0];
    result.sbp = { value: latest.value, ts: latest.time, unit: 'mmHg' };
  }

  // Find the most recent timestamp
  const allTimestamps = [
    result.hr.ts,
    result.spo2.ts,
    result.rr.ts,
    result.sbp.ts
  ].filter((ts): ts is string => ts !== null);

  if (allTimestamps.length > 0) {
    allTimestamps.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    result.lastUpdated = allTimestamps[0];
  }

  return result;
}

/**
 * Format a timestamp for display
 */
export function formatVitalTimestamp(ts: string | null): string {
  if (!ts) return '';
  
  try {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    
    // More than 24h, show date/time
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch {
    return '';
  }
}

/**
 * Check if a vital value is abnormal
 */
export function isVitalAbnormal(type: 'hr' | 'spo2' | 'rr' | 'sbp' | 'ddimer', value: number | null): boolean {
  if (value === null || value === undefined) return false;
  
  switch (type) {
    case 'hr': return value > 100 || value < 60;
    case 'spo2': return value < 94;
    case 'rr': return value > 20 || value < 12;
    case 'sbp': return value < 90 || value > 180;
    case 'ddimer': return value > 0.5;
    default: return false;
  }
}

/**
 * Safe number formatter - never crashes on null
 */
export function formatVitalValue(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || typeof value !== 'number' || !Number.isFinite(value)) {
    return '—';
  }
  return decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
}

