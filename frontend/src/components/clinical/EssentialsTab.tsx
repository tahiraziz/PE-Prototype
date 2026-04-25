import { useState, useEffect } from 'react';
import VitalsChart from './VitalsChart';

interface EssentialsTabProps {
  patientId: string;
  summary: any;
  loading: boolean;
}

/**
 * Essentials Tab - PE decision essentials at a glance.
 * 
 * Shows:
 * - Anticoagulation status badge
 * - Top 5 comorbid diagnoses (PE mimics)
 * - Compact vitals trend chart
 */
export default function EssentialsTab({ patientId, summary, loading }: EssentialsTabProps) {
  const [vitals, setVitals] = useState<any>(null);
  const [loadingVitals, setLoadingVitals] = useState(false);

  // Load vitals data for chart
  useEffect(() => {
    if (patientId) {
      loadVitals();
    }
  }, [patientId]);

  const loadVitals = async () => {
    setLoadingVitals(true);
    try {
      const response = await fetch(`/api/clinical/vitals?patient_id=${patientId}&hours=24`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setVitals(data.series);
      }
    } catch (err) {
      console.error('Failed to load vitals:', err);
    } finally {
      setLoadingVitals(false);
    }
  };

  // Anticoag status badge
  const getAnticoagBadge = () => {
    if (!summary?.anticoagulation) {
      return { label: 'Unknown', className: 'badge-unknown' };
    }
    
    const status = summary.anticoagulation.status;
    if (status === 'on_anticoagulant') {
      return { label: 'On Anticoagulant', className: 'badge-warning' };
    } else if (status === 'none') {
      return { label: 'None', className: 'badge-neutral' };
    }
    return { label: 'Unknown', className: 'badge-unknown' };
  };

  const anticoagBadge = getAnticoagBadge();

  // Diagnosis flags
  const diagnosisLabels: Record<string, string> = {
    asthma: 'Asthma',
    anxiety: 'Anxiety/Panic',
    copd: 'COPD',
    chf: 'CHF',
    pneumonia: 'Pneumonia'
  };

  const getDiagnosisStatus = (key: string) => {
    if (!summary?.diagnosis_flags) return 'unknown';
    return summary.diagnosis_flags[key] ? 'present' : 'absent';
  };

  if (loading) {
    return (
      <div className="essentials-tab">
        <div className="skeleton-loader">
          <div className="skeleton skeleton-badge"></div>
          <div className="skeleton skeleton-list"></div>
          <div className="skeleton skeleton-chart"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="essentials-tab">
      {/* Anticoagulation Status */}
      <div className="essentials-section">
        <div className="section-label">Anticoagulation</div>
        <div className={`anticoag-badge ${anticoagBadge.className}`}>
          {anticoagBadge.label}
        </div>
        {summary?.anticoagulation?.active_meds?.length > 0 && (
          <div className="anticoag-meds">
            {summary.anticoagulation.active_meds.slice(0, 2).join(', ')}
          </div>
        )}
      </div>

      {/* PE Mimic Diagnoses */}
      <div className="essentials-section">
        <div className="section-label">PE Mimic Diagnoses</div>
        <div className="diagnosis-flags">
          {Object.entries(diagnosisLabels).map(([key, label]) => {
            const status = getDiagnosisStatus(key);
            return (
              <div key={key} className={`diagnosis-flag diagnosis-${status}`}>
                <span className="flag-icon">
                  {status === 'present' ? '✓' : status === 'absent' ? '—' : '?'}
                </span>
                <span className="flag-label">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vitals Trend Chart */}
      <div className="essentials-section">
        <div className="section-label">Vitals (Last 24h)</div>
        {loadingVitals ? (
          <div className="skeleton skeleton-chart"></div>
        ) : vitals ? (
          <VitalsChart data={vitals} />
        ) : (
          <div className="no-data">No vitals data available</div>
        )}
      </div>
    </div>
  );
}

