import { useState } from 'react';
import type { AssessmentResult } from '../types/assessment';
import { formatProbability, getFieldDisplayName } from '../utils/dataTransform';

interface DetailsPanelProps {
  result: AssessmentResult | null;
}

/**
 * Consolidated details panel - all transparency info in one collapsible section
 * Hidden by default to reduce cognitive load
 */
export default function DetailsPanel({ result }: DetailsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAllInputs, setShowAllInputs] = useState(false);
  
  if (!result) return null;
  
  const isRuleOut = result.decision === 'rule_out';
  
  // Get missing critical fields
  const criticalMissing = result.missingFields.filter(f => f.isCritical);
  
  // Get key model inputs (not all)
  const keyInputs = Object.entries(result.featureSummary).slice(0, showAllInputs ? undefined : 10);
  
  return (
    <div className="details-panel">
      <button 
        className="details-toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="toggle-text">{expanded ? '▲ Hide details' : '▼ Why this result?'}</span>
      </button>
      
      {expanded && (
        <div className="details-content">
          {/* Model Reasoning */}
          <section className="details-section">
            <h4>Model Reasoning</h4>
            <p className="reasoning-text">{result.explanation}</p>
            <div className="reasoning-numbers">
              Probability <strong>{formatProbability(result.probability)}</strong> is {' '}
              {isRuleOut ? 'below' : 'above'} the <strong>{formatProbability(result.threshold)}</strong> rule-out threshold.
            </div>
          </section>
          
          {/* Key Contributors */}
          {result.keyContributors.length > 0 && (
            <section className="details-section">
              <h4>Key Factors</h4>
              <ul className="factors-list">
                {result.keyContributors.map((c, i) => (
                  <li key={i} className={`factor factor-${c.direction}`}>
                    <span className="factor-arrow">
                      {c.direction === 'increases' ? '↑' : c.direction === 'decreases' ? '↓' : '•'}
                    </span>
                    <span>{c.factor}: {c.description}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          
          {/* Data Completeness */}
          {criticalMissing.length > 0 && (
            <section className="details-section section-warning">
              <h4>⚠ Missing Data</h4>
              <p>Critical fields missing: {criticalMissing.map(f => f.displayName).join(', ')}</p>
              <p className="warning-text">Model used imputed values. Reliability may be reduced.</p>
            </section>
          )}
          
          {/* Assumptions */}
          <section className="details-section">
            <h4>Assumptions & Limitations</h4>
            <ul className="assumptions-list">
              <li>This is a <strong>rule-out</strong> tool, not a diagnostic test.</li>
              <li>Low probability does not exclude PE in high-risk scenarios.</li>
              <li>Results depend on data accuracy and timing.</li>
              <li>Clinical judgment must guide final decisions.</li>
            </ul>
          </section>
          
          {/* Model Inputs (collapsed by default) */}
          <section className="details-section">
            <button 
              className="inputs-toggle"
              onClick={() => setShowAllInputs(!showAllInputs)}
            >
              {showAllInputs ? '▲ Hide model inputs' : '▼ Show model inputs'}
            </button>
            
            {showAllInputs && (
              <table className="inputs-table">
                <thead>
                  <tr><th>Feature</th><th>Value</th></tr>
                </thead>
                <tbody>
                  {keyInputs.map(([key, value]) => (
                    <tr key={key}>
                      <td>{getFieldDisplayName(key)}</td>
                      <td>
                        {value == null ? <span className="val-missing">—</span> : 
                         typeof value === 'boolean' ? (value ? 'Yes' : 'No') :
                         typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(2)) :
                         String(value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
          
          {/* Actions */}
          <section className="details-section details-actions">
            <button 
              className="action-btn"
              onClick={() => {
                const text = `PE Rule-Out Assessment\n${result.decision === 'rule_out' ? 'RULE OUT' : 'CONTINUE WORKUP'}\nProbability: ${formatProbability(result.probability)}\n${result.explanation}`;
                navigator.clipboard.writeText(text);
              }}
            >
              📋 Copy summary
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

