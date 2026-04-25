/**
 * FHIR Queries Utility for Luminur PE Decision Support
 * 
 * Centralized FHIR data fetching with:
 * - Parallel fetching using Promise.all
 * - Error handling and fallbacks
 * - Data normalization for clinical display
 */

import type {
  VitalSigns,
  LabValues,
  PatientDemographics,
  AllergyInfo,
  MedicationDispense,
} from './clinicalLogic';

// ===========================================================================
// Types
// ===========================================================================

export interface FHIRPatientResource {
  id: string;
  resourceType: 'Patient';
  name?: Array<{ given?: string[]; family?: string; text?: string }>;
  birthDate?: string;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  identifier?: Array<{ system?: string; value?: string }>;
}

export interface FHIRObservationResource {
  id: string;
  resourceType: 'Observation';
  status: string;
  code: {
    coding?: Array<{ system?: string; code?: string; display?: string }>;
    text?: string;
  };
  valueQuantity?: { value?: number; unit?: string; system?: string; code?: string };
  valueString?: string;
  effectiveDateTime?: string;
  category?: Array<{ coding?: Array<{ system?: string; code?: string }> }>;
}

export interface FHIRConditionResource {
  id: string;
  resourceType: 'Condition';
  clinicalStatus?: { coding?: Array<{ code?: string }> };
  verificationStatus?: { coding?: Array<{ code?: string }> };
  code?: { coding?: Array<{ system?: string; code?: string; display?: string }>; text?: string };
  onsetDateTime?: string;
  recordedDate?: string;
}

export interface FHIRMedicationRequestResource {
  id: string;
  resourceType: 'MedicationRequest';
  status: string;
  medicationCodeableConcept?: { coding?: Array<{ display?: string; code?: string }>; text?: string };
  medicationReference?: { reference?: string; display?: string };
  authoredOn?: string;
  dosageInstruction?: Array<{ text?: string }>;
}

export interface FHIRMedicationDispenseResource {
  id: string;
  resourceType: 'MedicationDispense';
  status: string;
  medicationCodeableConcept?: { coding?: Array<{ display?: string }>; text?: string };
  medicationReference?: { reference?: string; display?: string };
  whenHandedOver?: string;
  daysSupply?: { value?: number };
  quantity?: { value?: number };
}

export interface FHIRAllergyIntoleranceResource {
  id: string;
  resourceType: 'AllergyIntolerance';
  clinicalStatus?: { coding?: Array<{ code?: string }> };
  code?: { coding?: Array<{ system?: string; code?: string; display?: string }>; text?: string };
  reaction?: Array<{ manifestation?: Array<{ coding?: Array<{ display?: string }> }>; severity?: string }>;
}

export interface FHIRProcedureResource {
  id: string;
  resourceType: 'Procedure';
  status: string;
  code?: { coding?: Array<{ display?: string; code?: string }>; text?: string };
  performedDateTime?: string;
  performedPeriod?: { start?: string; end?: string };
}

export interface FHIRDiagnosticReportResource {
  id: string;
  resourceType: 'DiagnosticReport';
  status: string;
  code?: { coding?: Array<{ display?: string }>; text?: string };
  effectiveDateTime?: string;
  conclusion?: string;
  presentedForm?: Array<{ contentType?: string; data?: string }>;
}

// ===========================================================================
// Patient Context Result
// ===========================================================================

export interface PatientContextResult {
  demographics: PatientDemographics;
  vitals: VitalSigns;
  labs: LabValues;
  allergies: AllergyInfo[];
  conditions: {
    priorPE: boolean;
    priorDVT: boolean;
    activeCancer: boolean;
    recentSurgery: boolean;
    vteHistory: boolean;
    conditionsList: Array<{ display: string; code?: string; category?: string }>;
  };
  medications: {
    activeAnticoagulants: string[];
    medicationRequests: FHIRMedicationRequestResource[];
    medicationDispenses: MedicationDispense[];
  };
  recentImaging: Array<{ type: string; date: string; conclusion?: string }>;
  procedures: Array<{ name: string; date: string; recent: boolean }>;
  dataQuality: {
    hasVitals: boolean;
    hasLabs: boolean;
    hasDDimer: boolean;
    hasAllergies: boolean;
    hasConditions: boolean;
    hasMedications: boolean;
    completeness: 'complete' | 'partial' | 'sparse';
  };
}

