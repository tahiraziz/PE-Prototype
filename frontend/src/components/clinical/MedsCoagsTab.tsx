/**
 * Medication & Anticoagulation Triage Tab
 * 
 * Features:
 * 1. Anticoagulant Filtering - Apixaban, Rivaroxaban, Warfarin, Heparin, Enoxaparin
 * 2. Adherence Calculation - (Today - LastDispenseDate) / DaysSupply
 * 3. Visual Triage:
 *    - GREEN: Covered (Refill active)
 *    - RED: Gap Detected (Refill expired > 5 days ago)
 *    - YELLOW: Warfarin (Show latest INR if available)
 * 
 * 4. INR Trend for Warfarin patients
 */

import { useState, useEffect, useMemo } from 'react';
import {
  calculateMedicationAdherence,
  getAnticoagulationStatus,
  getAnticoagulantType,
  formatAnticoagStatus,
  type MedicationDispense,
  type AnticoagulationStatus,
} from '../../utils/clinicalLogic';
import './MedsCoagsTab.css';

// ===========================================================================
// Types
// ===========================================================================

interface MedsCoagsTabProps {
  patientId: string;
  isDemo?: boolean;
  demoData?: {
    medications?: ActiveMedication[];
    dispenses?: MedicationDispense[];
    inr?: number | null;
  };
}

interface ActiveMedication {
  name: string;
  type: 'DOAC' | 'Warfarin' | 'Heparin_LMWH' | 'Antiplatelet' | 'Other';
  status: 'active' | 'discontinued' | 'on-hold';
  start?: string | null;
  dosage?: string;
}

interface INRPoint {
  time: string;
  value: number;
  unit: string;
}

// Target anticoagulants for filtering
const TARGET_ANTICOAGULANTS = [
  'apixaban', 'eliquis',
  'rivaroxaban', 'xarelto',
  'warfarin', 'coumadin', 'jantoven',
  'heparin',
  'enoxaparin', 'lovenox',
];

// ===========================================================================
// Sub-Components
// ===========================================================================

function AdherenceStatusBadge({ status }: { status: AnticoagulationStatus }) {
  const formatted = formatAnticoagStatus(status);
  
  const colorClasses = {
    green: 'status-protected',
    yellow: 'status-caution',
    red: 'status-gap',
    gray: 'status-none',
  };

  return (
    <div className={`adherence-badge ${colorClasses[formatted.color]}`}>
      <div className="badge-main">
        <span className="badge-icon">
          {formatted.color === 'green' && '🛡️'}
          {formatted.color === 'yellow' && '⚠️'}
          {formatted.color === 'red' && '🚨'}
          {formatted.color === 'gray' && '○'}
        </span>
        <span className="badge-label">{formatted.badge}</span>
      </div>
      <div className="badge-detail">{formatted.detail}</div>
    </div>
  );
}

