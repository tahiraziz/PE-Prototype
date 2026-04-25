import type { AssessmentResult } from '../types/assessment';
import { formatProbability } from '../utils/dataTransform';
import { getScoreSummary } from './ClinicalScoresBar';
import { evaluateDDimer, calculateWellsScore, calculatePERC } from '../utils/clinicalLogic';
import './DecisionCard.css';

interface DecisionCardProps {
  result: AssessmentResult | null;
  isLoading: boolean;
  showAgeAdjustedDDimer?: boolean;
}

/**
 * Generate a concise ED-style rationale based on key findings
 * Now includes clinical score context when reinforcing
 */
function generateRationale(result: AssessmentResult): string {
  const features = result.featureSummary;
  const isRuleOut = result.decision === 'rule_out';
  
  const concerns: string[] = [];
  const reassurances: string[] = [];
  
  // Get score summary
  const scores = getScoreSummary(features);
  
  // Check hypoxia
  const spo2 = features.triage_o2sat ?? features.spO2;
  if (spo2 != null && spo2 < 95) {
    concerns.push('hypoxia');
  } else if (spo2 != null && spo2 >= 95) {
    reassurances.push('normal oxygenation');
  }
  
  // Check tachycardia
  const hr = features.triage_hr ?? features.heartRate;
  if (hr != null && hr > 100) {
    concerns.push('tachycardia');
  }
  
  // Check hemodynamic status
  const sbp = features.triage_sbp ?? features.systolicBP;
  const shockIndex = features.shock_index;
  if ((sbp != null && sbp < 90) || (shockIndex != null && shockIndex > 1.0)) {
    concerns.push('hemodynamic instability');
  }
  
  // Check prior VTE
  if (features.prior_pe_diagnosis || features.prior_dvt_diagnosis) {
    concerns.push('prior VTE');
  }
  
  // Check D-Dimer
  const ddimer = features.d_dimer ?? features.dDimer;
  if (ddimer != null && ddimer > 0.5) {
    concerns.push('elevated D-Dimer');
  } else if (ddimer != null && ddimer <= 0.5) {
    reassurances.push('normal D-Dimer');
  }
  
  // Check high-risk conditions
  if (features.prior_cancer) concerns.push('malignancy');
  if (features.recent_surgery) concerns.push('recent surgery');
  
  // Generate rationale with score integration
  if (isRuleOut) {
    // Build reassurance phrase
    let base = '';
    if (reassurances.length > 0) {
      base = `Low-risk presentation with ${reassurances[0]}`;
    } else {
      base = 'Low-risk clinical presentation';
    }
    
    // Add score context if supportive
    if (scores.summary && (scores.wellsLow || scores.percNegative)) {
      return `${base}. ${scores.summary}.`;
    }
    
    if (concerns.length === 0) {
      return `${base}. No high-risk features identified.`;
    }
    
    return `${base} despite ${concerns[0]}.`;
  } else {
    // Continue workup
    let concernPhrase = concerns.length > 0 
      ? concerns.slice(0, 2).join(' and ')
      : 'clinical features';
    
    // Add high-risk score context if present
    if (scores.anyHighRisk && scores.summary) {
      return `Elevated risk due to ${concernPhrase} with ${scores.summary}. Further workup recommended.`;
    }
    
    return `Elevated risk due to ${concernPhrase}. Further workup recommended.`;
  }
}

