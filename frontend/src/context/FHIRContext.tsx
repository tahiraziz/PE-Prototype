/**
 * FHIR Context for Luminur PE Decision Support
 * 
 * Provides centralized access to:
 * - FHIR client instance (fhirclient)
 * - Patient context from EHR Launch
 * - Encounter context
 * - Access token management
 * - Clinical data fetching utilities
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';

// ===========================================================================
// Types
// ===========================================================================

export interface FHIRPatient {
  id: string;
  name?: string;
  birthDate?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other' | 'unknown';
}

export interface FHIREncounter {
  id: string;
  status?: string;
  class?: string;
  period?: {
    start?: string;
    end?: string;
  };
}

export interface FHIRContextValue {
  // Authentication state
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Token/Session
  accessToken: string | null;
  fhirBaseUrl: string | null;
  sessionId: string | null;
  expiresAt: Date | null;
  timeRemaining: number;
  
  // Patient/Encounter context
  patient: FHIRPatient | null;
  patientId: string | null;
  encounter: FHIREncounter | null;
  encounterId: string | null;
  
  // Launch mode
  launchMode: 'ehr' | 'standalone' | 'demo' | null;
  sandboxMode: boolean;
  
  // Actions
  initializeFromLaunch: (launchParams: LaunchParams) => Promise<void>;
  setPatientId: (id: string) => void;
  refreshToken: () => Promise<void>;
  triggerReauth: () => Promise<void>;
  clearSession: () => void;
}

export interface LaunchParams {
  iss?: string;
  launch?: string;
  code?: string;
  state?: string;
}

// ===========================================================================
// Context Creation
// ===========================================================================

const FHIRContext = createContext<FHIRContextValue | null>(null);

// ===========================================================================
// Provider Component
// ===========================================================================

interface FHIRProviderProps {
  children: ReactNode;
}

export function FHIRProvider({ children }: FHIRProviderProps) {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Token/Session state
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [fhirBaseUrl, setFhirBaseUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  
  // Patient/Encounter context
  const [patient, setPatient] = useState<FHIRPatient | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [encounter, setEncounter] = useState<FHIREncounter | null>(null);
  const [encounterId, setEncounterId] = useState<string | null>(null);
  
  // Launch mode
  const [launchMode, setLaunchMode] = useState<'ehr' | 'standalone' | 'demo' | null>(null);
  const [sandboxMode, setSandboxMode] = useState(false);

  // Calculate time remaining
  const timeRemaining = useMemo(() => {
    if (!expiresAt) return 0;
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.floor(diff / 1000));
  }, [expiresAt]);

  /**
   * Check for EHR Launch parameters in URL
   */
  const detectLaunchMode = useCallback((): LaunchParams => {
    const params = new URLSearchParams(window.location.search);
    return {
      iss: params.get('iss') || undefined,
      launch: params.get('launch') || undefined,
      code: params.get('code') || undefined,
      state: params.get('state') || undefined,
    };
  }, []);

  /**
   * Initialize from EHR Launch (OAuth flow)
   */
  const initializeFromLaunch = useCallback(async (launchParams: LaunchParams) => {
    setIsLoading(true);
    setError(null);

    try {
      if (launchParams.iss && launchParams.launch) {
        // EHR Launch - redirect to backend /launch with params
        setLaunchMode('ehr');
        const redirectUrl = new URL('http://localhost:8000/launch');
        redirectUrl.searchParams.set('iss', launchParams.iss);
        redirectUrl.searchParams.set('launch', launchParams.launch);
        window.location.href = redirectUrl.toString();
        return;
      }

      if (launchParams.code && launchParams.state) {
        // OAuth callback - code exchange happens on backend
        // Session should be in URL after redirect from backend
        const params = new URLSearchParams(window.location.search);
        const session = params.get('session');
        const patientParam = params.get('patient');

        if (session) {
          setSessionId(session);
          if (patientParam) {
            setPatientId(patientParam);
          }
          
          // Fetch session details from backend
          await fetchSessionDetails(session);
          
          // Clean up URL
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
        }
      }
    } catch (err) {
      console.error('[FHIRContext] Launch initialization failed:', err);
      setError(err instanceof Error ? err.message : 'Launch initialization failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch session details from backend
   */
  const fetchSessionDetails = useCallback(async (session: string) => {
    try {
      const response = await fetch(`/api/auth/status?session_id=${session}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Session validation failed');
      }

      const data = await response.json();
      
      setIsAuthenticated(data.authenticated);
      setFhirBaseUrl(data.fhirBase);
      setSandboxMode(data.sandboxMode);
      
      if (data.expiresAt) {
        setExpiresAt(new Date(data.expiresAt));
      }
      
      if (data.patient) {
        setPatientId(data.patient);
      }

      // Store in localStorage for persistence
      localStorage.setItem('pe_session_id', session);
    } catch (err) {
      console.error('[FHIRContext] Failed to fetch session details:', err);
      throw err;
    }
  }, []);

  /**
   * Check existing session on mount
   */
  useEffect(() => {
    const checkExistingSession = async () => {
      // Check URL params first (OAuth callback)
      const launchParams = detectLaunchMode();
      
      if (launchParams.iss || launchParams.launch || launchParams.code) {
        await initializeFromLaunch(launchParams);
        return;
      }

      // Check for session in URL
      const params = new URLSearchParams(window.location.search);
      const urlSession = params.get('session');
      const urlPatient = params.get('patient');

      if (urlSession) {
        setSessionId(urlSession);
        if (urlPatient) setPatientId(urlPatient);
        
        try {
          await fetchSessionDetails(urlSession);
          // Clean URL
          window.history.replaceState({}, '', window.location.pathname);
        } catch {
          // Session invalid, clear it
          localStorage.removeItem('pe_session_id');
        }
        setIsLoading(false);
        return;
      }

      // Check localStorage for existing session
      const storedSession = localStorage.getItem('pe_session_id');
      
      if (storedSession) {
        try {
          await fetchSessionDetails(storedSession);
          setSessionId(storedSession);
        } catch {
          localStorage.removeItem('pe_session_id');
        }
      } else {
        // Check if sandbox mode is enabled
        const frontendSandboxMode = import.meta.env.VITE_SANDBOX_MODE === 'true';
        setSandboxMode(frontendSandboxMode);
      }
      
      setIsLoading(false);
    };

    checkExistingSession();
  }, [detectLaunchMode, initializeFromLaunch, fetchSessionDetails]);

  /**
   * Trigger re-authentication
   */
  const triggerReauth = useCallback(async () => {
    try {
      // Record attempt to prevent loops
      localStorage.setItem('smartAuthAttemptedAt', Date.now().toString());
      window.location.href = 'http://localhost:8000/launch';
    } catch (err) {
      console.error('[FHIRContext] Re-auth failed:', err);
      throw err;
    }
  }, []);

  /**
   * Refresh access token
   */
  const refreshToken = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      setExpiresAt(new Date(data.expiresAt));
    } catch (err) {
      console.error('[FHIRContext] Token refresh failed:', err);
      setError('Session expired. Please re-authenticate.');
      setIsAuthenticated(false);
    }
  }, [sessionId]);

  /**
   * Clear session
   */
  const clearSession = useCallback(() => {
    setSessionId(null);
    setAccessToken(null);
    setPatient(null);
    setPatientId(null);
    setEncounter(null);
    setEncounterId(null);
    setIsAuthenticated(false);
    setExpiresAt(null);
    localStorage.removeItem('pe_session_id');
  }, []);

  /**
   * Set patient ID and fetch patient details
   */
  const handleSetPatientId = useCallback((id: string) => {
    setPatientId(id);
    // Could trigger patient data fetch here
  }, []);

  // Context value
  const contextValue: FHIRContextValue = useMemo(() => ({
    isAuthenticated,
    isLoading,
    error,
    accessToken,
    fhirBaseUrl,
    sessionId,
    expiresAt,
    timeRemaining,
    patient,
    patientId,
    encounter,
    encounterId,
    launchMode,
    sandboxMode,
    initializeFromLaunch,
    setPatientId: handleSetPatientId,
    refreshToken,
    triggerReauth,
    clearSession,
  }), [
    isAuthenticated,
    isLoading,
    error,
    accessToken,
    fhirBaseUrl,
    sessionId,
    expiresAt,
    timeRemaining,
    patient,
    patientId,
    encounter,
    encounterId,
    launchMode,
    sandboxMode,
    initializeFromLaunch,
    handleSetPatientId,
    refreshToken,
    triggerReauth,
    clearSession,
  ]);

  return (
    <FHIRContext.Provider value={contextValue}>
      {children}
    </FHIRContext.Provider>
  );
}

// ===========================================================================
// Hook
// ===========================================================================

export function useFHIR(): FHIRContextValue {
  const context = useContext(FHIRContext);
  
  if (!context) {
    throw new Error('useFHIR must be used within a FHIRProvider');
  }
  
  return context;
}

export default FHIRContext;
