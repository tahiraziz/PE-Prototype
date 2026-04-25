/**
 * Validate that a patient ID is usable for API calls
 * Rejects null, undefined, empty, "None", "null", "undefined"
 */
export function isValidPatientId(id: unknown): id is string {
  if (id === null || id === undefined) {
    return false;
  }
  
  if (typeof id !== 'string') {
    return false;
  }
  
  const trimmed = id.trim();
  
  // Empty string
  if (trimmed === '') {
    return false;
  }
  
  // Python None or JavaScript null/undefined as strings
  const invalidStrings = ['none', 'null', 'undefined'];
  if (invalidStrings.includes(trimmed.toLowerCase())) {
    return false;
  }
  
  return true;
}

/**
 * Get a display-friendly reason why patient ID is invalid
 */
export function getPatientIdError(id: unknown): string | null {
  if (id === null || id === undefined) {
    return 'No patient selected';
  }
  
  if (typeof id !== 'string') {
    return 'Invalid patient ID format';
  }
  
  const trimmed = id.trim();
  
  if (trimmed === '') {
    return 'Patient ID is empty';
  }
  
  if (['none', 'null', 'undefined'].includes(trimmed.toLowerCase())) {
    return 'Patient context not available';
  }
  
  return null;
}

