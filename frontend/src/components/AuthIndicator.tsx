import { useState, useEffect } from 'react';

interface AuthIndicatorProps {
  isAuthenticated: boolean;
  isChecking: boolean;
  sandboxMode: boolean;
  timeRemaining: number;
  patient: string | null;
  onReauth: () => Promise<void>;
  error: string | null;
  backendAvailable: boolean;
}

interface AuthProgress {
  auth_in_progress: boolean;
  auth_started_at: string | null;
  age_seconds: number | null;
  stale: boolean;
}

/**
 * Small auth status indicator for the top-right corner.
 * Shows connection status and allows manual re-authentication.
 * Handles "auth in progress" conflicts gracefully.
 */
export default function AuthIndicator({
  isAuthenticated,
  isChecking,
  sandboxMode,
  timeRemaining,
  patient,
  onReauth,
  error,
  backendAvailable
}: AuthIndicatorProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictMessage, setConflictMessage] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [authProgress, setAuthProgress] = useState<AuthProgress | null>(null);

  const fetchAuthProgress = async () => {
    try {
      const response = await fetch('/api/auth/progress', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setAuthProgress(data);
        return data;
      }
    } catch (err) {
      console.error('Failed to fetch auth progress:', err);
    }
    return null;
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await onReauth();
    } catch (err: unknown) {
      setIsConnecting(false);
      // Check for 409 conflict
      if (err && typeof err === 'object' && 'status' in err && (err as {status: number}).status === 409) {
        // Fetch auth progress to show age
        const progress = await fetchAuthProgress();
        const ageText = progress?.age_seconds ? ` (started ${progress.age_seconds}s ago)` : '';
        setConflictMessage(`Authentication already in progress${ageText}. Complete the Epic login in your current tab, or reset and try again.`);
        setShowConflictModal(true);
      }
    }
  };

  // Refresh auth progress when modal is shown
  useEffect(() => {
    if (showConflictModal) {
      fetchAuthProgress();
      const interval = setInterval(fetchAuthProgress, 5000); // Refresh every 5s
      return () => clearInterval(interval);
    }
  }, [showConflictModal]);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const response = await fetch('/api/auth/reset', { method: 'POST', credentials: 'include' });
      if (response.ok) {
        setShowConflictModal(false);
        setIsConnecting(false);
        setConflictMessage('');
      }
    } catch (err) {
      console.error('Failed to reset auth:', err);
    } finally {
      setIsResetting(false);
    }
  };

  // Check for "another process" error in error message
  const isAnotherProcessError = error?.toLowerCase().includes('another process') || 
                                 error?.toLowerCase().includes('already logged in');

  // Show backend unavailable status
  if (!backendAvailable) {
    return (
      <div className="auth-indicator auth-offline">
        <span className="auth-dot offline"></span>
        <span className="auth-text">Backend offline</span>
        <span className="auth-hint">Use Demo Mode ↓</span>
      </div>
    );
  }

  if (isChecking) {
    return (
      <div className="auth-indicator auth-checking">
        <span className="auth-dot checking"></span>
        <span className="auth-text">Checking auth...</span>
      </div>
    );
  }

  // Conflict modal
  if (showConflictModal) {
    const ageSeconds = authProgress?.age_seconds;
    const isStale = authProgress?.stale;
    
    return (
      <>
        <div className="auth-indicator auth-conflict">
          <span className="auth-dot warning"></span>
          <span className="auth-text">Auth in progress</span>
          <button className="auth-action" onClick={() => setShowConflictModal(false)}>
            ✕
          </button>
        </div>
        <div className="auth-modal-overlay">
          <div className="auth-modal">
            <h3>⚠️ Authentication In Progress</h3>
            <p>{conflictMessage}</p>
            
            {ageSeconds !== null && ageSeconds !== undefined && (
              <div className="auth-modal-status">
                <span className={`auth-age ${isStale ? 'stale' : ''}`}>
                  Age: {ageSeconds}s {isStale && '(stale)'}
                </span>
              </div>
            )}

            <div className="auth-modal-hint">
              <strong>Continue auth:</strong> Look for an Epic login tab in your browser and complete the login there.
            </div>
            
            <div className="auth-modal-actions">
              <button 
                className="auth-modal-btn secondary" 
                onClick={() => setShowConflictModal(false)}
                title="Close this modal and complete Epic login in another tab"
              >
                Continue in Other Tab
              </button>
              <button 
                className="auth-modal-btn primary" 
                onClick={handleReset}
                disabled={isResetting}
                title="Clear the stuck auth state and start fresh"
              >
                {isResetting ? 'Resetting...' : 'Reset Auth'}
              </button>
            </div>
            
            {isStale && (
              <p className="auth-modal-stale-hint">
                ⏱️ Auth has been pending for over 3 minutes. It's probably stuck. Click "Reset Auth" to start fresh.
              </p>
            )}
          </div>
        </div>
      </>
    );
  }

  // Connecting state
  if (isConnecting) {
    return (
      <div className="auth-indicator auth-connecting">
        <span className="auth-dot connecting"></span>
        <span className="auth-text">Redirecting to Epic...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auth-indicator auth-error">
        <span className="auth-dot error"></span>
        <span className="auth-text" title={error}>Auth Error</span>
        {isAnotherProcessError && (
          <span className="auth-hint">Use Incognito or sign out of Epic</span>
        )}
        <button className="auth-action" onClick={handleReset}>
          Reset
        </button>
        <button className="auth-action" onClick={handleConnect}>
          Retry
        </button>
      </div>
    );
  }

  if (isAuthenticated) {
    const minutes = Math.floor(timeRemaining / 60);
    const timeText = minutes > 0 ? `${minutes}m left` : 'expiring soon';
    
    return (
      <div className="auth-indicator auth-connected">
        <span className="auth-dot connected"></span>
        <span className="auth-text">
          {sandboxMode ? 'Epic Sandbox' : 'Connected'}
          {patient && <span className="auth-patient"> • {patient.slice(0, 8)}...</span>}
        </span>
        <span className="auth-time">{timeText}</span>
        <button className="auth-action" onClick={handleConnect} title="Re-authenticate">
          ↻
        </button>
      </div>
    );
  }

  return (
    <div className="auth-indicator auth-disconnected">
      <span className="auth-dot disconnected"></span>
      <span className="auth-text">Not connected</span>
      <button className="auth-action" onClick={handleConnect} disabled={isConnecting}>
        Connect
      </button>
    </div>
  );
}
