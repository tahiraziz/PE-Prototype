import { useState } from 'react';
import type { FeatureSummary } from '../types/assessment';

interface ClinicalScoresBarProps {
  features: FeatureSummary | null;
}

type RiskLevel = 'low' | 'moderate' | 'high' | 'negative' | 'positive' | 'incomplete';

interface ScoreResult {
  name: string;
  shortName: string;
  value: number | null;
  riskLevel: RiskLevel;
  riskLabel: string;
  isComputable: boolean;
  missingReason?: string;
  components?: { name: string; present: boolean | null; points?: number }[];
}

/**
 * Calculate Wells score risk category
 * Low: <2, Moderate: 2-6, High: >6
 */
function getWellsResult(features: FeatureSummary): ScoreResult {
  const value = features.wells_score ?? features.wellsScore;
  
  // Check if we have enough data to compute
  const hasData = value != null;
  
  if (!hasData) {
    return {
      name: 'Wells Score',
      shortName: 'Wells',
      value: null,
      riskLevel: 'incomplete',
      riskLabel: 'Incomplete',
      isComputable: false,
      missingReason: 'Score not available in data',
      components: []
    };
  }
  
  let riskLevel: RiskLevel = 'low';
  let riskLabel = 'Low';
  
  if (value > 6) {
    riskLevel = 'high';
    riskLabel = 'High';
  } else if (value >= 2) {
    riskLevel = 'moderate';
    riskLabel = 'Moderate';
  }
  
  // Wells components (if available)
  const components = [
    { name: 'Clinical signs of DVT', present: Boolean(features.wells_dvt_signs), points: 3 },
    { name: 'PE most likely diagnosis', present: Boolean(features.wells_pe_likely), points: 3 },
    { name: 'Heart rate > 100', present: Boolean(features.wells_tachycardia), points: 1.5 },
    { name: 'Immobilization/surgery', present: Boolean(features.wells_immobilization || features.recent_surgery), points: 1.5 },
    { name: 'Previous PE/DVT', present: Boolean(features.prior_pe_diagnosis || features.prior_dvt_diagnosis), points: 1.5 },
    { name: 'Hemoptysis', present: Boolean(features.wells_hemoptysis), points: 1 },
    { name: 'Malignancy', present: Boolean(features.prior_cancer), points: 1 },
  ];
  
  return {
    name: 'Wells Score',
    shortName: 'Wells',
    value,
    riskLevel,
    riskLabel,
    isComputable: true,
    components
  };
}

/**
 * Calculate revised Geneva score risk category
 * Low: 0-3, Intermediate: 4-10, High: ≥11
 */
function getGenevaResult(features: FeatureSummary): ScoreResult {
  const value = features.geneva_score ?? features.genevaScore;
  
  // Try to estimate if not directly available
  let estimatedValue = value;
  if (estimatedValue == null) {
    // Can we estimate from available data?
    const age = features.age;
    const hr = features.triage_hr ?? features.heartRate;
    const hasPriorVTE = features.prior_pe_diagnosis || features.prior_dvt_diagnosis;
    
    if (age == null && hr == null) {
      return {
        name: 'Revised Geneva',
        shortName: 'Geneva',
        value: null,
        riskLevel: 'incomplete',
        riskLabel: 'Incomplete',
        isComputable: false,
        missingReason: 'Insufficient data for calculation',
        components: []
      };
    }
    
    // Simplified estimation
    estimatedValue = 0;
    if (age != null && age > 65) estimatedValue += 1;
    if (hasPriorVTE) estimatedValue += 3;
    if (features.prior_cancer) estimatedValue += 2;
    if (hr != null && hr >= 75 && hr < 95) estimatedValue += 3;
    if (hr != null && hr >= 95) estimatedValue += 5;
    if (features.cc_leg_pain_swelling) estimatedValue += 3;
    if (features.wells_hemoptysis) estimatedValue += 2;
    if (features.recent_surgery || features.immobilization) estimatedValue += 2;
  }
  
  let riskLevel: RiskLevel = 'low';
  let riskLabel = 'Low';
  
  if (estimatedValue >= 11) {
    riskLevel = 'high';
    riskLabel = 'High';
  } else if (estimatedValue >= 4) {
    riskLevel = 'moderate';
    riskLabel = 'Intermediate';
  }
  
  const components = [
    { name: 'Age > 65', present: features.age != null && features.age > 65, points: 1 },
    { name: 'Previous DVT/PE', present: Boolean(features.prior_pe_diagnosis || features.prior_dvt_diagnosis), points: 3 },
    { name: 'Active malignancy', present: Boolean(features.prior_cancer), points: 2 },
    { name: 'Heart rate 75-94', present: (features.triage_hr ?? 0) >= 75 && (features.triage_hr ?? 0) < 95, points: 3 },
    { name: 'Heart rate ≥ 95', present: (features.triage_hr ?? 0) >= 95, points: 5 },
    { name: 'Unilateral leg pain', present: Boolean(features.cc_leg_pain_swelling), points: 3 },
    { name: 'Hemoptysis', present: Boolean(features.wells_hemoptysis), points: 2 },
    { name: 'Surgery/immobilization', present: Boolean(features.recent_surgery || features.immobilization), points: 2 },
  ];
  
  return {
    name: 'Revised Geneva',
    shortName: 'Geneva',
    value: estimatedValue,
    riskLevel,
    riskLabel,
    isComputable: true,
    components
  };
}

