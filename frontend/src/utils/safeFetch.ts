import { apiTracker } from '../components/ErrorBoundary';

interface SafeFetchResult<T> {
  data: T | null;
  error: string | null;
  status: number | null;
}

/**
 * Safe fetch wrapper that never throws - always returns a result object
 * Tracks last API call for error boundary debugging
 */
export async function safeFetch<T>(
  url: string,
  options?: RequestInit
): Promise<SafeFetchResult<T>> {
  // Track the API call
  apiTracker.lastEndpoint = url;
  apiTracker.lastStatus = null;
  apiTracker.lastError = null;
  
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
    });
    
    apiTracker.lastStatus = response.status;
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorBody = await response.text();
        if (errorBody) {
          const parsed = JSON.parse(errorBody);
          errorMessage = parsed.detail || parsed.message || errorMessage;
        }
      } catch {
        // Ignore parse errors
      }
      apiTracker.lastError = errorMessage;
      return { data: null, error: errorMessage, status: response.status };
    }
    
    const data = await response.json();
    return { data, error: null, status: response.status };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Network error';
    apiTracker.lastError = errorMessage;
    console.error('safeFetch error:', url, errorMessage);
    return { data: null, error: errorMessage, status: null };
  }
}

/**
 * Set the current patient ID for tracking
 */
export function setTrackedPatientId(patientId: string | null) {
  apiTracker.patientId = patientId;
}