function MedicationCard({ 
  med, 
  adherence 
}: { 
  med: ActiveMedication; 
  adherence: AnticoagulationStatus | null;
}) {
  const isAnticoag = ['DOAC', 'Warfarin', 'Heparin_LMWH'].includes(med.type);
  const typeClass = med.type.toLowerCase().replace('_', '-');
  
  // Determine card status based on adherence
  let cardStatus = 'neutral';
  if (adherence) {
    if (adherence.status === 'protected') cardStatus = 'protected';
    else if (adherence.status === 'subtherapeutic') cardStatus = 'caution';
    else if (adherence.status === 'gap') cardStatus = 'gap';
  }

  return (
    <div className={`med-card type-${typeClass} status-${cardStatus}`}>
      <div className="med-header">
        <span className="med-name">{med.name}</span>
        <span className={`med-type-badge type-${typeClass}`}>{med.type}</span>
      </div>
      
      {med.dosage && (
        <div className="med-dosage">{med.dosage}</div>
      )}
      
      {isAnticoag && adherence && (
        <div className="med-adherence">
          {adherence.status === 'protected' && (
            <span className="adherence-good">✓ Covered</span>
          )}
          {adherence.status === 'gap' && (
            <span className="adherence-gap">
              ⚠️ Gap: {adherence.daysGap} days
            </span>
          )}
          {adherence.status === 'subtherapeutic' && (
            <span className="adherence-sub">
              INR {adherence.inr?.toFixed(1)} - Subtherapeutic
            </span>
          )}
        </div>
      )}
      
      {med.start && (
        <div className="med-start">
          Since {new Date(med.start).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

function INRTrendChart({ data }: { data: INRPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="inr-empty">
        No INR results found
      </div>
    );
  }

  const latest = data[0];
  const inrStatus = latest.value < 2.0 ? 'sub' : latest.value > 3.0 ? 'supra' : 'therapeutic';

  return (
    <div className="inr-section">
      <div className="inr-header">
        <span className="inr-title">INR Trend (30 Days)</span>
      </div>
      
      <div className="inr-content">
        {/* Latest INR Value */}
        <div className={`inr-latest status-${inrStatus}`}>
          <span className="inr-value">{latest.value.toFixed(1)}</span>
          <span className="inr-label">Latest INR</span>
          <span className="inr-date">
            {new Date(latest.time).toLocaleDateString()}
          </span>
          <span className={`inr-status status-${inrStatus}`}>
            {inrStatus === 'sub' && 'Subtherapeutic'}
            {inrStatus === 'supra' && 'Supratherapeutic'}
            {inrStatus === 'therapeutic' && 'Therapeutic'}
          </span>
        </div>
        
        {/* Mini Sparkline */}
        {data.length > 1 && (
          <div className="inr-trend-mini">
            <svg width="150" height="40" className="inr-chart">
              {/* Therapeutic range bands */}
              <rect x="0" y="12" width="150" height="15" fill="#dcfce7" opacity="0.5" />
              
              {/* Data line */}
              {data.slice(0, 10).reverse().map((point, i, arr) => {
                if (i === 0) return null;
                const x1 = ((i - 1) / (arr.length - 1)) * 140 + 5;
                const x2 = (i / (arr.length - 1)) * 140 + 5;
                const y1 = 35 - ((arr[i - 1].value - 1) / 4) * 30;
                const y2 = 35 - ((point.value - 1) / 4) * 30;
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={Math.max(5, Math.min(35, y1))}
                    x2={x2}
                    y2={Math.max(5, Math.min(35, y2))}
                    stroke="#8b5cf6"
                    strokeWidth="2"
                  />
                );
              })}
              
              {/* Therapeutic range lines */}
              <line x1="0" y1="27" x2="150" y2="27" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
              <line x1="0" y1="12" x2="150" y2="12" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
            </svg>
            <div className="inr-range-label">Target: 2.0 - 3.0</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// Main Component
// ===========================================================================

export default function MedsCoagsTab({ 
  patientId, 
  isDemo = false,
  demoData 
}: MedsCoagsTabProps) {
  const [medications, setMedications] = useState<ActiveMedication[]>([]);
  const [dispenses, setDispenses] = useState<MedicationDispense[]>([]);
  const [inrData, setInrData] = useState<INRPoint[]>([]);
  const [loading, setLoading] = useState(!isDemo);
  const [showAllMeds, setShowAllMeds] = useState(false);

  // Load data
  useEffect(() => {
    if (isDemo && demoData) {
      setMedications(demoData.medications || []);
      setDispenses(demoData.dispenses || []);
      if (demoData.inr != null) {
        setInrData([{
          time: new Date().toISOString(),
          value: demoData.inr,
          unit: 'INR'
        }]);
      }
      setLoading(false);
      return;
    }

    loadData();
  }, [patientId, isDemo, demoData]);

  const loadData = async () => {
    setLoading(true);
    
    try {
      // Load anticoagulation data
      const [anticoagRes, inrRes] = await Promise.all([
        fetch(`/api/clinical/anticoagulation?patient_id=${patientId}`, {
          credentials: 'include'
        }).catch(() => null),
        fetch(`/api/clinical/inr?patient_id=${patientId}&days=30`, {
          credentials: 'include'
        }).catch(() => null),
      ]);
      
      if (anticoagRes?.ok) {
        const data = await anticoagRes.json();
        setMedications(data.medications || []);
        setDispenses(data.dispenses || []);
        
        // Also fetch INR if on warfarin
        if (data.has_warfarin && inrRes?.ok) {
          const inrJson = await inrRes.json();
          setInrData(inrJson.series || []);
        }
      }
    } catch (err) {
      console.error('Failed to load meds/coags:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate adherence status
  const adherenceStatus = useMemo(() => {
    const latestInr = inrData.length > 0 ? inrData[0].value : null;
    return getAnticoagulationStatus(dispenses, latestInr);
  }, [dispenses, inrData]);

  // Filter to target anticoagulants
  const anticoagMeds = useMemo(() => {
    return medications.filter(med => {
      const name = med.name.toLowerCase();
      return TARGET_ANTICOAGULANTS.some(target => name.includes(target));
    });
  }, [medications]);

  // Check if on warfarin
  const hasWarfarin = useMemo(() => {
    return medications.some(med => 
      getAnticoagulantType(med.name) === 'warfarin'
    );
  }, [medications]);

  // Group other meds
  const otherMeds = useMemo(() => {
    return medications.filter(med => {
      const name = med.name.toLowerCase();
      return !TARGET_ANTICOAGULANTS.some(target => name.includes(target));
    });
  }, [medications]);

  if (loading) {
    return (
      <div className="meds-coags-tab loading">
        <div className="skeleton-loader">
          <div className="skeleton skeleton-badge"></div>
          <div className="skeleton skeleton-list"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="meds-coags-tab">
      {/* Adherence Status Banner */}
      <AdherenceStatusBadge status={adherenceStatus} />

      {/* Anticoagulants Section */}
      <div className="meds-section">
        <div className="section-header">
          <span className="section-icon">💊</span>
          <span className="section-title">Anticoagulants</span>
          {anticoagMeds.length > 0 && (
            <span className="section-count">{anticoagMeds.length}</span>
          )}
        </div>
        
        {anticoagMeds.length === 0 ? (
          <div className="no-meds">
            No anticoagulant medications found
          </div>
        ) : (
          <div className="meds-grid">
            {anticoagMeds.map((med, idx) => (
              <MedicationCard 
                key={idx} 
                med={med} 
                adherence={adherenceStatus}
              />
            ))}
          </div>
        )}
      </div>

      {/* INR Section (if on Warfarin) */}
      {hasWarfarin && (
        <INRTrendChart data={inrData} />
      )}

      {/* Other Medications */}
      {otherMeds.length > 0 && (
        <div className="meds-section other-meds">
          <div className="section-header">
            <span className="section-icon">📋</span>
            <span className="section-title">Other Medications</span>
            <span className="section-count">{otherMeds.length}</span>
            <button 
              className="toggle-btn"
              onClick={() => setShowAllMeds(!showAllMeds)}
            >
              {showAllMeds ? 'Hide' : 'Show'}
            </button>
          </div>
          
          {showAllMeds && (
            <div className="meds-grid compact">
              {otherMeds.map((med, idx) => (
                <MedicationCard key={idx} med={med} adherence={null} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export type { ActiveMedication };
