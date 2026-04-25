import { useState, useEffect } from 'react';

interface AuthDiagnostics {
  epic_env: string;
  client_id: string;
  client_id_source: string;
  redirect_uri: string;
  authorize_url_base: string;
  token_url_base: string;
  fhir_base_url: string;
  aud: string;
  scope: string;
  response_type: string;
  computed_authorize_url: string;
  is_sandbox: boolean;
  url_warnings: string[];
  authorize_params: {
    response_type: string;
    client_id: string;
    redirect_uri: string;
    scope: string;
    state: string;
    aud: string;
  };
}

interface TokenDebugInfo {
  hasSession: boolean;
  error?: string;
  tokenPreview?: string;
  grantedScope?: string;
  scopeAnalysis?: {
    has_patient_read: boolean;
    has_observation_read: boolean;
    scope_parts: string[];
  };
  patientContext?: string;
  encounterContext?: string;
  fhirUser?: string;
  jwtClaims?: Record<string, unknown>;
  fhirBase?: string;
  expiresAt?: string;
}

interface AuthDebugPanelProps {
  visible?: boolean;
  sessionId?: string | null;
}

/**
 * Auth Debug Panel - shows OAuth diagnostic info for debugging Epic auth issues.
 * Only visible in sandbox/dev mode.
 */