/**
 * Calculate PERC status
 * All 8 criteria must be absent for PERC negative
 */
function getPERCResult(features: FeatureSummary): ScoreResult {
  // Check if PERC result is directly available
  if (features.perc_negative != null) {
    const isNegative = features.perc_negative === 1 || features.perc_negative === true;
    return {
      name: 'PERC Rule',
      shortName: 'PERC',
      value: features.perc_score ?? null,
      riskLevel: isNegative ? 'negative' : 'positive',
      riskLabel: isNegative ? 'Negative' : 'Positive',
      isComputable: true,
      components: getPERCComponents(features)
    };
  }
  
  // Calculate PERC criteria
  const age = features.age;
  const hr = features.triage_hr ?? features.heartRate;
  const spo2 = features.triage_o2sat ?? features.spO2;
  
  // Need minimum data
  if (age == null || hr == null) {
    return {
      name: 'PERC Rule',
      shortName: 'PERC',
      value: null,
      riskLevel: 'incomplete',
      riskLabel: 'Incomplete',
      isComputable: false,
      missingReason: 'Age or heart rate missing',
      components: []
    };
  }
  
  const criteria = [
    age >= 50,
    hr >= 100,
    spo2 != null && spo2 < 95,
    Boolean(features.prior_pe_diagnosis || features.prior_dvt_diagnosis),
    Boolean(features.recent_surgery || features.immobilization),
    Boolean(features.wells_hemoptysis),
    Boolean(features.cc_leg_pain_swelling),
    Boolean(features.estrogen_use)
  ];
  
  const positiveCount = criteria.filter(Boolean).length;
  const isNegative = positiveCount === 0;
  
  return {
    name: 'PERC Rule',
    shortName: 'PERC',
    value: positiveCount,
    riskLevel: isNegative ? 'negative' : 'positive',
    riskLabel: isNegative ? 'Negative' : 'Positive',
    isComputable: true,
    components: getPERCComponents(features)
  };
}

function getPERCComponents(features: FeatureSummary) {
  return [
    { name: 'Age ≥ 50', present: features.age != null && features.age >= 50 },
    { name: 'HR ≥ 100', present: (features.triage_hr ?? 0) >= 100 },
    { name: 'SpO₂ < 95%', present: (features.triage_o2sat ?? 100) < 95 },
    { name: 'Prior DVT/PE', present: Boolean(features.prior_pe_diagnosis || features.prior_dvt_diagnosis) },
    { name: 'Recent surgery/immobilization', present: Boolean(features.recent_surgery || features.immobilization) },
    { name: 'Hemoptysis', present: Boolean(features.wells_hemoptysis) },
    { name: 'Unilateral leg swelling', present: Boolean(features.cc_leg_pain_swelling) },
    { name: 'Estrogen use', present: Boolean(features.estrogen_use) },
  ];
}

