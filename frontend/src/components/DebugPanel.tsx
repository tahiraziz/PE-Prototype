import { useState } from 'react';

interface ScopeError {
  failed_url: string;
  message: string;
  response_body?: string;
}

interface DebugInfo {
  patient_id: string;
  data_source: string;
  fhir_calls: string[];
  vitals_count: number;
  labs_count: number;
  missing_critical: string[];
  missing_optional: string[];
  warnings: string[];
  requested_scope?: string;
  granted_scope?: string;
  scope_error?: ScopeError;
}

interface DebugPanelProps {
  debug: DebugInfo | null;
  featureSummary: Record<string, unknown> | null;
}

/**
 * Collapsible debug panel for sandbox testing visibility
 */
export default function DebugPanel({ debug, featureSummary }: DebugPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleResetAuth = async () => {
    setIsResetting(true);
    setResetMessage(null);
    try {
      const response = await fetch('/api/auth/reset', { method: 'POST', credentials: 'include' });
      if (response.ok) {
        setResetMessage('Reset complete. Please re-authenticate.');
      } else {
        setResetMessage('Reset failed. Try again.');
      }
    } catch (err) {
      setResetMessage('Reset failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsResetting(false);
    }
  };

  if (!debug) return null;

  const hasCriticalMissing = debug.missing_critical.length > 0;
  const hasWarnings = debug.warnings.length > 0;
  const hasScopeError = !!debug.scope_error;

  return (
    <div className={`debug-panel ${hasCriticalMissing ? 'has-warnings' : ''}`}>
      <button
        className="debug-toggle"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="debug-icon">🔧</span>
        <span className="debug-title">Debug Info</span>
        {hasScopeError && <span className="debug-badge error">Scope Error</span>}
        {hasCriticalMissing && <span className="debug-badge warning">Missing data</span>}
        {hasWarnings && <span className="debug-badge alert">{debug.warnings.length} warnings</span>}
        <span className="debug-chevron">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="debug-content">
          {/* Patient & Data Source */}
          <div className="debug-section">
            <div className="debug-row">
              <span className="debug-label">Patient ID:</span>
              <code className="debug-value">{debug.patient_id}</code>
            </div>
            <div className="debug-row">
              <span className="debug-label">Data Source:</span>
              <span className="debug-value">{debug.data_source}</span>
            </div>
            <div className="debug-row">
              <span className="debug-label">Vitals Retrieved:</span>
              <span className="debug-value">{debug.vitals_count}</span>
            </div>
            <div className="debug-row">
              <span className="debug-label">Labs Retrieved:</span>
              <span className="debug-value">{debug.labs_count}</span>
            </div>
          </div>

          {/* Scope Info (if available) */}
          {(debug.requested_scope || debug.granted_scope) && (
            <div className="debug-section">
              <div className="debug-section-title">OAuth Scopes</div>
              <div className="debug-row">
                <span className="debug-label">Requested:</span>
                <code className="debug-value scope">{debug.requested_scope || '(unknown)'}</code>
              </div>
              <div className="debug-row">
                <span className="debug-label">Granted:</span>
                <code className={`debug-value scope ${debug.granted_scope?.includes('Observation.read') ? '' : 'missing-scope'}`}>
                  {debug.granted_scope || '(unknown)'}
                </code>
              </div>
            </div>
          )}

          {/* Scope Error */}
          {hasScopeError && debug.scope_error && (
            <div className="debug-section section-error">
              <div className="debug-section-title">🚨 403 Scope Error</div>
              <div className="debug-row">
                <span className="debug-label">Message:</span>
                <span className="debug-value error-text">{debug.scope_error.message}</span>
              </div>
              <div className="debug-row">
                <span className="debug-label">Failed URL:</span>
                <code className="debug-value url">{debug.scope_error.failed_url}</code>
              </div>
              {debug.scope_error.response_body && (
                <div className="debug-row">
                  <span className="debug-label">Response:</span>
                  <pre className="debug-response">{debug.scope_error.response_body}</pre>
                </div>
              )}
              <p className="debug-hint">
                Check <a href="/api/auth/last-token" target="_blank">/api/auth/last-token</a> for granted scopes.
              </p>
            </div>
          )}

          {/* FHIR Calls */}
          {debug.fhir_calls.length > 0 && (
            <div className="debug-section">
              <div className="debug-section-title">FHIR Calls Made</div>
              <ul className="debug-list">
                {debug.fhir_calls.map((call, i) => (
                  <li key={i} className={call.includes('403') ? 'error' : ''}>
                    <code>{call}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing Critical Fields */}
          {hasCriticalMissing && (
            <div className="debug-section section-warning">
              <div className="debug-section-title">⚠ Missing Critical Fields</div>
              <ul className="debug-list">
                {debug.missing_critical.map((field, i) => (
                  <li key={i}>{field}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing Optional Fields */}
          {debug.missing_optional.length > 0 && (
            <div className="debug-section">
              <div className="debug-section-title">Missing Optional Fields</div>
              <ul className="debug-list muted">
                {debug.missing_optional.map((field, i) => (
                  <li key={i}>{field}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {hasWarnings && (
            <div className="debug-section section-alert">
              <div className="debug-section-title">Mapping Warnings</div>
              <ul className="debug-list">
                {debug.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Feature Summary Toggle */}
          {featureSummary && (
            <div className="debug-section">
              <button
                className="feature-toggle"
                onClick={() => setShowFeatures(!showFeatures)}
              >
                {showFeatures ? '▲ Hide' : '▼ Show'} Extracted Features
              </button>
              
              {showFeatures && (
                <pre className="feature-json">
                  {JSON.stringify(featureSummary, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Auth Actions */}
          <div className="debug-section debug-actions">
            <div className="debug-section-title">Auth Actions</div>
            <div className="debug-button-row">
              <button
                className="debug-btn reset-btn"
                onClick={handleResetAuth}
                disabled={isResetting}
              >
                {isResetting ? '⏳ Resetting...' : '🔄 Reset Authentication'}
              </button>
              <a
                href="http://localhost:8000/api/auth/last-token"
                target="_blank"
                rel="noopener noreferrer"
                className="debug-btn view-btn"
              >
                📄 View Last Token JSON
              </a>
            </div>
            {resetMessage && (
              <div className={`debug-reset-message ${resetMessage.includes('complete') ? 'success' : 'error'}`}>
                {resetMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