// ===========================================================================
// LOINC Codes for Clinical Observations
// ===========================================================================

const LOINC_CODES = {
  // Vitals
  heartRate: ['8867-4'],
  systolicBP: ['8480-6'],
  diastolicBP: ['8462-4'],
  respiratoryRate: ['9279-1'],
  oxygenSaturation: ['2708-6', '59408-5'],
  temperature: ['8310-5'],
  
  // Labs
  dDimer: ['48066-5', '48065-7', '48067-3', '71427-9'],
  troponin: ['6598-7', '10839-9', '49563-0', '89579-7'],
  creatinine: ['2160-0', '38483-4'],
  inr: ['34714-6', '6301-6'],
  gfr: ['33914-3', '48642-3', '48643-1', '50044-7'],
  bnp: ['30934-4', '33762-6'],
};

// ===========================================================================
// API Fetch Wrapper
// ===========================================================================

async function fhirFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T | null> {
  try {
    const response = await fetch(endpoint, {
      ...options,
      credentials: 'include',
      headers: {
        'Accept': 'application/fhir+json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      console.warn(`[FHIR] ${endpoint} returned ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error(`[FHIR] Fetch error for ${endpoint}:`, err);
    return null;
  }
}

// ===========================================================================
// Data Extraction Helpers
// ===========================================================================

function extractName(patient: FHIRPatientResource): string | undefined {
  if (!patient.name?.length) return undefined;
  const name = patient.name[0];
  if (name.text) return name.text;
  const given = name.given?.join(' ') || '';
  const family = name.family || '';
  return `${given} ${family}`.trim() || undefined;
}

function calculateAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function findObservationByLoinc(
  observations: FHIRObservationResource[],
  loincCodes: string[]
): FHIRObservationResource | undefined {
  return observations.find(obs => 
    obs.code?.coding?.some(c => 
      c.system === 'http://loinc.org' && loincCodes.includes(c.code || '')
    )
  );
}

function extractValue(obs: FHIRObservationResource | undefined): number | null {
  if (!obs) return null;
  return obs.valueQuantity?.value ?? null;
}

// ===========================================================================
// Main Fetch Function
// ===========================================================================

/**
 * Fetch comprehensive patient context using parallel FHIR queries
 * 
 * Uses Promise.all to fetch:
 * - Patient demographics
 * - Observations (vital-signs, laboratory)
 * - Conditions (Problem list)
 * - MedicationRequest (Active orders)
 * - MedicationDispense (Fill history)
 * - AllergyIntolerance
 * - Procedure (Recent surgeries)
 * - DiagnosticReport (Imaging)
 */
export async function fetchPatientContext(
  patientId: string
): Promise<PatientContextResult> {
  const baseUrl = '/api';
  
  // Parallel fetch all resources
  const [
    patientData,
    vitalsData,
    labsData,
    conditionsData,
    medsData,
    allergiesData,
    proceduresData,
    imagingData,
  ] = await Promise.all([
    // Patient demographics
    fhirFetch<FHIRPatientResource>(`${baseUrl}/fhir/patient/${patientId}`),
    
    // Vital signs observations
    fhirFetch<{ vitals: FHIRObservationResource[] }>(
      `${baseUrl}/fhir/observations?patient_id=${patientId}&vitals=true&labs=false`
    ),
    
    // Laboratory observations  
    fhirFetch<{ labs: FHIRObservationResource[] }>(
      `${baseUrl}/fhir/observations?patient_id=${patientId}&vitals=false&labs=true`
    ),
    
    // Conditions (fetch via clinical endpoint)
    fhirFetch<{ flags: Record<string, boolean>; top_conditions: Array<{ display: string }> }>(
      `${baseUrl}/clinical/diagnoses?patient_id=${patientId}`
    ),
    
    // Medications (via clinical endpoint)
    fhirFetch<{ status: string; medications: Array<{ name: string; type: string }> }>(
      `${baseUrl}/clinical/anticoagulation?patient_id=${patientId}`
    ),
    
    // Allergies (we'll need to add this endpoint)
    fhirFetch<{ allergies: FHIRAllergyIntoleranceResource[] }>(
      `${baseUrl}/clinical/allergies?patient_id=${patientId}`
    ),
    
    // Procedures (we'll need to add this endpoint)
    fhirFetch<{ procedures: FHIRProcedureResource[] }>(
      `${baseUrl}/clinical/procedures?patient_id=${patientId}`
    ),
    
    // Imaging studies
    fhirFetch<{ studies: Array<{ type: string; date: string; conclusion?: string }> }>(
      `${baseUrl}/clinical/imaging?patient_id=${patientId}&type=all`
    ),
  ]);

  // Process vitals
  const vitalsObs = vitalsData?.vitals || [];
  const vitals: VitalSigns = {
    hr: extractValue(findObservationByLoinc(vitalsObs, LOINC_CODES.heartRate)),
    sbp: extractValue(findObservationByLoinc(vitalsObs, LOINC_CODES.systolicBP)),
    dbp: extractValue(findObservationByLoinc(vitalsObs, LOINC_CODES.diastolicBP)),
    rr: extractValue(findObservationByLoinc(vitalsObs, LOINC_CODES.respiratoryRate)),
    spo2: extractValue(findObservationByLoinc(vitalsObs, LOINC_CODES.oxygenSaturation)),
    temp: extractValue(findObservationByLoinc(vitalsObs, LOINC_CODES.temperature)),
    timestamp: vitalsObs[0]?.effectiveDateTime || null,
  };

  // Process labs
  const labsObs = labsData?.labs || [];
  const labs: LabValues = {
    ddimer: extractValue(findObservationByLoinc(labsObs, LOINC_CODES.dDimer)),
    ddimerUnits: findObservationByLoinc(labsObs, LOINC_CODES.dDimer)?.valueQuantity?.unit || null,
    creatinine: extractValue(findObservationByLoinc(labsObs, LOINC_CODES.creatinine)),
    troponin: extractValue(findObservationByLoinc(labsObs, LOINC_CODES.troponin)),
    inr: extractValue(findObservationByLoinc(labsObs, LOINC_CODES.inr)),
    gfr: extractValue(findObservationByLoinc(labsObs, LOINC_CODES.gfr)),
  };

  // Process demographics
  const demographics: PatientDemographics = {
    age: patientData?.birthDate ? calculateAge(patientData.birthDate) : null,
    sex: patientData?.gender as 'male' | 'female' | 'unknown' || 'unknown',
  };

  // Process allergies
  const allergies: AllergyInfo[] = (allergiesData?.allergies || []).map(a => ({
    substance: a.code?.text || a.code?.coding?.[0]?.display || 'Unknown',
    code: a.code?.coding?.[0]?.code,
    reaction: a.reaction?.[0]?.manifestation?.[0]?.coding?.[0]?.display,
    severity: a.reaction?.[0]?.severity as 'low' | 'high' | 'unable-to-assess' | undefined,
  }));

  // Process conditions
  const conditionFlags = conditionsData?.flags || {};
  const conditions = {
    priorPE: conditionFlags.prior_pe || false,
    priorDVT: conditionFlags.prior_dvt || conditionFlags.prior_pe_dvt || false,
    activeCancer: conditionFlags.active_malignancy || conditionFlags.active_cancer || false,
    recentSurgery: conditionFlags.recent_surgery || false,
    vteHistory: conditionFlags.prior_pe || conditionFlags.prior_dvt || conditionFlags.prior_pe_dvt || false,
    conditionsList: (conditionsData?.top_conditions || []).map(c => ({
      display: c.display,
    })),
  };

  // Process medications
  const activeAnticoagulants = (medsData?.medications || [])
    .filter(m => ['doac', 'warfarin', 'heparin_lmwh'].includes(m.type))
    .map(m => m.name);

  const medicationDispenses: MedicationDispense[] = []; // Would need MedicationDispense endpoint

  // Process procedures (check for recent surgery)
  const now = new Date();
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const procedures = (proceduresData?.procedures || []).map(p => {
    const procDate = p.performedDateTime || p.performedPeriod?.start || '';
    const isRecent = procDate ? new Date(procDate) > fourWeeksAgo : false;
    return {
      name: p.code?.text || p.code?.coding?.[0]?.display || 'Unknown procedure',
      date: procDate,
      recent: isRecent,
    };
  });

  // Process imaging
  const recentImaging = (imagingData?.studies || []).slice(0, 5);

  // Calculate data quality
  const hasVitals = [vitals.hr, vitals.sbp, vitals.spo2].some(v => v != null);
  const hasLabs = [labs.creatinine, labs.troponin].some(v => v != null);
  const hasDDimer = labs.ddimer != null;
  const hasAllergies = allergies.length > 0;
  const hasConditions = conditions.conditionsList.length > 0;
  const hasMedications = activeAnticoagulants.length > 0;

  const dataPoints = [hasVitals, hasLabs, hasDDimer, hasConditions, hasMedications];
  const presentCount = dataPoints.filter(Boolean).length;
  let completeness: 'complete' | 'partial' | 'sparse';
  if (presentCount >= 4) completeness = 'complete';
  else if (presentCount >= 2) completeness = 'partial';
  else completeness = 'sparse';

  return {
    demographics,
    vitals,
    labs,
    allergies,
    conditions,
    medications: {
      activeAnticoagulants,
      medicationRequests: [],
      medicationDispenses,
    },
    recentImaging,
    procedures,
    dataQuality: {
      hasVitals,
      hasLabs,
      hasDDimer,
      hasAllergies,
      hasConditions,
      hasMedications,
      completeness,
    },
  };
}

/**
 * Quick fetch for just vitals and D-Dimer (for dashboard display)
 */
export async function fetchQuickVitals(
  patientId: string
): Promise<{ vitals: VitalSigns; ddimer: number | null; timestamp: string | null }> {
  const data = await fhirFetch<{
    vitals_latest: { hr: number | null; spo2: number | null; rr: number | null; sbp: number | null; timestamp: string | null };
    labs_latest: { ddimer: number | null };
  }>(`/api/clinical/frontpage?patient_id=${patientId}`);

  return {
    vitals: {
      hr: data?.vitals_latest?.hr ?? null,
      sbp: data?.vitals_latest?.sbp ?? null,
      rr: data?.vitals_latest?.rr ?? null,
      spo2: data?.vitals_latest?.spo2 ?? null,
      timestamp: data?.vitals_latest?.timestamp ?? null,
    },
    ddimer: data?.labs_latest?.ddimer ?? null,
    timestamp: data?.vitals_latest?.timestamp ?? null,
  };
}

/**
 * Fetch allergy information for safety badge
 */
export async function fetchAllergies(patientId: string): Promise<AllergyInfo[]> {
  const data = await fhirFetch<{ allergies: FHIRAllergyIntoleranceResource[] }>(
    `/api/clinical/allergies?patient_id=${patientId}`
  );

  return (data?.allergies || []).map(a => ({
    substance: a.code?.text || a.code?.coding?.[0]?.display || 'Unknown',
    code: a.code?.coding?.[0]?.code,
    severity: a.reaction?.[0]?.severity as 'low' | 'high' | 'unable-to-assess' | undefined,
  }));
}

/**
 * Fetch recent imaging for context strip
 */
export async function fetchRecentImaging(
  patientId: string,
  limit: number = 2
): Promise<Array<{ type: string; date: string; relativeTime: string }>> {
  const data = await fhirFetch<{ studies: Array<{ type: string; date: string }> }>(
    `/api/clinical/imaging?patient_id=${patientId}&type=all`
  );

  const now = new Date();
  
  return (data?.studies || []).slice(0, limit).map(s => {
    const studyDate = new Date(s.date);
    const diffMs = now.getTime() - studyDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    let relativeTime: string;
    if (diffHours < 1) relativeTime = 'Just now';
    else if (diffHours < 24) relativeTime = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    else relativeTime = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return {
      type: s.type,
      date: s.date,
      relativeTime,
    };
  });
}
