/**
 * Imaging Safety Card Component
 * 
 * Displays critical imaging safety information:
 * 1. Renal Function (Contrast Risk)
 *    - Fetches Creatinine (LOINC 2160-0) and GFR (LOINC 33914-3)
 *    - RED badge if GFR < 30 OR Creatinine > 1.5
 *    - YELLOW badge if GFR 30-60
 *    - GREEN badge if GFR > 60
 * 
 * 2. Prior CTA History
 *    - Fetches DiagnosticReport/ImagingStudy for CT Chest, CTA PE, V/Q Scan
 *    - Displays last 3 scans with date, modality, result summary
 *    - RED flag if last scan < 48 hours ago (duplicate ordering risk)
 */

import { useState, useEffect, useMemo } from 'react';
import { estimateGFR, type GFRResult, type PatientDemographics } from '../../utils/clinicalLogic';
import './ImagingSafetyCard.css';

// ===========================================================================
// Types
// ===========================================================================

interface ImagingSafetyCardProps {
  patientId: string | null;
  isDemo?: boolean;
  demoData?: {
    creatinine?: number | null;
    gfr?: number | null;
    age?: number | null;
    sex?: 'male' | 'female' | 'unknown';
    priorImaging?: PriorImagingRecord[];
  };
}

interface RenalFunction {
  creatinine: number | null;
  creatinineUnit: string;
  gfr: number | null;
  gfrSource: 'calculated' | 'reported' | 'unknown';
  timestamp: string | null;
}

interface PriorImagingRecord {
  date: string;
  modality: string;
  result: string;
  code?: string;
  hoursAgo?: number;
}

type ContrastRisk = 'safe' | 'caution' | 'high-risk' | 'unknown';

// ===========================================================================
// LOINC Codes
// ===========================================================================

const LOINC = {
  CREATININE: '2160-0',
  GFR: '33914-3',
  GFR_FEMALE: '50044-7',
  GFR_MALE: '50384-7',
};

// Imaging modality codes (SNOMED/LOINC)
const IMAGING_CODES = [
  '169067001',   // CTA Pulmonary Angiography
  '418891003',   // CT Chest with contrast
  '77477000',    // CT of thorax
  '372096002',   // V/Q Scan
  '399208008',   // Plain chest X-ray
];

// ===========================================================================
// Utility Functions
// ===========================================================================

function calculateHoursAgo(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
}

function formatTimeAgo(hoursAgo: number): string {
  if (hoursAgo < 1) return 'Just now';
  if (hoursAgo < 24) return `${hoursAgo}h ago`;
  if (hoursAgo < 48) return `${Math.floor(hoursAgo / 24)}d ago`;
  if (hoursAgo < 168) return `${Math.floor(hoursAgo / 24)} days ago`;
  if (hoursAgo < 720) return `${Math.floor(hoursAgo / 168)} weeks ago`;
  if (hoursAgo < 8760) return `${Math.floor(hoursAgo / 720)} months ago`;
  return `${Math.floor(hoursAgo / 8760)} years ago`;
}

function determineContrastRisk(
  gfr: number | null, 
  creatinine: number | null
): ContrastRisk {
  // If GFR < 30 OR Creatinine > 1.5 -> HIGH RISK (RED)
  if (gfr !== null && gfr < 30) return 'high-risk';
  if (creatinine !== null && creatinine > 1.5) return 'high-risk';
  
  // If GFR 30-60 -> CAUTION (YELLOW)
  if (gfr !== null && gfr >= 30 && gfr < 60) return 'caution';
  
  // If GFR >= 60 -> SAFE (GREEN)
  if (gfr !== null && gfr >= 60) return 'safe';
  
  // If only creatinine available and <= 1.5, assume reasonable
  if (creatinine !== null && creatinine <= 1.5) return 'safe';
  
  return 'unknown';
}

// ===========================================================================
// Sub-Components
// ===========================================================================

