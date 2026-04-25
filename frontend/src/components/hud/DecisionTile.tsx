/**
 * Decision Tile Component (Zone A - Top Left)
 * 
 * HUD-style display of clinical decision anchors:
 * - Wells Score (large number)
 * - PERC Result (Pos/Neg)
 * - D-Dimer with age-adjusted threshold bar
 * 
 * Design: Huge fonts, minimal labels, high information density
 */

import { useMemo } from 'react';
import { calculateDDimerThreshold, calculateWellsScore, calculatePERC } from '../../utils/clinicalRules';
import './DecisionTile.css';

// ===========================================================================
// Types
// ===========================================================================

interface DecisionTileProps {
  data: {
    age?: number | null;
    wellsScore?: number | null;
    wellsComponents?: {
      clinicalDVT?: boolean;
      peLikely?: boolean;
      hr100?: boolean;
      immobilization?: boolean;
      priorVTE?: boolean;
      hemoptysis?: boolean;
      malignancy?: boolean;
    };
    percComponents?: {
      age50?: boolean;
      hr100?: boolean;
      spo2lt95?: boolean;
      priorVTE?: boolean;
      surgery4wk?: boolean;
      hemoptysis?: boolean;
      legSwelling?: boolean;
      estrogenUse?: boolean;
    };
    percScore?: number | null;
    percNegative?: boolean | null;
    dDimer?: number | null;
    dDimerUnits?: string;
  } | null;
  isLoading?: boolean;
}

// ===========================================================================
// Sub-Components
// ===========================================================================

function WellsScoreDisplay({ score, risk }: { score: number | null; risk: 'low' | 'moderate' | 'high' }) {
  const riskColors = {
    low: 'score-low',
    moderate: 'score-moderate',
    high: 'score-high'
  };

  return (
    <div className={`score-block wells-block ${riskColors[risk]}`}>
      <div className="score-value">
        {score != null ? score.toFixed(1) : '--'}
      </div>
      <div className="score-label">Wells</div>
      <div className={`score-risk risk-${risk}`}>
        {risk.toUpperCase()}
      </div>
    </div>
  );
}

function PERCDisplay({ isNegative, count }: { isNegative: boolean; count: number }) {
  return (
    <div className={`score-block perc-block ${isNegative ? 'perc-negative' : 'perc-positive'}`}>
      <div className="score-value">
        {isNegative ? '−' : count}
      </div>
      <div className="score-label">PERC</div>
      <div className={`score-risk ${isNegative ? 'risk-low' : 'risk-high'}`}>
        {isNegative ? 'NEG' : 'POS'}
      </div>
    </div>
  );
}

function DDimerBar({ 
  value, 
  threshold, 
  isElevated, 
  isAgeAdjusted 
}: { 
  value: number; 
  threshold: number; 
  isElevated: boolean;
  isAgeAdjusted: boolean;
}) {
  // Calculate bar width (capped at 150%)
  const percent = Math.min((value / threshold) * 100, 150);
  const thresholdPercent = 100;

  return (
    <div className="ddimer-section">
      <div className="ddimer-header">
        <span className="ddimer-label">D-Dimer</span>
        <span className={`ddimer-status ${isElevated ? 'elevated' : 'normal'}`}>
          {isElevated ? 'ELEVATED' : 'NORMAL'}
        </span>
      </div>
      
      <div className="ddimer-bar-container">
        {/* Threshold marker */}
        <div 
          className="ddimer-threshold-line" 
          style={{ left: `${Math.min(thresholdPercent, 100)}%` }}
        >
          <span className="threshold-value">
            {threshold.toFixed(2)}
            {isAgeAdjusted && <span className="age-adj">*</span>}
          </span>
        </div>
        
        {/* Value bar */}
        <div 
          className={`ddimer-bar ${isElevated ? 'bar-elevated' : 'bar-normal'}`}
          style={{ width: `${percent}%` }}
        />
        
        {/* Value label */}
        <div className="ddimer-value-label">
          <span className="value">{value.toFixed(2)}</span>
          <span className="unit">µg/mL</span>
        </div>
      </div>
      
      {isAgeAdjusted && (
        <div className="age-adjusted-note">
          *Age-adjusted threshold
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Main Component
// ===========================================================================

export default function DecisionTile({ data, isLoading = false }: DecisionTileProps) {
  // Calculate Wells
  const wellsResult = useMemo(() => {
    if (data?.wellsScore != null) {
      const risk = data.wellsScore < 2 ? 'low' : data.wellsScore <= 6 ? 'moderate' : 'high';
      return { score: data.wellsScore, risk };
    }
    if (data?.wellsComponents) {
      return calculateWellsScore(data.wellsComponents);
    }
    return { score: null, risk: 'low' as const };
  }, [data?.wellsScore, data?.wellsComponents]);

  // Calculate PERC
  const percResult = useMemo(() => {
    if (data?.percNegative != null) {
      return { 
        isNegative: data.percNegative, 
        positiveCount: data.percScore ?? 0 
      };
    }
    if (data?.percComponents) {
      return calculatePERC(data.percComponents);
    }
    return { isNegative: false, positiveCount: 0 };
  }, [data?.percNegative, data?.percScore, data?.percComponents]);

  // Calculate D-Dimer threshold
  const ddimerResult = useMemo(() => {
    if (data?.dDimer == null) return null;
    return calculateDDimerThreshold(
      data.dDimer, 
      data.age ?? null,
      (data.dDimerUnits?.toLowerCase().includes('ng') ? 'ng/mL' : 'ug/mL')
    );
  }, [data?.dDimer, data?.age, data?.dDimerUnits]);

  if (isLoading) {
    return (
      <div className="decision-tile loading">
        <div className="skeleton-scores">
          <div className="skeleton skeleton-score"></div>
          <div className="skeleton skeleton-score"></div>
        </div>
        <div className="skeleton skeleton-bar"></div>
      </div>
    );
  }

  return (
    <div className="decision-tile">
      {/* Primary Scores Row */}
      <div className="scores-row">
        <WellsScoreDisplay 
          score={wellsResult.score} 
          risk={wellsResult.risk} 
        />
        <PERCDisplay 
          isNegative={percResult.isNegative} 
          count={percResult.positiveCount} 
        />
      </div>

      {/* D-Dimer Threshold Bar */}
      {ddimerResult && (
        <DDimerBar
          value={ddimerResult.value}
          threshold={ddimerResult.threshold}
          isElevated={ddimerResult.isElevated}
          isAgeAdjusted={ddimerResult.isAgeAdjusted}
        />
      )}

      {/* Empty state for D-Dimer */}
      {!ddimerResult && (
        <div className="ddimer-pending">
          <span className="pending-icon">⏳</span>
          <span className="pending-text">D-Dimer Pending</span>
        </div>
      )}
    </div>
  );
}
