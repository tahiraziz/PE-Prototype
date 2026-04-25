import { useState, useEffect, useCallback, useRef } from 'react';

interface AuthStatus {
  authenticated: boolean;
  expiresAt: string | null;
  patient: string | null;
  fhirBase: string | null;
  sandboxMode: boolean;
  timeRemaining: number;
  reason?: string;
}

interface UseAutoAuthResult {
  isAuthenticated: boolean;
  isChecking: boolean;
  authError: string | null;
  sessionId: string | null;
  patient: string | null;
  sandboxMode: boolean;
  timeRemaining: number;
  backendAvailable: boolean;
  isDemoFallback: boolean;
  connectionTimedOut: boolean;
  triggerReauth: () => Promise<void>;
  forceDemoMode: () => void;
}

// Connection timeout: 2 seconds (fast failover to demo mode)
const CONNECTION_TIMEOUT_MS = 2000;

// Loop prevention: track auth attempts
const AUTH_ATTEMPT_KEY = 'smartAuthAttemptedAt';
const AUTH_LOOP_COOLDOWN_MS = 30000; // 30 seconds

/**
 * Hook for auto-launching SMART authentication in sandbox mode.
 * 
 * Only auto-launches if:
 * 1. VITE_SANDBOX_MODE is enabled OR backend returns sandboxMode=true
 * 2. No valid session exists
 * 3. Not currently in OAuth callback flow
 * 4. Not within loop cooldown period
 * 5. Backend is available
 */
