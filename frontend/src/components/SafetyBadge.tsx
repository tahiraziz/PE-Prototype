/**
 * Safety Badge Component - Zone B: "Can I Scan?" Status
 * 
 * Condenses critical safety data into visual pill-shaped indicators:
 * - GFR Status: Green if >30, Red if <30
 * - Allergy Flag: Warning if Contrast/Iodine allergy exists
 * - Anticoagulation Status:
 *   - Green Shield: "Protected (Apixaban)"
 *   - Yellow Shield: "Warfarin (INR: 1.4 - Subtherapeutic)"
 *   - Red Warning: "Med Gap: 45 Days"
 */

import React from 'react';
import type { SafetyFlags, GFRResult, AnticoagulationStatus } from '../utils/clinicalLogic';
import { formatAnticoagStatus } from '../utils/clinicalLogic';
import './SafetyBadge.css';

// ===========================================================================
// Types
// ===========================================================================

interface SafetyBadgeProps {
  safetyFlags: SafetyFlags | null;
  isLoading?: boolean;
  compact?: boolean;
}

interface GFRData {
  value: number;
  isContrastSafe: boolean;
}

interface AnticoagData {
  status: AnticoagulationStatus;
}

interface AllergyData {
  hasContrastAllergy: boolean;
  hasIodineAllergy: boolean;
}

// ===========================================================================
// Sub-Components
// ===========================================================================

function GFRPill({ gfr }: { gfr: GFRResult | null }) {
  if (!gfr) {
    return (
      <div className="safety-pill pill-unknown">
        <span className="pill-icon">🧪</span>
        <span className="pill-label">GFR</span>
        <span className="pill-value">--</span>
      </div>
    );
  }

  const isGood = gfr.contrastSafe;
  const pillClass = isGood ? 'pill-good' : 'pill-danger';

  return (
    <div className={`safety-pill ${pillClass}`} title={gfr.description}>
      <span className="pill-icon">{isGood ? '✓' : '⚠'}</span>
      <span className="pill-label">GFR</span>
      <span className="pill-value">{gfr.value}</span>
      <span className="pill-status">{isGood ? 'Safe' : 'Caution'}</span>
    </div>
  );
}

function AllergyPill({ hasContrast, hasIodine }: { hasContrast: boolean; hasIodine: boolean }) {
  if (!hasContrast && !hasIodine) {
    return (
      <div className="safety-pill pill-good">
        <span className="pill-icon">✓</span>
        <span className="pill-label">Allergy</span>
        <span className="pill-value">Clear</span>
      </div>
    );
  }

  const allergyType = hasContrast && hasIodine ? 'Contrast + Iodine' :
                      hasContrast ? 'Contrast' : 'Iodine';

  return (
    <div className="safety-pill pill-warning">
      <span className="pill-icon">⚠</span>
      <span className="pill-label">Allergy</span>
      <span className="pill-value">{allergyType}</span>
    </div>
  );
}

function AnticoagPill({ status }: { status: AnticoagulationStatus }) {
  const { badge, color, detail } = formatAnticoagStatus(status);
  
  const pillClass = color === 'green' ? 'pill-good' :
                    color === 'yellow' ? 'pill-warning' :
                    color === 'red' ? 'pill-danger' : 'pill-unknown';

  const icon = color === 'green' ? '🛡' :
               color === 'yellow' ? '⚠' :
               color === 'red' ? '🚨' : '?';

  return (
    <div className={`safety-pill ${pillClass}`} title={detail}>
      <span className="pill-icon">{icon}</span>
      <span className="pill-label">Anticoag</span>
      <span className="pill-value pill-value-long">{badge}</span>
    </div>
  );
}

// ===========================================================================
// Main Component
// ===========================================================================

export default function SafetyBadge({ 
  safetyFlags, 
  isLoading = false,
  compact = false 
}: SafetyBadgeProps) {
  if (isLoading) {
    return (
      <div className="safety-badge loading">
        <div className="badge-skeleton">
          <div className="skeleton-pill"></div>
          <div className="skeleton-pill"></div>
          <div className="skeleton-pill"></div>
        </div>
      </div>
    );
  }

  if (!safetyFlags) {
    return (
      <div className="safety-badge empty">
        <div className="badge-empty-state">
          <span className="empty-icon">🔒</span>
          <span className="empty-text">Safety data unavailable</span>
        </div>
      </div>
    );
  }

  const { gfrStatus, contrastAllergy, iodineAllergy, anticoagStatus, canScan, warnings } = safetyFlags;

  return (
    <div className={`safety-badge ${compact ? 'compact' : ''}`}>
      {/* Overall "Can I Scan?" Status */}
      <div className={`scan-status ${canScan ? 'can-scan' : 'caution'}`}>
        <span className="scan-icon">{canScan ? '✓' : '⚠'}</span>
        <span className="scan-label">{canScan ? 'CT Ready' : 'Review'}</span>
      </div>

      {/* Safety Pills */}
      <div className="safety-pills">
        <GFRPill gfr={gfrStatus} />
        <AllergyPill hasContrast={contrastAllergy} hasIodine={iodineAllergy} />
        <AnticoagPill status={anticoagStatus} />
      </div>

      {/* Warnings (if any) */}
      {warnings.length > 0 && (
        <div className="safety-warnings">
          {warnings.slice(0, 2).map((warning, i) => (
            <div key={i} className="warning-item">
              <span className="warning-bullet">•</span>
              <span className="warning-text">{warning}</span>
            </div>
          ))}
          {warnings.length > 2 && (
            <div className="warning-more">
              +{warnings.length - 2} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Compact Badge (for inline use)
// ===========================================================================

interface CompactSafetyBadgeProps {
  canScan: boolean;
  gfr?: number | null;
  hasAllergy?: boolean;
  anticoagStatus?: 'protected' | 'gap' | 'none' | 'unknown';
}

export function CompactSafetyBadge({
  canScan,
  gfr,
  hasAllergy = false,
  anticoagStatus = 'unknown'
}: CompactSafetyBadgeProps) {
  return (
    <div className={`compact-safety-badge ${canScan ? 'safe' : 'caution'}`}>
      <span className="compact-icon">
        {canScan ? '✓' : '⚠'}
      </span>
      <span className="compact-label">
        {canScan ? 'CT Ready' : 'Review'}
      </span>
      {gfr && (
        <span className={`compact-gfr ${gfr >= 30 ? 'good' : 'low'}`}>
          GFR {gfr}
        </span>
      )}
      {hasAllergy && (
        <span className="compact-allergy">Allergy</span>
      )}
    </div>
  );
}
