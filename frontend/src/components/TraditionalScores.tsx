import { useState } from 'react';

interface TraditionalScoresProps {
  features: Record<string, unknown> | null;
}

interface ScoreCriterion {
  name: string;
  met: boolean | null; // null = data unavailable
  points: number;
  dataUsed?: string;
}

interface ScoreResult {
  name: string;
  value: number | null;
  risk: 'low' | 'moderate' | 'high' | 'unknown';
  label: string;
  shortLabel: string;
  criteria: ScoreCriterion[];
  whyAbnormal: string | null;
}

/**
 * Traditional Scores with dropdown menus
 * Shows YEARS, Wells, Geneva, PERC as compact pills with expandable details
 */
export default function TraditionalScores({ features }: TraditionalScoresProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const toggleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  // Calculate YEARS algorithm criteria
  const calculateYEARS = (): ScoreResult => {
    const criteria: ScoreCriterion[] = [];
    let score = 0;
    
    const hasDVTSigns = features?.dvt_signs === true || features?.leg_swelling === true;
    const hasHemoptysis = features?.hemoptysis === true;
    const isPEMostLikely = features?.pe_most_likely === true;
    
    criteria.push({
      name: 'Clinical signs of DVT',
      met: features ? hasDVTSigns : null,
      points: 1,
      dataUsed: features?.dvt_signs !== undefined ? 'Chart documented' : undefined
    });
    criteria.push({
      name: 'Hemoptysis',
      met: features ? hasHemoptysis : null,
      points: 1
    });
    criteria.push({
      name: 'PE most likely diagnosis',
      met: features ? isPEMostLikely : null,
      points: 1
    });
    
    if (hasDVTSigns) score++;
    if (hasHemoptysis) score++;
    if (isPEMostLikely) score++;
    
    const ddimer = features?.d_dimer as number | undefined;
    const hasDdimer = ddimer !== undefined && ddimer !== null;
    
    let risk: 'low' | 'moderate' | 'high' | 'unknown' = 'unknown';
    let label = hasDdimer ? `${score}/3` : `${score}/3 (no D-Dimer)`;
    let shortLabel = `${score}/3`;
    let whyAbnormal: string | null = null;
    
    if (hasDdimer) {
      if (score === 0 && ddimer < 1.0) {
        risk = 'low';
        whyAbnormal = null;
      } else if (score > 0 && ddimer < 0.5) {
        risk = 'low';
        whyAbnormal = null;
      } else if (score > 0) {
        risk = 'moderate';
        whyAbnormal = `${score} criteria + D-Dimer ≥${score === 0 ? '1.0' : '0.5'}`;
      }
    } else if (!features) {
      risk = 'unknown';
    }
    
    return { name: 'YEARS', value: score, risk, label, shortLabel, criteria, whyAbnormal };
  };

  // Calculate Wells PE score
  const calculateWells = (): ScoreResult => {
    const criteria: ScoreCriterion[] = [];
    let score = 0;
    
    const hr = features?.triage_hr as number | undefined;
    const hrAbove100 = hr !== undefined ? hr > 100 : null;
    
    const checks = [
      { name: 'Clinical signs of DVT', value: features?.dvt_signs, points: 3 },
      { name: 'PE most likely diagnosis', value: features?.pe_most_likely, points: 3 },
      { name: 'Heart rate >100', value: hrAbove100, points: 1.5, dataUsed: hr ? `HR: ${hr}` : undefined },
      { name: 'Immobilization/surgery (last 4 wks)', value: features?.immobilization ?? features?.recent_surgery, points: 1.5 },
      { name: 'Previous PE/DVT', value: features?.prior_pe_dvt, points: 1.5 },
      { name: 'Hemoptysis', value: features?.hemoptysis, points: 1 },
      { name: 'Active cancer', value: features?.active_cancer, points: 1 }
    ];
    
    checks.forEach(check => {
      const met = check.value === true;
      criteria.push({
        name: check.name,
        met: check.value !== undefined ? met : null,
        points: check.points,
        dataUsed: check.dataUsed
      });
      if (met) score += check.points;
    });
    
    let risk: 'low' | 'moderate' | 'high' | 'unknown';
    let whyAbnormal: string | null = null;
    
    if (!features) {
      risk = 'unknown';
    } else if (score <= 2) {
      risk = 'low';
    } else if (score <= 6) {
      risk = 'moderate';
      whyAbnormal = `Score ${score} indicates moderate probability`;
    } else {
      risk = 'high';
      whyAbnormal = `Score ${score} indicates high probability`;
    }
    
    return { 
      name: 'Wells', 
      value: score, 
      risk, 
      label: `${score}`,
      shortLabel: `${score}`,
      criteria,
      whyAbnormal
    };
  };

  // Calculate revised Geneva score
  const calculateGeneva = (): ScoreResult => {
    const criteria: ScoreCriterion[] = [];
    let score = 0;
    
    const age = features?.age as number | undefined;
    const hr = features?.triage_hr as number | undefined;
    
    const checks = [
      { name: 'Age >65 years', value: age !== undefined ? age > 65 : null, points: 1, dataUsed: age ? `Age: ${age}` : undefined },
      { name: 'Previous PE/DVT', value: features?.prior_pe_dvt, points: 3 },
      { name: 'Surgery/fracture (last month)', value: features?.recent_surgery ?? features?.fracture_within_month, points: 2 },
      { name: 'Active malignancy', value: features?.active_cancer, points: 2 },
      { name: 'Unilateral lower limb pain', value: features?.unilateral_leg_pain, points: 3 },
      { name: 'Pain on palpation + edema', value: features?.leg_pain_on_palpation, points: 4 },
      { name: 'Heart rate 75-94', value: hr !== undefined ? (hr >= 75 && hr < 95) : null, points: 3, dataUsed: hr ? `HR: ${hr}` : undefined },
      { name: 'Heart rate ≥95', value: hr !== undefined ? hr >= 95 : null, points: 5, dataUsed: hr ? `HR: ${hr}` : undefined },
      { name: 'Hemoptysis', value: features?.hemoptysis, points: 2 }
    ];
    
    checks.forEach(check => {
      const met = check.value === true;
      criteria.push({
        name: check.name,
        met: check.value !== undefined ? met : null,
        points: check.points,
        dataUsed: check.dataUsed
      });
      if (met) score += check.points;
    });
    
    let risk: 'low' | 'moderate' | 'high' | 'unknown';
    let whyAbnormal: string | null = null;
    
    if (!features) {
      risk = 'unknown';
    } else if (score <= 3) {
      risk = 'low';
    } else if (score <= 10) {
      risk = 'moderate';
      whyAbnormal = `Score ${score} indicates intermediate probability`;
    } else {
      risk = 'high';
      whyAbnormal = `Score ${score} indicates high probability`;
    }
    
    return { 
      name: 'Geneva', 
      value: score, 
      risk, 
      label: `${score}`,
      shortLabel: `${score}`,
      criteria,
      whyAbnormal
    };
  };

  // Calculate PERC rule
  const calculatePERC = (): ScoreResult => {
    const criteria: ScoreCriterion[] = [];
    
    const age = features?.age as number | undefined;
    const hr = features?.triage_hr as number | undefined;
    const spo2 = features?.triage_o2sat as number | undefined;
    
    const checks = [
      { name: 'Age <50', value: age !== undefined ? age < 50 : null, dataUsed: age ? `Age: ${age}` : undefined },
      { name: 'HR <100', value: hr !== undefined ? hr < 100 : null, dataUsed: hr ? `HR: ${hr}` : undefined },
      { name: 'SpO₂ ≥95%', value: spo2 !== undefined ? spo2 >= 95 : null, dataUsed: spo2 ? `SpO₂: ${spo2}%` : undefined },
      { name: 'No hemoptysis', value: features?.hemoptysis !== undefined ? features.hemoptysis !== true : null },
      { name: 'No estrogen use', value: features?.estrogen_use !== undefined ? features.estrogen_use !== true : null },
      { name: 'No prior PE/DVT', value: features?.prior_pe_dvt !== undefined ? features.prior_pe_dvt !== true : null },
      { name: 'No unilateral leg swelling', value: features?.unilateral_leg_swelling !== undefined ? features.unilateral_leg_swelling !== true : null },
      { name: 'No surgery/trauma (last 4 wks)', value: features?.recent_surgery_trauma !== undefined ? features.recent_surgery_trauma !== true : null }
    ];
    
    let metCount = 0;
    let knownCount = 0;
    
    checks.forEach(check => {
      criteria.push({
        name: check.name,
        met: check.value,
        points: 1,
        dataUsed: check.dataUsed
      });
      if (check.value !== null) {
        knownCount++;
        if (check.value) metCount++;
      }
    });
    
    const allMet = metCount === 8;
    const isComplete = knownCount === 8;
    
    let risk: 'low' | 'moderate' | 'high' | 'unknown';
    let whyAbnormal: string | null = null;
    
    if (!features || knownCount < 4) {
      risk = 'unknown';
    } else if (allMet) {
      risk = 'low';
    } else {
      risk = 'moderate';
      const failedCriteria = criteria.filter(c => c.met === false).map(c => c.name);
      whyAbnormal = `Failed: ${failedCriteria.slice(0, 2).join(', ')}${failedCriteria.length > 2 ? '...' : ''}`;
    }
    
    return {
      name: 'PERC',
      value: metCount,
      risk,
      label: allMet ? 'Negative' : (isComplete ? 'Positive' : `${metCount}/8`),
      shortLabel: allMet ? 'Neg' : 'Pos',
      criteria,
      whyAbnormal
    };
  };

  const scores = [calculateYEARS(), calculateWells(), calculateGeneva(), calculatePERC()];

  const getRiskClass = (risk: string) => {
    switch (risk) {
      case 'low': return '';
      case 'moderate': return 'risk-moderate';
      case 'high': return 'risk-high';
      default: return 'risk-unknown';
    }
  };

  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case 'low': return 'Low';
      case 'moderate': return 'Mod';
      case 'high': return 'High';
      default: return '?';
    }
  };

  return (
    <div className="traditional-scores-v2">
      <div className="scores-row-v2">
        {scores.map(score => (
          <div key={score.name} className="score-wrapper">
            <button
              className={`score-pill ${getRiskClass(score.risk)} ${openDropdown === score.name ? 'active' : ''}`}
              onClick={() => toggleDropdown(score.name)}
            >
              <span className="score-name">{score.name}</span>
              <span className="score-value">{score.label}</span>
              <span className={`score-risk ${getRiskClass(score.risk)}`}>
                {getRiskLabel(score.risk)}
              </span>
              <span className="dropdown-arrow">{openDropdown === score.name ? '▲' : '▼'}</span>
            </button>

            {openDropdown === score.name && (
              <div className="score-dropdown">
                {score.whyAbnormal && (
                  <div className="why-abnormal">
                    ⚠ {score.whyAbnormal}
                  </div>
                )}
                
                <div className="criteria-list">
                  {score.criteria.map((c, i) => (
                    <div 
                      key={i} 
                      className={`criterion ${c.met === true ? 'met' : c.met === false ? 'not-met' : 'unknown'}`}
                    >
                      <span className="criterion-icon">
                        {c.met === true ? '✓' : c.met === false ? '✗' : '?'}
                      </span>
                      <span className="criterion-name">
                        {c.name}
                        {c.points > 1 && <span className="criterion-points">+{c.points}</span>}
                      </span>
                      {c.dataUsed && (
                        <span className="criterion-data">{c.dataUsed}</span>
                      )}
                      {c.met === null && (
                        <span className="criterion-missing">Not in record</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
