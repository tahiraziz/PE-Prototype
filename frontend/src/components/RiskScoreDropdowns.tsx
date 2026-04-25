import { useState } from 'react';

interface RiskScoreDropdownsProps {
  features: Record<string, unknown> | null;
}

interface ScoreConfig {
  key: string;
  name: string;
  scoreKey: string;
  maxScore: number;
  thresholds: { low: number; high: number };
  criteria: { key: string; label: string; points: number }[];
}

const SCORE_CONFIGS: ScoreConfig[] = [
  {
    key: 'years',
    name: 'YEARS',
    scoreKey: 'years_score',
    maxScore: 3,
    thresholds: { low: 0, high: 1 },
    criteria: [
      { key: 'clinical_signs_dvt', label: 'Clinical signs of DVT', points: 1 },
      { key: 'hemoptysis', label: 'Hemoptysis', points: 1 },
      { key: 'pe_most_likely', label: 'PE most likely diagnosis', points: 1 }
    ]
  },
  {
    key: 'wells',
    name: 'Wells',
    scoreKey: 'wells_score',
    maxScore: 12.5,
    thresholds: { low: 2, high: 6 },
    criteria: [
      { key: 'clinical_signs_dvt', label: 'Clinical signs DVT', points: 3 },
      { key: 'heart_rate_gt_100', label: 'HR >100', points: 1.5 },
      { key: 'immobilization_surgery', label: 'Immobilization/surgery', points: 1.5 },
      { key: 'prior_pe_dvt', label: 'Prior PE/DVT', points: 1.5 },
      { key: 'hemoptysis', label: 'Hemoptysis', points: 1 },
      { key: 'active_cancer', label: 'Active cancer', points: 1 },
      { key: 'pe_most_likely', label: 'PE most likely', points: 3 }
    ]
  },
  {
    key: 'geneva',
    name: 'Geneva',
    scoreKey: 'geneva_score',
    maxScore: 22,
    thresholds: { low: 3, high: 10 },
    criteria: [
      { key: 'age_gt_65', label: 'Age >65', points: 1 },
      { key: 'prior_pe_dvt', label: 'Prior PE/DVT', points: 3 },
      { key: 'surgery_fracture', label: 'Surgery/fracture <1mo', points: 2 },
      { key: 'active_cancer', label: 'Active cancer', points: 2 },
      { key: 'unilateral_leg_pain', label: 'Unilateral leg pain', points: 3 },
      { key: 'hemoptysis', label: 'Hemoptysis', points: 2 },
      { key: 'heart_rate_75_94', label: 'HR 75-94', points: 3 },
      { key: 'heart_rate_gt_95', label: 'HR ≥95', points: 5 },
      { key: 'leg_pain_palpation', label: 'Pain on leg palpation', points: 4 }
    ]
  },
  {
    key: 'perc',
    name: 'PERC',
    scoreKey: 'perc_score',
    maxScore: 8,
    thresholds: { low: 0, high: 1 },
    criteria: [
      { key: 'age_gte_50', label: 'Age ≥50', points: 1 },
      { key: 'heart_rate_gte_100', label: 'HR ≥100', points: 1 },
      { key: 'spo2_lt_95', label: 'SpO₂ <95%', points: 1 },
      { key: 'prior_pe_dvt', label: 'Prior PE/DVT', points: 1 },
      { key: 'recent_surgery', label: 'Recent surgery/trauma', points: 1 },
      { key: 'hemoptysis', label: 'Hemoptysis', points: 1 },
      { key: 'estrogen_use', label: 'Estrogen use', points: 1 },
      { key: 'unilateral_leg_swelling', label: 'Unilateral leg swelling', points: 1 }
    ]
  }
];

/**
 * RiskScoreDropdowns - Compact dropdown pills for traditional PE risk scores
 * Layer 1 second-level: click to expand criteria
 * Professional styling, no emojis
 */
export default function RiskScoreDropdowns({ features }: RiskScoreDropdownsProps) {
  const [expandedScore, setExpandedScore] = useState<string | null>(null);

  const getScoreValue = (config: ScoreConfig): number | null => {
    if (!features) return null;
    const value = features[config.scoreKey];
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  };

  const getRiskLevel = (config: ScoreConfig, score: number | null): 'low' | 'mod' | 'high' | 'unknown' => {
    if (score === null) return 'unknown';
    
    // PERC is special: 0 = negative (safe), any positive = not safe to rule out
    if (config.key === 'perc') {
      return score === 0 ? 'low' : 'high';
    }
    
    if (score <= config.thresholds.low) return 'low';
    if (score >= config.thresholds.high) return 'high';
    return 'mod';
  };

  const getRiskLabel = (config: ScoreConfig, level: string): string => {
    if (config.key === 'perc') {
      return level === 'low' ? 'Negative' : level === 'high' ? 'Positive' : 'Unknown';
    }
    switch (level) {
      case 'low': return 'Low';
      case 'mod': return 'Mod';
      case 'high': return 'High';
      default: return '—';
    }
  };

  const getCriteriaStatus = (config: ScoreConfig): { met: string[]; notMet: string[] } => {
    const met: string[] = [];
    const notMet: string[] = [];
    
    if (!features) return { met, notMet };
    
    for (const c of config.criteria) {
      const val = features[c.key];
      if (val === true || val === 1) {
        met.push(c.label);
      } else {
        notMet.push(c.label);
      }
    }
    
    return { met, notMet };
  };

  const toggleExpanded = (key: string) => {
    setExpandedScore(expandedScore === key ? null : key);
  };

  return (
    <div className="risk-scores-section">
      <div className="section-label">Clinical Scores</div>
      <div className="scores-row">
        {SCORE_CONFIGS.map(config => {
          const score = getScoreValue(config);
          const level = getRiskLevel(config, score);
          const label = getRiskLabel(config, level);
          const isExpanded = expandedScore === config.key;
          
          return (
            <div key={config.key} className="score-dropdown-container">
              <button
                className={`score-pill level-${level}`}
                onClick={() => toggleExpanded(config.key)}
                aria-expanded={isExpanded}
              >
                <span className="score-name">{config.name}</span>
                <span className="score-value">
                  {score !== null ? score.toFixed(config.key === 'wells' ? 1 : 0) : '—'}
                </span>
                <span className={`score-level level-${level}`}>{label}</span>
                <span className="dropdown-arrow">{isExpanded ? '▲' : '▼'}</span>
              </button>
              
              {isExpanded && (
                <div className="score-dropdown-panel">
                  <div className="dropdown-header">
                    {config.name} Score Criteria
                  </div>
                  <div className="criteria-list">
                    {(() => {
                      const { met, notMet } = getCriteriaStatus(config);
                      return (
                        <>
                          {met.length > 0 && (
                            <div className="criteria-group">
                              <div className="group-label positive">Present:</div>
                              {met.map((c, i) => (
                                <div key={i} className="criterion-item positive">● {c}</div>
                              ))}
                            </div>
                          )}
                          {notMet.length > 0 && met.length > 0 && (
                            <div className="criteria-divider" />
                          )}
                          {notMet.length > 0 && (
                            <div className="criteria-group">
                              <div className="group-label negative">Not present:</div>
                              {notMet.map((c, i) => (
                                <div key={i} className="criterion-item negative">○ {c}</div>
                              ))}
                            </div>
                          )}
                          {met.length === 0 && notMet.length === 0 && (
                            <div className="no-criteria">No criteria data available</div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

