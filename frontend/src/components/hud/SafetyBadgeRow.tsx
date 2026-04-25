/**
 * Safety Badge Row Component (Zone B - Top Right)
 * 
 * HUD-style "Smart Badges" for critical safety signals:
 * 1. Renal Badge (GFR-based contrast safety)
 * 2. Allergy Badge (Contrast/Iodine only)
 * 3. Anticoagulation Badge (Gap detection)
 * 
 * Design: Pill-shaped badges, color-coded, minimal text
 */

import { useMemo } from 'react';
import { 
  calculateRenalSafety, 
  calculateMedAdherence, 
  checkAllergyRisk,
  isDuplicateScan,
  type RenalSafetyResult,
  type MedAdherenceResult,
  type AllergyResult,
  type DuplicateScanResult
} from '../../utils/clinicalRules';
import './SafetyBadgeRow.css';

// ===========================================================================
// Types
// ===========================================================================

interface SafetyBadgeRowProps {
  data: {
    creatinine?: number | null;
    gfr?: number | null;
    allergies?: Array<{ substance: string; code?: string }>;
    lastDispenseDate?: string | null;
    daysSupply?: number | null;
    drugName?: string | null;
    lastScanDate?: string | null;
    lastScanType?: string | null;
  } | null;
  isLoading?: boolean;
  compact?: boolean;
}

// ===========================================================================
// Sub-Components
// ===========================================================================

function RenalBadge({ result }: { result: RenalSafetyResult }) {
  const icons = {
    safe: '✓',
    caution: '⚠',
    stop: '✕'
  };

  return (
    <div className={`safety-badge renal-badge badge-${result.color}`}>
      <span className="badge-icon">{icons[result.status]}</span>
      <div className="badge-content">
        <span className="badge-title">Renal</span>
        <span className="badge-value">
          {result.gfr != null 
            ? `GFR ${result.gfr}` 
            : result.creatinine != null 
            ? `Cr ${result.creatinine}`
            : 'Unknown'}
        </span>
      </div>
      <span className={`badge-status status-${result.color}`}>
        {result.label}
      </span>
    </div>
  );
}

function AllergyBadge({ result }: { result: AllergyResult }) {
  if (!result.visible) return null;

  return (
    <div className="safety-badge allergy-badge badge-red">
      <span className="badge-icon">⚠</span>
      <div className="badge-content">
        <span className="badge-title">Allergy</span>
        <span className="badge-value">{result.substances.join(', ')}</span>
      </div>
      <span className="badge-status status-red">
        {result.label}
      </span>
    </div>
  );
}

function AnticoagBadge({ result }: { result: MedAdherenceResult }) {
  const icons = {
    protected: '🛡',
    gap: '⚠',
    unknown: '?'
  };

  const colors = {
    protected: 'green',
    gap: 'red',
    unknown: 'gray'
  };

  return (
    <div className={`safety-badge anticoag-badge badge-${colors[result.status]}`}>
      <span className="badge-icon">{icons[result.status]}</span>
      <div className="badge-content">
        <span className="badge-title">Anticoag</span>
        <span className="badge-value">
          {result.drugName || 'None'}
        </span>
      </div>
      <span className={`badge-status status-${colors[result.status]}`}>
        {result.label}
      </span>
    </div>
  );
}

function DuplicateScanBadge({ result }: { result: DuplicateScanResult }) {
  if (!result.isDuplicate) return null;

  return (
    <div className="safety-badge duplicate-badge badge-yellow">
      <span className="badge-icon">📷</span>
      <div className="badge-content">
        <span className="badge-title">Recent Scan</span>
        <span className="badge-value">
          {result.scanType || 'CT'} {result.hoursAgo}h ago
        </span>
      </div>
      <span className="badge-status status-yellow">
        Duplicate Risk
      </span>
    </div>
  );
}

// ===========================================================================
// Main Component
// ===========================================================================

export default function SafetyBadgeRow({ 
  data, 
  isLoading = false,
  compact = false 
}: SafetyBadgeRowProps) {
  // Calculate all safety statuses
  const renalResult = useMemo(() => 
    calculateRenalSafety(data?.creatinine, data?.gfr),
    [data?.creatinine, data?.gfr]
  );

  const allergyResult = useMemo(() => 
    checkAllergyRisk(data?.allergies),
    [data?.allergies]
  );

  const anticoagResult = useMemo(() => 
    calculateMedAdherence(data?.lastDispenseDate, data?.daysSupply, data?.drugName),
    [data?.lastDispenseDate, data?.daysSupply, data?.drugName]
  );

  const duplicateResult = useMemo(() =>
    isDuplicateScan(data?.lastScanDate, data?.lastScanType),
    [data?.lastScanDate, data?.lastScanType]
  );

  // Count critical alerts
  const criticalCount = useMemo(() => {
    let count = 0;
    if (renalResult.status === 'stop') count++;
    if (allergyResult.visible) count++;
    if (anticoagResult.status === 'gap') count++;
    if (duplicateResult.isDuplicate) count++;
    return count;
  }, [renalResult, allergyResult, anticoagResult, duplicateResult]);

  if (isLoading) {
    return (
      <div className={`safety-badge-row ${compact ? 'compact' : ''}`}>
        <div className="skeleton skeleton-badge"></div>
        <div className="skeleton skeleton-badge"></div>
        <div className="skeleton skeleton-badge"></div>
      </div>
    );
  }

  return (
    <div className={`safety-badge-row ${compact ? 'compact' : ''}`}>
      {/* Critical Alert Count */}
      {criticalCount > 0 && (
        <div className="alert-count">
          <span className="count-value">{criticalCount}</span>
          <span className="count-label">Alert{criticalCount > 1 ? 's' : ''}</span>
        </div>
      )}

      {/* All Clear */}
      {criticalCount === 0 && (
        <div className="all-clear">
          <span className="clear-icon">✓</span>
          <span className="clear-text">No Critical Alerts</span>
        </div>
      )}

      {/* Badges */}
      <div className="badges-container">
        <RenalBadge result={renalResult} />
        <AllergyBadge result={allergyResult} />
        <AnticoagBadge result={anticoagResult} />
        <DuplicateScanBadge result={duplicateResult} />
      </div>
    </div>
  );
}

// Export for external use
export { RenalBadge, AllergyBadge, AnticoagBadge, DuplicateScanBadge };