function RenalBadge({ 
  risk, 
  gfr, 
  creatinine 
}: { 
  risk: ContrastRisk; 
  gfr: number | null; 
  creatinine: number | null;
}) {
  const riskConfig = {
    'safe': { 
      icon: '✓', 
      label: 'Contrast Safe', 
      className: 'risk-safe',
      detail: gfr ? `GFR ${gfr}` : creatinine ? `Cr ${creatinine}` : 'Normal renal function'
    },
    'caution': { 
      icon: '⚠️', 
      label: 'Caution', 
      className: 'risk-caution',
      detail: `GFR ${gfr ?? '?'} - Hydrate before contrast`
    },
    'high-risk': { 
      icon: '🛑', 
      label: 'Contrast Risk', 
      className: 'risk-high',
      detail: gfr !== null && gfr < 30 
        ? `GFR ${gfr} - Contrast may be contraindicated`
        : creatinine !== null && creatinine > 1.5
        ? `Cr ${creatinine} - Elevated creatinine`
        : 'High nephrotoxicity risk'
    },
    'unknown': { 
      icon: '?', 
      label: 'Renal Unknown', 
      className: 'risk-unknown',
      detail: 'No creatinine or GFR available'
    },
  };

  const config = riskConfig[risk];

  return (
    <div className={`renal-badge ${config.className}`}>
      <div className="badge-header">
        <span className="badge-icon">{config.icon}</span>
        <span className="badge-label">{config.label}</span>
      </div>
      <div className="badge-detail">{config.detail}</div>
      {gfr !== null && creatinine !== null && (
        <div className="badge-values">
          <span>GFR: {gfr} mL/min</span>
          <span>Cr: {creatinine} mg/dL</span>
        </div>
      )}
    </div>
  );
}

