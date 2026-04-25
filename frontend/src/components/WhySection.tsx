import { useState } from 'react';
import type { AssessmentResult } from '../types/assessment';

interface WhySectionProps {
  result: AssessmentResult | null;
}

/**
 * Safe number formatter - never crashes on null/undefined/NaN
 */
const fmt = (x: unknown, digits = 1): string => {
  if (typeof x === 'number' && Number.isFinite(x)) {
    return x.toFixed(digits);
  }
  return '—';
};

/**
 * Safe integer/whole number display
 */
const fmtInt = (x: unknown): string => {
  if (typeof x === 'number' && Number.isFinite(x)) {
    return Math.round(x).toString();
  }
  return '—';
};

/**
 * Check if value is a valid finite number
 */
const isNum = (x: unknown): x is number => {
  return typeof x === 'number' && Number.isFinite(x);
};

/**
 * Why Section - Layer 2 component
 * Expandable "Why this result?" with bullet rationale
 */
export default function WhySection({ result }: WhySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!result) return null;

  // Generate rationale bullets based on result
  const generateRationale = (): string[] => {
    const bullets: string[] = [];
    const features = result.featureSummary || {};
    
    // Primary decision factor - guard probability
    const prob = result.probability;
    if (isNum(prob)) {
      const probPct = fmt(prob * 100, 1);
      if (result.decision === 'rule_out') {
        bullets.push(`Probability ${probPct}% is below 8% threshold`);
      } else {
        bullets.push(`Probability ${probPct}% exceeds 8% threshold`);
      }
    } else {
      bullets.push(`Decision: ${result.decision === 'rule_out' ? 'Rule out' : 'Continue workup'}`);
    }
    
    // Key vital signs - all guarded
    const spo2 = features.triage_o2sat;
    if (isNum(spo2)) {
      if (spo2 >= 95) {
        bullets.push(`SpO₂ ${fmtInt(spo2)}% is normal`);
      } else if (spo2 < 94) {
        bullets.push(`SpO₂ ${fmtInt(spo2)}% is low (concerning)`);
      }
    }
    
    const hr = features.triage_hr;
    if (isNum(hr)) {
      if (hr >= 100) {
        bullets.push(`Heart rate ${fmtInt(hr)} bpm indicates tachycardia`);
      } else {
        bullets.push(`Heart rate ${fmtInt(hr)} bpm is within normal range`);
      }
    }
    
    // D-Dimer if present - MUST guard against null/undefined
    const ddimer = features.d_dimer;
    if (isNum(ddimer)) {
      if (ddimer < 0.5) {
        bullets.push(`D-Dimer ${fmt(ddimer, 2)} is below cutoff`);
      } else {
        bullets.push(`D-Dimer ${fmt(ddimer, 2)} is elevated`);
      }
    }
    
    // Risk factors
    if (features.prior_pe_dvt === true) {
      bullets.push('Prior PE/DVT history increases risk');
    }
    if (features.active_cancer === true) {
      bullets.push('Active cancer is a risk factor');
    }
    if (features.recent_surgery === true) {
      bullets.push('Recent surgery/immobilization noted');
    }
    
    // Age - guarded
    const age = features.age;
    if (isNum(age)) {
      bullets.push(`Age ${fmtInt(age)} years considered in model`);
    }
    
    // Missing data caveat
    if (result.missingFields && Array.isArray(result.missingFields) && result.missingFields.length > 0) {
      const missingNames = result.missingFields
        .filter(f => f && f.displayName)
        .slice(0, 2)
        .map(f => f.displayName);
      if (missingNames.length > 0) {
        bullets.push(`Some data unavailable: ${missingNames.join(', ')}`);
      }
    }
    
    return bullets;
  };

  const rationale = generateRationale();

  return (
    <div className="why-section">
      <button 
        className={`why-header ${isExpanded ? 'expanded' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="why-icon">{isExpanded ? '▼' : '▶'}</span>
        <span className="why-title">Why this result?</span>
        <span className="why-hint">
          {result.decision === 'rule_out' ? 'Low probability factors' : 'Elevated risk factors'}
        </span>
      </button>
      
      {isExpanded && (
        <div className="why-content">
          <ul className="rationale-list">
            {rationale.map((bullet, i) => (
              <li key={i}>{bullet}</li>
            ))}
          </ul>
          <div className="why-disclaimer">
            Model output only. Clinical judgment required.
          </div>
        </div>
      )}
    </div>
  );
}