function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'low':
    case 'negative':
      return 'score-low';
    case 'moderate':
      return 'score-moderate';
    case 'high':
    case 'positive':
      return 'score-high';
    case 'incomplete':
      return 'score-incomplete';
  }
}

/**
 * Compact clinical scores bar - Wells, Geneva, PERC side by side
 */
export default function ClinicalScoresBar({ features }: ClinicalScoresBarProps) {
  const [expandedScore, setExpandedScore] = useState<string | null>(null);
  
  if (!features) return null;
  
  const wells = getWellsResult(features);
  const geneva = getGenevaResult(features);
  const perc = getPERCResult(features);
  
  const scores = [wells, geneva, perc];
  
  const handleToggle = (shortName: string) => {
    setExpandedScore(prev => prev === shortName ? null : shortName);
  };
  
  return (
    <div className="clinical-scores">
      <div className="scores-header">Traditional clinical scores (for context)</div>
      
      <div className="scores-bar">
        {scores.map((score) => (
          <div key={score.shortName} className="score-wrapper">
            <button
              className={`score-chip ${getRiskColor(score.riskLevel)} ${expandedScore === score.shortName ? 'expanded' : ''}`}
              onClick={() => handleToggle(score.shortName)}
              title={score.isComputable ? `Click for ${score.name} details` : score.missingReason}
            >
              <span className="score-name">{score.shortName}</span>
              {score.isComputable ? (
                <>
                  {score.value != null && score.shortName !== 'PERC' && (
                    <span className="score-value">{score.value}</span>
                  )}
                  <span className="score-label">{score.riskLabel}</span>
                </>
              ) : (
                <span className="score-label incomplete">{score.riskLabel}</span>
              )}
              <span className="score-expand">{expandedScore === score.shortName ? '▲' : '▼'}</span>
            </button>
            
            {expandedScore === score.shortName && score.components && score.components.length > 0 && (
              <div className="score-details">
                <div className="details-title">{score.name} Components</div>
                <ul className="details-list">
                  {score.components.map((comp, i) => (
                    <li key={i} className={comp.present ? 'comp-present' : 'comp-absent'}>
                      <span className="comp-check">{comp.present ? '●' : '○'}</span>
                      <span className="comp-name">{comp.name}</span>
                      {comp.points != null && comp.present && (
                        <span className="comp-points">+{comp.points}</span>
                      )}
                    </li>
                  ))}
                </ul>
                {!score.isComputable && score.missingReason && (
                  <div className="details-warning">{score.missingReason}</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Export score summary for use in rationale generation
 */
export function getScoreSummary(features: FeatureSummary | null): {
  wellsLow: boolean;
  genevaLow: boolean;
  percNegative: boolean;
  anyHighRisk: boolean;
  summary: string | null;
} {
  if (!features) {
    return { wellsLow: false, genevaLow: false, percNegative: false, anyHighRisk: false, summary: null };
  }
  
  const wells = getWellsResult(features);
  const geneva = getGenevaResult(features);
  const perc = getPERCResult(features);
  
  const wellsLow = wells.riskLevel === 'low';
  const genevaLow = geneva.riskLevel === 'low';
  const percNegative = perc.riskLevel === 'negative';
  const anyHighRisk = wells.riskLevel === 'high' || geneva.riskLevel === 'high';
  
  // Generate summary for rationale
  const lowScores: string[] = [];
  const highScores: string[] = [];
  
  if (wellsLow) lowScores.push('Wells low-risk');
  if (genevaLow) lowScores.push('Geneva low');
  if (percNegative) lowScores.push('PERC negative');
  
  if (wells.riskLevel === 'high') highScores.push('high Wells');
  if (geneva.riskLevel === 'high') highScores.push('high Geneva');
  if (perc.riskLevel === 'positive' && !percNegative) highScores.push('PERC positive');
  
  let summary: string | null = null;
  if (lowScores.length >= 2) {
    summary = lowScores.slice(0, 2).join(' and ');
  } else if (highScores.length > 0) {
    summary = highScores[0];
  } else if (lowScores.length === 1) {
    summary = lowScores[0];
  }
  
  return { wellsLow, genevaLow, percNegative, anyHighRisk, summary };
}