export default function DecisionCard({ result, isLoading, showAgeAdjustedDDimer = true }: DecisionCardProps) {
  if (isLoading) {
    return (
      <div className="decision-card decision-loading">
        <div className="loading-pulse"></div>
        <span className="loading-text">Analyzing...</span>
      </div>
    );
  }
  
  if (!result) {
    return (
      <div className="decision-card decision-empty">
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <span className="empty-text">Run assessment to see result</span>
        </div>
      </div>
    );
  }
  
  const isRuleOut = result.decision === 'rule_out';
  const rationale = generateRationale(result);
  const features = result.featureSummary;
  
  // Calculate Age-Adjusted D-Dimer
  const age = features.age;
  const ddimerValue = features.d_dimer ?? features.dDimer;
  const ddimerResult = (ddimerValue != null && age != null) 
    ? evaluateDDimer(ddimerValue, age, 'µg/mL')
    : null;

  // Calculate Wells Score
  const wellsResult = calculateWellsScore({
    clinicalDvtSigns: Boolean(features.wells_dvt_signs),
    peLikelyDiagnosis: Boolean(features.wells_pe_likely),
    heartRateOver100: (features.triage_hr ?? features.heartRate ?? 0) > 100,
    immobilizationOrSurgery: Boolean(features.recent_surgery || features.immobilization),
    previousPeDvt: Boolean(features.prior_pe_diagnosis || features.prior_dvt_diagnosis),
    hemoptysis: Boolean(features.wells_hemoptysis),
    malignancy: Boolean(features.prior_cancer),
  });

  // Calculate PERC
  const percResult = calculatePERC({
    ageOver50: (age ?? 0) >= 50,
    heartRateOver100: (features.triage_hr ?? features.heartRate ?? 0) >= 100,
    spo2Under95: (features.triage_o2sat ?? features.spO2 ?? 100) < 95,
    previousPeDvt: Boolean(features.prior_pe_diagnosis || features.prior_dvt_diagnosis),
    surgeryOrTrauma4Weeks: Boolean(features.recent_surgery || features.immobilization),
    hemoptysis: Boolean(features.wells_hemoptysis),
    unilateralLegSwelling: Boolean(features.cc_leg_pain_swelling),
    estrogenUse: Boolean(features.estrogen_use),
  });
  
  return (
    <div className={`decision-card ${isRuleOut ? 'decision-rule-out' : 'decision-continue'}`}>
      {/* Primary Decision - Unmistakable */}
      <div className="decision-primary">
        <div className={`decision-badge ${isRuleOut ? 'badge-rule-out' : 'badge-continue'}`}>
          <span className="badge-icon">{isRuleOut ? '✓' : '→'}</span>
          <span className="badge-text">{isRuleOut ? 'RULE OUT' : 'CONTINUE WORKUP'}</span>
        </div>
      </div>
      
      {/* Probability Context - Quick Reference */}
      <div className="decision-probability">
        <span className="prob-value">{formatProbability(result.probability)}</span>
        <span className="prob-context">
          {isRuleOut ? 'below' : 'above'} {formatProbability(result.threshold)} threshold
        </span>
      </div>

      {/* Decision Anchors Row: Wells, PERC, Age-Adjusted D-Dimer */}
      <div className="decision-anchors">
        {/* Wells Score */}
        <div className={`anchor-pill wells-anchor risk-${wellsResult.risk}`}>
          <span className="anchor-label">Wells</span>
          <span className="anchor-value">{wellsResult.score.toFixed(1)}</span>
          <span className="anchor-risk">{wellsResult.risk}</span>
        </div>

        {/* PERC Rule */}
        <div className={`anchor-pill perc-anchor ${percResult.isNegative ? 'perc-negative' : 'perc-positive'}`}>
          <span className="anchor-label">PERC</span>
          <span className="anchor-value">{percResult.positiveCount}/8</span>
          <span className="anchor-risk">{percResult.isNegative ? 'Neg' : 'Pos'}</span>
        </div>

        {/* Age-Adjusted D-Dimer */}
        {showAgeAdjustedDDimer && ddimerResult && (
          <div className={`anchor-pill ddimer-anchor ${ddimerResult.isElevated ? 'ddimer-elevated' : 'ddimer-normal'}`}>
            <span className="anchor-label">
              D-Dimer {ddimerResult.isAgeAdjusted ? '(Age-Adj)' : ''}
            </span>
            <span className="anchor-value">{ddimerResult.value.toFixed(2)}</span>
            <span className="anchor-threshold">
              / {ddimerResult.threshold.toFixed(2)}
            </span>
            <span className="anchor-risk">
              {ddimerResult.isElevated ? 'High' : 'Normal'}
            </span>
          </div>
        )}

        {/* Show D-Dimer unavailable state */}
        {showAgeAdjustedDDimer && !ddimerResult && (
          <div className="anchor-pill ddimer-anchor ddimer-unknown">
            <span className="anchor-label">D-Dimer</span>
            <span className="anchor-value">--</span>
            <span className="anchor-risk">N/A</span>
          </div>
        )}
      </div>
      
      {/* One-line Rationale - ED Style with score context */}
      <p className="decision-rationale">{rationale}</p>
    </div>
  );
}

