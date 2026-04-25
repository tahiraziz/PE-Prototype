import { useState } from 'react';

interface RiskFlags {
  prior_pe: boolean;
  prior_dvt: boolean;
  active_malignancy: boolean;
  recent_surgery: boolean;
  pregnancy: boolean;
  thrombophilia: boolean;
}

interface Condition {
  display: string;
  category: 'risk' | 'mimic' | 'other';
}

interface HistoryFlagsProps {
  riskFlags: RiskFlags | null;
  conditions: Condition[] | null;
  loading?: boolean;
  error?: string | null;
}

const RISK_FLAG_LABELS: Record<keyof RiskFlags, string> = {
  prior_pe: 'Prior PE',
  prior_dvt: 'Prior DVT',
  active_malignancy: 'Active Cancer',
  recent_surgery: 'Recent Surgery',
  pregnancy: 'Pregnancy',
  thrombophilia: 'Thrombophilia',
};

const MAX_VISIBLE_FLAGS = 4;

/**
 * HistoryFlags - Compact row showing prior diagnoses and risk factors
 * Layer 1 component - always visible
 */
export default function HistoryFlags({ 
  riskFlags, 
  conditions,
  loading,
  error 
}: HistoryFlagsProps) {
  const [showMimics, setShowMimics] = useState(false);

  if (loading) {
    return (
      <div className="history-flags loading">
        <div className="flags-skeleton" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="history-flags error">
        <span className="flags-error">Unable to load history: {error}</span>
      </div>
    );
  }

  // Get active risk flags
  const activeRiskFlags: { key: keyof RiskFlags; label: string }[] = [];
  if (riskFlags) {
    (Object.keys(RISK_FLAG_LABELS) as (keyof RiskFlags)[]).forEach(key => {
      if (riskFlags[key]) {
        activeRiskFlags.push({ key, label: RISK_FLAG_LABELS[key] });
      }
    });
  }

  // Separate mimic conditions from risk conditions
  const mimicConditions = conditions?.filter(c => c.category === 'mimic') || [];
  const riskConditions = conditions?.filter(c => c.category === 'risk') || [];

  // Combine risk flags with risk conditions
  const allRiskItems = [
    ...activeRiskFlags.map(f => f.label),
    ...riskConditions.map(c => c.display)
  ];

  const visibleItems = allRiskItems.slice(0, MAX_VISIBLE_FLAGS);
  const hiddenCount = allRiskItems.length - MAX_VISIBLE_FLAGS;
  const hasMimics = mimicConditions.length > 0;
  const hasAnyData = allRiskItems.length > 0 || hasMimics;

  return (
    <div className="history-flags">
      <div className="flags-label">History</div>
      <div className="flags-row">
        {!hasAnyData ? (
          <span className="no-flags">No high-risk history identified in record</span>
        ) : (
          <>
            {visibleItems.map((item, i) => (
              <span key={i} className="flag-chip risk">
                {item}
              </span>
            ))}
            
            {hiddenCount > 0 && (
              <span className="flag-chip more" title={allRiskItems.slice(MAX_VISIBLE_FLAGS).join(', ')}>
                +{hiddenCount} more
              </span>
            )}

            {hasMimics && (
              <div className="mimics-dropdown">
                <button 
                  className="mimics-toggle"
                  onClick={() => setShowMimics(!showMimics)}
                >
                  Mimics ({mimicConditions.length})
                  <span className="dropdown-arrow">{showMimics ? '▲' : '▼'}</span>
                </button>
                
                {showMimics && (
                  <div className="mimics-menu">
                    <div className="mimics-header">PE Mimic Conditions</div>
                    {mimicConditions.map((c, i) => (
                      <div key={i} className="mimic-item">
                        {c.display}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