export function useAutoAuth(): UseAutoAuthResult {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [patient, setPatient] = useState<string | null>(null);
  const [sandboxMode, setSandboxMode] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [isDemoFallback, setIsDemoFallback] = useState(false);
  const [connectionTimedOut, setConnectionTimedOut] = useState(false);
  
  // Track if we've already attempted connection
  const connectionAttempted = useRef(false);

  // Check if we're in the middle of OAuth callback
  const isInOAuthFlow = useCallback(() => {
    const url = window.location.href;
    const params = new URLSearchParams(window.location.search);
    
    // Check for OAuth callback indicators
    if (url.includes('/callback') || params.has('code') || params.has('error')) {
      return true;
    }
    
    // Check for successful auth redirect (session in URL)
    if (params.has('session')) {
      return true;
    }
    
    return false;
  }, []);

  // Check loop prevention
  const isInLoopCooldown = useCallback(() => {
    const lastAttempt = localStorage.getItem(AUTH_ATTEMPT_KEY);
    if (!lastAttempt) return false;
    
    const elapsed = Date.now() - parseInt(lastAttempt, 10);
    return elapsed < AUTH_LOOP_COOLDOWN_MS;
  }, []);

  // Record auth attempt
  const recordAuthAttempt = useCallback(() => {
    localStorage.setItem(AUTH_ATTEMPT_KEY, Date.now().toString());
  }, []);

  // Clear auth attempt (after successful auth)
  const clearAuthAttempt = useCallback(() => {
    localStorage.removeItem(AUTH_ATTEMPT_KEY);
  }, []);

  // Force demo mode (user-initiated or timeout fallback)
  const forceDemoMode = useCallback(() => {
    console.log('[AutoAuth] Forcing demo fallback mode');
    setIsDemoFallback(true);
    setIsAuthenticated(false);
    setIsChecking(false);
    setBackendAvailable(false);
    setAuthError(null);
  }, []);

  // Trigger re-authentication manually
  // Go directly to backend (not through Vite proxy) for proper redirect handling
  // Returns Promise to allow caller to handle 409 conflicts
  const triggerReauth = useCallback(async () => {
    // Clear demo fallback state when attempting reauth
    setIsDemoFallback(false);
    setConnectionTimedOut(false);
    recordAuthAttempt();
    
    // First, check if auth is already in progress by making a HEAD request
    // We do this via fetch to check for 409 before redirecting
    try {
      const response = await fetch('http://localhost:8000/launch', {
        method: 'GET',
        redirect: 'manual', // Don't follow redirects, we want to handle them
        credentials: 'include' // Include cookies
      });
      
      // If we get 409, auth is already in progress
      if (response.status === 409) {
        const error = new Error('Authentication already in progress');
        (error as Error & { status: number }).status = 409;
        throw error;
      }
      
      // For redirect responses (302/307), extract Location and redirect
      if (response.type === 'opaqueredirect' || response.status === 302 || response.status === 307) {
        // Can't read Location header due to CORS, fall back to direct navigation
        window.location.href = 'http://localhost:8000/launch';
        return;
      }
      
      // For other cases, just redirect directly
      window.location.href = 'http://localhost:8000/launch';
    } catch (err) {
      // Re-throw 409 errors for caller to handle
      if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 409) {
        throw err;
      }
      // For network errors, try direct redirect anyway
      console.warn('[AutoAuth] Pre-check failed, attempting direct redirect:', err);
      window.location.href = 'http://localhost:8000/launch';
    }
  }, [recordAuthAttempt]);

  // Extract session from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSessionId = params.get('session');
    const urlPatient = params.get('patient');
    
    if (urlSessionId) {
      setSessionId(urlSessionId);
      setPatient(urlPatient);
      setIsAuthenticated(true);
      clearAuthAttempt(); // Successful auth, clear cooldown
      
      // Store in localStorage for persistence
      localStorage.setItem('pe_session_id', urlSessionId);
      
      // Clean up URL
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
      
      setIsChecking(false);
    }
  }, [clearAuthAttempt]);

  // Check auth status with timeout
  useEffect(() => {
    // Skip if we already have a session from URL
    if (sessionId) {
      return;
    }
    
    // Skip if already in demo fallback
    if (isDemoFallback) {
      setIsChecking(false);
      return;
    }

    const checkAuth = async () => {
      // Don't check if in OAuth flow
      if (isInOAuthFlow()) {
        setIsChecking(false);
        return;
      }

      // Check frontend env flag first
      const frontendSandboxMode = import.meta.env.VITE_SANDBOX_MODE === 'true';
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn(`[AutoAuth] Connection timeout (${CONNECTION_TIMEOUT_MS}ms) - switching to demo fallback`);
        controller.abort();
        setConnectionTimedOut(true);
        setIsDemoFallback(true);
        setBackendAvailable(false);
        setIsChecking(false);
        setAuthError('Connection timed out. Using demo mode. Click "Connect" to retry.');
      }, CONNECTION_TIMEOUT_MS);

      try {
        // Check for stored session
        const storedSessionId = localStorage.getItem('pe_session_id');
        
        // Session is now read from cookie primarily, with query param as backup
        const response = await fetch(
          `/api/auth/status${storedSessionId ? `?session_id=${storedSessionId}` : ''}`,
          { 
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            credentials: 'include',  // Include cookies for session
            signal: controller.signal
          }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          // Backend returned error but is reachable
          console.warn('[AutoAuth] Auth status returned error:', response.status);
          setBackendAvailable(true);
          setSandboxMode(frontendSandboxMode);
          setIsChecking(false);
          return;
        }
        
        const status: AuthStatus = await response.json();
        
        setBackendAvailable(true);
        setSandboxMode(status.sandboxMode || frontendSandboxMode);
        setTimeRemaining(status.timeRemaining);
        setIsDemoFallback(false);
        setConnectionTimedOut(false);
        
        if (status.authenticated) {
          setIsAuthenticated(true);
          setPatient(status.patient);
          setSessionId(storedSessionId);
          clearAuthAttempt();
        } else {
          setIsAuthenticated(false);
          localStorage.removeItem('pe_session_id');
          
          // Auto-launch only in sandbox mode AND if backend says so
          const shouldAutoLaunch = status.sandboxMode || frontendSandboxMode;
          
          if (shouldAutoLaunch && !isInLoopCooldown()) {
            console.log('[AutoAuth] No valid session, auto-launching SMART auth...');
            recordAuthAttempt();
            // Standalone launch - no iss param needed, backend uses configured FHIR_BASE_URL
            window.location.href = 'http://localhost:8000/launch';
            return;
          } else if (shouldAutoLaunch && isInLoopCooldown()) {
            const remaining = Math.ceil((AUTH_LOOP_COOLDOWN_MS - (Date.now() - parseInt(localStorage.getItem(AUTH_ATTEMPT_KEY) || '0', 10))) / 1000);
            setAuthError(
              `Auth loop detected. Retry in ${remaining}s or click 'Connect' manually. ` +
              `If this persists, check Epic credentials.`
            );
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
        
        // Check if this was an abort (timeout)
        if (err instanceof Error && err.name === 'AbortError') {
          // Already handled in timeout callback
          return;
        }
        
        // Backend is not reachable - automatically fall back to demo mode
        console.warn('[AutoAuth] Backend not reachable, switching to demo fallback:', err);
        setBackendAvailable(false);
        setIsDemoFallback(true);
        setSandboxMode(frontendSandboxMode);
        setAuthError('Backend not available. Using demo mode with sample patient data.');
      } finally {
        setIsChecking(false);
      }
    };

    // Small delay to avoid flash on page load
    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, [sessionId, isDemoFallback, isInOAuthFlow, isInLoopCooldown, recordAuthAttempt, clearAuthAttempt]);

  return {
    isAuthenticated,
    isChecking,
    authError,
    sessionId,
    patient,
    sandboxMode,
    timeRemaining,
    backendAvailable,
    isDemoFallback,
    connectionTimedOut,
    triggerReauth,
    forceDemoMode
  };
}
