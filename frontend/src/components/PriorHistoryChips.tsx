import { useState } from 'react';

interface HistoryFlags {
  prior_pe: boolean;
  prior_dvt_vte: boolean;
  active_cancer: boolean;
  recent_surgery: boolean;
  immobilization: boolean;
  thrombophilia: boolean;
  pregnancy_estrogen: boolean;
  other?: string[];
}

interface PriorHistoryChipsProps {
  historyFlags: HistoryFlags | null;
  historyChecked: string[];
  isMissing?: boolean;
}

const FLAG_LABELS: Record<keyof Omit<HistoryFlags, 'other'>, string> = {
  prior_pe: 'Prior PE',
  prior_dvt_vte: 'Prior DVT/VTE',
  active_cancer: 'Active cancer',
  recent_surgery: 'Recent surgery',
  immobilization: 'Immobilization',
  thrombophilia: 'Thrombophilia',
  pregnancy_estrogen: 'Pregnancy/estrogen'
};

/**
 * PriorHistoryChips - Shows prior history risk factors as professional chips
 * No emojis, compact styling
 * Shows which factors were checked even if none found
 */
export default function PriorHistoryChips({
  historyFlags,
  historyChecked,
  isMissing
}: PriorHistoryChipsProps) {
  const [showChecked, setShowChecked] = useState(false);

  // Get active (positive) flags
  const activeFlags: string[] = [];
  
  if (historyFlags) {
    (Object.keys(FLAG_LABELS) as (keyof typeof FLAG_LABELS)[]).forEach(key => {
      if (historyFlags[key] === true) {
        activeFlags.push(FLAG_LABELS[key]);
      }
    });
    
    // Add any "other" items
    if (historyFlags.other && historyFlags.other.length > 0) {
      activeFlags.push(...historyFlags.other);
    }
  }

  const hasPositive = activeFlags.length > 0;

  return (
    <div className="prior-history-section">
      <div className="section-header">
        <span className="section-label">Prior History / Risk Factors</span>
        {isMissing && <span className="missing-badge">Data limited</span>}
      </div>
      
      <div className="history-chips-row">
        {hasPositive ? (
          // Show positive risk factors as chips
          <>
            {activeFlags.slice(0, 4).map((flag, i) => (
              <span key={i} className="history-chip positive">
                {flag}
              </span>
            ))}
            {activeFlags.length > 4 && (
              <span className="history-chip more" title={activeFlags.slice(4).join(', ')}>
                +{activeFlags.length - 4} more
              </span>
            )}
          </>
        ) : (
          // No positive findings
          <span className="no-history-text">
            No high-risk history identified
          </span>
        )}
        
        {/* Show what was checked (second layer hint) */}
        <button 
          className="checked-toggle"
          onClick={() => setShowChecked(!showChecked)}
          aria-expanded={showChecked}
        >
          {showChecked ? 'Hide checked' : 'Show checked'}
        </button>
      </div>
      
      {/* Expanded: show what factors were evaluated */}
      {showChecked && (
        <div className="history-checked-list">
          <span className="checked-label">Factors evaluated:</span>
          <div className="checked-items">
            {historyChecked.map((item, i) => {
              const isPositive = activeFlags.includes(item);
              return (
                <span 
                  key={i} 
                  className={`checked-item ${isPositive ? 'found' : 'not-found'}`}
                >
                  {isPositive ? '●' : '○'} {item}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