export default function AuthDebugPanel({ visible = true, sessionId }: AuthDebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [diagnostics, setDiagnostics] = useState<AuthDiagnostics | null>(null);
  const [tokenDebug, setTokenDebug] = useState<TokenDebugInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnostics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/diagnostics', { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setDiagnostics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch diagnostics');
    } finally {
      setLoading(false);
    }
  };

  const fetchTokenDebug = async () => {
    if (!sessionId) return;
    try {
      // Session is now read from cookie automatically (keep session_id for backward compat)
      const url = sessionId ? `/api/auth/token-debug?session_id=${sessionId}` : '/api/auth/token-debug';
      const response = await fetch(url, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setTokenDebug(data);
      }
    } catch (err) {
      console.error('Failed to fetch token debug:', err);
    }
  };

  useEffect(() => {
    if (isExpanded && !diagnostics && !loading) {
      fetchDiagnostics();
    }
    if (isExpanded && sessionId && !tokenDebug) {
      fetchTokenDebug();
    }
  }, [isExpanded, diagnostics, loading, sessionId, tokenDebug]);

  if (!visible) return null;

  return (
    <div className="auth-debug-panel">
      <button 
        className="auth-debug-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        🔧 Auth Debug {isExpanded ? '▼' : '▶'}
      </button>

      {isExpanded && (
        <div className="auth-debug-content">
          {loading && <p className="auth-debug-loading">Loading diagnostics...</p>}
          
          {error && (
            <div className="auth-debug-error">
              <p>Error: {error}</p>
              <button onClick={fetchDiagnostics}>Retry</button>
            </div>
          )}

          {diagnostics && (
            <div className="auth-debug-info">
              <h4>OAuth Configuration (verify against Epic App Registration)</h4>
              
              <div className="auth-debug-grid">
                <div className="auth-debug-row">
                  <span className="auth-debug-label">EPIC_ENV:</span>
                  <span className="auth-debug-value highlight">{diagnostics.epic_env}</span>
                </div>
                
                <div className="auth-debug-row">
                  <span className="auth-debug-label">Client ID:</span>
                  <code className="auth-debug-value client-id">{diagnostics.client_id}</code>
                </div>
                
                <div className="auth-debug-row">
                  <span className="auth-debug-label">Source:</span>
                  <span className="auth-debug-value muted">{diagnostics.client_id_source}</span>
                </div>
                
                <div className="auth-debug-row">
                  <span className="auth-debug-label">Redirect URI:</span>
                  <code className="auth-debug-value">{diagnostics.redirect_uri}</code>
                </div>
                
                <div className="auth-debug-row">
                  <span className="auth-debug-label">FHIR Base (aud):</span>
                  <code className="auth-debug-value">{diagnostics.fhir_base_url}</code>
                </div>
                
                <div className="auth-debug-row">
                  <span className="auth-debug-label">Scope:</span>
                  <code className="auth-debug-value scope">{diagnostics.scope}</code>
                </div>
                
                <div className="auth-debug-row">
                  <span className="auth-debug-label">Authorize URL:</span>
                  <code className="auth-debug-value">{diagnostics.authorize_url_base}</code>
                </div>
                
                <div className="auth-debug-row">
                  <span className="auth-debug-label">Token URL:</span>
                  <code className="auth-debug-value">{diagnostics.token_url_base}</code>
                </div>
              </div>

              {/* URL Warnings */}
              {diagnostics.url_warnings && diagnostics.url_warnings.length > 0 && (
                <div className="auth-debug-warnings">
                  <h5>⚠️ Configuration Warnings:</h5>
                  <ul>
                    {diagnostics.url_warnings.map((warning, i) => (
                      <li key={i} className={warning.startsWith('ERROR') ? 'error' : 'warning'}>
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="auth-debug-full-url">
                <h5>Full Authorize URL (state=&lt;state&gt;):</h5>
                <textarea 
                  readOnly 
                  value={diagnostics.computed_authorize_url}
                  rows={4}
                />
                <button 
                  onClick={() => navigator.clipboard.writeText(diagnostics.computed_authorize_url)}
                  className="copy-btn"
                >
                  Copy URL
                </button>
              </div>

              <div className="auth-debug-checklist">
                <h5>✅ Verify in Epic App Orchard:</h5>
                <ul>
                  <li>Client ID matches: <code>{diagnostics.client_id}</code></li>
                  <li>Redirect URI matches exactly: <code>{diagnostics.redirect_uri}</code></li>
                  <li>Application Audience is "Patients" (not Clinicians)</li>
                  <li>Scopes are enabled: patient/Patient.read, patient/Observation.read, openid, fhirUser</li>
                </ul>
              </div>

              <button onClick={fetchDiagnostics} className="refresh-btn">
                ↻ Refresh
              </button>
            </div>
          )}

          {/* Token Debug Section - shows what Epic actually granted */}
          {tokenDebug && tokenDebug.hasSession && (
            <div className="token-debug-section">
              <h4>🎫 Token Response (what Epic granted)</h4>
              
              <div className="auth-debug-grid">
                <div className="auth-debug-row">
                  <span className="auth-debug-label">Granted Scope:</span>
                  <code className={`auth-debug-value scope ${tokenDebug.scopeAnalysis?.has_patient_read && tokenDebug.scopeAnalysis?.has_observation_read ? 'success' : 'warning'}`}>
                    {tokenDebug.grantedScope || '(empty or not in response)'}
                  </code>
                </div>

                {tokenDebug.scopeAnalysis && (
                  <div className="auth-debug-row scope-analysis">
                    <span className="auth-debug-label">Scope Check:</span>
                    <span className="auth-debug-value">
                      {tokenDebug.scopeAnalysis.has_patient_read ? '✅' : '❌'} Patient.read 
                      {' | '}
                      {tokenDebug.scopeAnalysis.has_observation_read ? '✅' : '❌'} Observation.read
                    </span>
                  </div>
                )}

                <div className="auth-debug-row">
                  <span className="auth-debug-label">Patient Context:</span>
                  <span className="auth-debug-value">{tokenDebug.patientContext || '(none)'}</span>
                </div>

                <div className="auth-debug-row">
                  <span className="auth-debug-label">Encounter Context:</span>
                  <span className="auth-debug-value">{tokenDebug.encounterContext || '(none)'}</span>
                </div>

                <div className="auth-debug-row">
                  <span className="auth-debug-label">fhirUser:</span>
                  <code className="auth-debug-value">{tokenDebug.fhirUser || '(none)'}</code>
                </div>

                <div className="auth-debug-row">
                  <span className="auth-debug-label">FHIR Base:</span>
                  <code className="auth-debug-value">{tokenDebug.fhirBase || '(none)'}</code>
                </div>

                <div className="auth-debug-row">
                  <span className="auth-debug-label">Expires At:</span>
                  <span className="auth-debug-value">{tokenDebug.expiresAt || '(unknown)'}</span>
                </div>
              </div>

              {/* JWT Claims if available */}
              {tokenDebug.jwtClaims && Object.keys(tokenDebug.jwtClaims).length > 0 && (
                <div className="jwt-claims">
                  <h5>JWT Claims (decoded):</h5>
                  <pre>{JSON.stringify(tokenDebug.jwtClaims, null, 2)}</pre>
                </div>
              )}

              {/* Scope parts breakdown */}
              {tokenDebug.scopeAnalysis?.scope_parts && tokenDebug.scopeAnalysis.scope_parts.length > 0 && (
                <div className="scope-parts">
                  <h5>Scope Parts:</h5>
                  <ul>
                    {tokenDebug.scopeAnalysis.scope_parts.map((part, i) => (
                      <li key={i}>
                        {part.includes('Patient.read') || part.includes('Observation.read') 
                          ? <strong>✅ {part}</strong> 
                          : part}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button onClick={fetchTokenDebug} className="refresh-btn">
                ↻ Refresh Token Info
              </button>
            </div>
          )}

          {/* No session message */}
          {sessionId && tokenDebug && !tokenDebug.hasSession && (
            <div className="token-debug-section no-session">
              <p>⚠️ Session not found or expired. Authenticate to see token details.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

