import { formatVitalValue, formatVitalTimestamp, isVitalAbnormal } from '../utils/vitals';

interface VitalsSnapshotRowProps {
  vitals: {
    hr: number | null;
    spo2: number | null;
    rr: number | null;
    sbp: number | null;
    timestamp: string | null;
  } | null;
  ddimer: {
    ddimer: number | null;
    ddimer_units: string | null;
    timestamp: string | null;
  } | null;
  dataSource: 'EPIC' | 'DEMO';
}

/**
 * VitalsSnapshotRow - Compact row showing latest vitals + D-Dimer
 * Shows "—" for missing values, never crashes on null
 * Professional styling, no emojis
 */
export default function VitalsSnapshotRow({ vitals, ddimer, dataSource }: VitalsSnapshotRowProps) {
  const hr = vitals?.hr;
  const spo2 = vitals?.spo2;
  const rr = vitals?.rr;
  const sbp = vitals?.sbp;
  const ddimerVal = ddimer?.ddimer;
  
  // Determine most recent timestamp
  const vitalsTs = vitals?.timestamp;
  const ddimerTs = ddimer?.timestamp;
  const latestTs = vitalsTs || ddimerTs;

  const renderVital = (
    value: number | null | undefined,
    label: string,
    unit: string,
    type: 'hr' | 'spo2' | 'rr' | 'sbp'
  ) => {
    const hasValue = value !== null && value !== undefined && typeof value === 'number';
    const abnormal = hasValue && isVitalAbnormal(type, value);
    
    return (
      <div className={`vital-item ${abnormal ? 'abnormal' : ''} ${!hasValue ? 'missing' : ''}`}>
        <span className="vital-label">{label}</span>
        <span className="vital-value">
          {hasValue ? formatVitalValue(value) : '—'}
        </span>
        <span className="vital-unit">{unit}</span>
      </div>
    );
  };

  return (
    <div className="vitals-snapshot-row">
      <div className="vitals-grid">
        {renderVital(hr, 'HR', 'bpm', 'hr')}
        {renderVital(spo2, 'SpO₂', '%', 'spo2')}
        {renderVital(rr, 'RR', '/min', 'rr')}
        {renderVital(sbp, 'SBP', 'mmHg', 'sbp')}
        
        <div className="vital-divider" />
        
        {/* D-Dimer */}
        <div className={`vital-item ${ddimerVal && isVitalAbnormal('ddimer', ddimerVal) ? 'abnormal' : ''} ${ddimerVal === null || ddimerVal === undefined ? 'missing' : ''}`}>
          <span className="vital-label">D-Dimer</span>
          <span className="vital-value">
            {ddimerVal !== null && ddimerVal !== undefined && typeof ddimerVal === 'number'
              ? formatVitalValue(ddimerVal, 2)
              : '—'}
          </span>
          <span className="vital-unit">{ddimer?.ddimer_units || 'μg/mL'}</span>
        </div>
      </div>
      
      {/* Timestamp indicator */}
      {latestTs && (
        <div className="vitals-timestamp" title={new Date(latestTs).toLocaleString()}>
          {formatVitalTimestamp(latestTs)}
        </div>
      )}
      
      {/* Data source indicator - subtle */}
      <div className={`data-source-indicator source-${dataSource.toLowerCase()}`}>
        {dataSource}
      </div>
    </div>
  );
}

