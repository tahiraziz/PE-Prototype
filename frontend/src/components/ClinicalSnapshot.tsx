import { useEffect, useState } from 'react';
import { safeFetch, setTrackedPatientId } from '../utils/safeFetch';
import { 
  extractLatestVitals, 
  formatVitalTimestamp, 
  formatVitalValue, 
  isVitalAbnormal,
  type LatestVitals,
  type VitalsSeries
} from '../utils/vitals';
import { isValidPatientId } from '../utils/patientId';

interface ClinicalSnapshotProps {
  patientId: string | null;
  isAuthenticated: boolean;
  frontpageData?: FrontpageData | null;
}

interface FrontpageData {
  vitals_latest?: {
    hr: { value: number | null; ts: string | null; unit: string };
    spo2: { value: number | null; ts: string | null; unit: string };
    rr: { value: number | null; ts: string | null; unit: string };
    sbp: { value: number | null; ts: string | null; unit: string };
  };
  vitals_series?: VitalsSeries;
  ddimer_latest?: {
    value: number | null;
    ts: string | null;
    unit: string | null;
  };
}

/**
 * Clinical Snapshot - Layer 1 component
 * Shows latest vitals + D-Dimer in a single row (no charts)
 * Uses SAME data source as vitals chart for consistency
 * 
 * Professional styling - no emojis
 */
export default function ClinicalSnapshot({ 
  patientId, 
  isAuthenticated,
  frontpageData 
}: ClinicalSnapshotProps) {
  const [loading, setLoading] = useState(false);
  const [vitals, setVitals] = useState<LatestVitals | null>(null);
  const [ddimer, setDdimer] = useState<{ value: number | null; ts: string | null; unit: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Track patient ID for error boundary
  useEffect(() => {
    if (patientId) {
      setTrackedPatientId(patientId);
    }
  }, [patientId]);

  // Process data from props or fetch if needed
  useEffect(() => {
    if (!isAuthenticated || !isValidPatientId(patientId)) {
      setVitals(null);
      setDdimer(null);
      setError(null);
      return;
    }

    // Try to use frontpage data first
    if (frontpageData) {
      // Option 1: Use vitals_series if available (same as chart)
      if (frontpageData.vitals_series) {
        const extracted = extractLatestVitals(frontpageData.vitals_series);
        setVitals(extracted);
        setLastUpdated(extracted.lastUpdated);
      } 
      // Option 2: Fall back to vitals_latest
      else if (frontpageData.vitals_latest) {
        setVitals({
          hr: frontpageData.vitals_latest.hr || { value: null, ts: null, unit: 'bpm' },
          spo2: frontpageData.vitals_latest.spo2 || { value: null, ts: null, unit: '%' },
          rr: frontpageData.vitals_latest.rr || { value: null, ts: null, unit: '/min' },
          sbp: frontpageData.vitals_latest.sbp || { value: null, ts: null, unit: 'mmHg' },
          lastUpdated: null
        });
      }
      
      // D-Dimer from frontpage
      if (frontpageData.ddimer_latest) {
        setDdimer(frontpageData.ddimer_latest);
      }
      
      setLoading(false);
      setError(null);
    } else {
      // No frontpage data - fetch vitals directly
      fetchVitalsDirectly();
    }
  }, [patientId, isAuthenticated, frontpageData]);

  const fetchVitalsDirectly = async () => {
    if (!isValidPatientId(patientId)) return;
    
    setLoading(true);
    setError(null);
    
    // Fetch vitals from the same endpoint used by the chart
    const { data: vitalsData, error: vitalsError } = await safeFetch<{ series: VitalsSeries }>(
      `/api/clinical/vitals?patient_id=${encodeURIComponent(patientId!)}&hours=24`
    );
    
    if (vitalsError) {
      setError(vitalsError);
    } else if (vitalsData?.series) {
      const extracted = extractLatestVitals(vitalsData.series);
      setVitals(extracted);
      setLastUpdated(extracted.lastUpdated);
    }
    
    // Also fetch d-dimer
    const { data: ddimerData } = await safeFetch<{ series: Array<{ value: number; time: string; unit: string }> }>(
      `/api/clinical/ddimer?patient_id=${encodeURIComponent(patientId!)}&days=7`
    );
    
    if (ddimerData?.series && ddimerData.series.length > 0) {
      const latest = ddimerData.series[0];
      setDdimer({ value: latest.value, ts: latest.time, unit: latest.unit || 'μg/mL' });
    }
    
    setLoading(false);
  };

  if (!isAuthenticated || !isValidPatientId(patientId)) {
    return null;
  }

  const renderVital = (
    type: 'hr' | 'spo2' | 'rr' | 'sbp', 
    label: string, 
    data: { value: number | null; ts: string | null; unit: string } | null
  ) => {
    const value = data?.value;
    const hasValue = value !== null && value !== undefined;
    const abnormal = hasValue && isVitalAbnormal(type, value);
    const timestamp = data?.ts ? formatVitalTimestamp(data.ts) : '';
    
    return (
      <div 
        className={`snapshot-item ${abnormal ? 'abnormal' : ''} ${!hasValue ? 'missing' : ''}`}
        title={timestamp ? `Last updated: ${timestamp}` : 'No data available'}
      >
        <span className="snapshot-label">{label}</span>
        {hasValue ? (
          <>
            <span className="snapshot-value">{formatVitalValue(value)}</span>
            <span className="snapshot-unit">{data?.unit || ''}</span>
          </>
        ) : (
          <span className="snapshot-na">—</span>
        )}
      </div>
    );
  };

  return (
    <div className="clinical-snapshot">
      {loading ? (
        <div className="snapshot-loading">
          <div className="skeleton-row">
            <div className="skeleton-item" />
            <div className="skeleton-item" />
            <div className="skeleton-item" />
            <div className="skeleton-item" />
          </div>
        </div>
      ) : error ? (
        <div className="snapshot-error">
          Unable to load vitals
          <span className="error-detail">{error}</span>
        </div>
      ) : (
        <div className="snapshot-row">
          {renderVital('hr', 'HR', vitals?.hr || null)}
          {renderVital('spo2', 'SpO₂', vitals?.spo2 || null)}
          {renderVital('rr', 'RR', vitals?.rr || null)}
          {renderVital('sbp', 'SBP', vitals?.sbp || null)}
          <div className="snapshot-divider" />
          
          {/* D-Dimer */}
          <div 
            className={`snapshot-item ${ddimer?.value && isVitalAbnormal('ddimer', ddimer.value) ? 'abnormal' : ''} ${!ddimer?.value ? 'missing' : ''}`}
            title={ddimer?.ts ? `Last: ${formatVitalTimestamp(ddimer.ts)}` : 'No D-Dimer available'}
          >
            <span className="snapshot-label">D-Dimer</span>
            {ddimer?.value !== null && ddimer?.value !== undefined ? (
              <>
                <span className="snapshot-value">{formatVitalValue(ddimer.value, 2)}</span>
                <span className="snapshot-unit">{ddimer.unit || 'μg/mL'}</span>
              </>
            ) : (
              <span className="snapshot-na">—</span>
            )}
          </div>
          
          {/* Last updated indicator */}
          {lastUpdated && (
            <div className="snapshot-timestamp" title={`Data from: ${new Date(lastUpdated).toLocaleString()}`}>
              {formatVitalTimestamp(lastUpdated)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