function ImagingHistoryList({ 
  records,
  showDuplicateWarning = true 
}: { 
  records: PriorImagingRecord[];
  showDuplicateWarning?: boolean;
}) {
  if (records.length === 0) {
    return (
      <div className="imaging-history-empty">
        <span className="empty-icon">📷</span>
        <span>No prior chest imaging found</span>
      </div>
    );
  }

  // Check for duplicate ordering risk (scan < 48 hours ago)
  const recentScan = records.find(r => {
    const hours = r.hoursAgo ?? calculateHoursAgo(r.date);
    return hours < 48;
  });

  return (
    <div className="imaging-history-list">
      <div className="history-header">
        <span className="header-icon">🔬</span>
        <span className="header-text">Prior Imaging</span>
        {recentScan && showDuplicateWarning && (
          <span className="duplicate-warning">
            ⚠️ Recent scan &lt;48h
          </span>
        )}
      </div>
      
      <div className="history-records">
        {records.slice(0, 3).map((record, idx) => {
          const hoursAgo = record.hoursAgo ?? calculateHoursAgo(record.date);
          const isRecent = hoursAgo < 48;
          const isCTA = record.modality.toUpperCase().includes('CTA') || 
                        record.modality.toUpperCase().includes('CTPA');
          
          return (
            <div 
              key={idx} 
              className={`history-record ${isRecent ? 'record-recent' : ''}`}
            >
              <div className="record-meta">
                <span className={`record-modality ${isCTA ? 'modality-cta' : ''}`}>
                  {record.modality}
                </span>
                <span className="record-date">
                  {formatTimeAgo(hoursAgo)}
                </span>
              </div>
              <div className="record-result">
                {record.result.length > 60 
                  ? `${record.result.substring(0, 60)}...` 
                  : record.result}
              </div>
              {isRecent && (
                <div className="record-flag">
                  🚨 Potential Duplicate - Ordered within 48h
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {records.length > 3 && (
        <div className="history-more">
          +{records.length - 3} more imaging studies
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Main Component
// ===========================================================================

export default function ImagingSafetyCard({ 
  patientId, 
  isDemo = false,
  demoData 
}: ImagingSafetyCardProps) {
  const [renalData, setRenalData] = useState<RenalFunction | null>(null);
  const [imagingHistory, setImagingHistory] = useState<PriorImagingRecord[]>([]);
  const [loading, setLoading] = useState(!isDemo);
  const [error, setError] = useState<string | null>(null);

  // Load data from API or use demo data
  useEffect(() => {
    if (isDemo && demoData) {
      // Use demo data directly
      setRenalData({
        creatinine: demoData.creatinine ?? null,
        creatinineUnit: 'mg/dL',
        gfr: demoData.gfr ?? null,
        gfrSource: demoData.gfr ? 'reported' : 'unknown',
        timestamp: new Date().toISOString(),
      });
      
      if (demoData.priorImaging) {
        setImagingHistory(demoData.priorImaging.map(img => ({
          ...img,
          hoursAgo: calculateHoursAgo(img.date),
        })));
      }
      setLoading(false);
      return;
    }

    if (!patientId) {
      setLoading(false);
      return;
    }

    loadData(patientId);
  }, [patientId, isDemo, demoData]);

  const loadData = async (pid: string) => {
    setLoading(true);
    setError(null);

    try {
      // Fetch renal function and imaging in parallel
      const [renalRes, imagingRes] = await Promise.all([
        fetch(`/api/fhir/observations/${pid}?category=laboratory&code=${LOINC.CREATININE},${LOINC.GFR}`, {
          credentials: 'include'
        }).catch(() => null),
        fetch(`/api/clinical/imaging?patient_id=${pid}&limit=5`, {
          credentials: 'include'
        }).catch(() => null),
      ]);

      // Process renal data
      if (renalRes?.ok) {
        const renalJson = await renalRes.json();
        const observations = renalJson.observations || renalJson.entry || [];
        
        let creatinine: number | null = null;
        let gfr: number | null = null;
        let timestamp: string | null = null;

        for (const obs of observations) {
          const resource = obs.resource || obs;
          const code = resource.code?.coding?.[0]?.code;
          const value = resource.valueQuantity?.value;
          const obsTime = resource.effectiveDateTime || resource.issued;

          if (code === LOINC.CREATININE && value != null) {
            creatinine = value;
            timestamp = obsTime;
          }
          if ((code === LOINC.GFR || code === LOINC.GFR_FEMALE || code === LOINC.GFR_MALE) && value != null) {
            gfr = value;
          }
        }

        setRenalData({
          creatinine,
          creatinineUnit: 'mg/dL',
          gfr,
          gfrSource: gfr != null ? 'reported' : 'unknown',
          timestamp,
        });
      }

      // Process imaging data
      if (imagingRes?.ok) {
        const imagingJson = await imagingRes.json();
        const records = imagingJson.imaging || imagingJson.reports || [];
        
        setImagingHistory(records.map((r: any) => ({
          date: r.date || r.effectiveDateTime || r.issued,
          modality: r.modality || r.code?.text || 'Unknown',
          result: r.result || r.conclusion || r.text?.div || 'No result summary',
          code: r.code?.coding?.[0]?.code,
          hoursAgo: calculateHoursAgo(r.date || r.effectiveDateTime || r.issued),
        })));
      }
    } catch (err) {
      console.error('Failed to load imaging safety data:', err);
      setError('Failed to load renal/imaging data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate contrast risk
  const contrastRisk = useMemo(() => {
    if (!renalData) return 'unknown';
    return determineContrastRisk(renalData.gfr, renalData.creatinine);
  }, [renalData]);

  // Check for duplicate ordering risk
  const hasDuplicateRisk = useMemo(() => {
    return imagingHistory.some(r => {
      const hours = r.hoursAgo ?? calculateHoursAgo(r.date);
      const isCTA = r.modality.toUpperCase().includes('CTA') || 
                    r.modality.toUpperCase().includes('CT');
      return isCTA && hours < 48;
    });
  }, [imagingHistory]);

  if (loading) {
    return (
      <div className="imaging-safety-card loading">
        <div className="skeleton-loader">
          <div className="skeleton skeleton-badge"></div>
          <div className="skeleton skeleton-list"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`imaging-safety-card ${hasDuplicateRisk ? 'has-duplicate-risk' : ''}`}>
      <div className="card-header">
        <h3 className="card-title">
          <span className="title-icon">🏥</span>
          Imaging Safety
        </h3>
        {hasDuplicateRisk && (
          <span className="duplicate-alert">
            DUPLICATE RISK
          </span>
        )}
      </div>

      <div className="card-content">
        {error && (
          <div className="error-message">{error}</div>
        )}

        {/* Renal Function Badge */}
        <RenalBadge 
          risk={contrastRisk}
          gfr={renalData?.gfr ?? null}
          creatinine={renalData?.creatinine ?? null}
        />

        {/* Imaging History */}
        <ImagingHistoryList 
          records={imagingHistory}
          showDuplicateWarning={true}
        />
      </div>
    </div>
  );
}

// Export types for use in other components
export type { PriorImagingRecord, RenalFunction, ContrastRisk };
