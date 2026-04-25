# Epic Sandbox Testing Guide

This guide explains how to test the PE Rule-Out application end-to-end using Epic's FHIR sandbox.

## Prerequisites

- Backend and frontend running locally
- Web browser for SMART on FHIR authentication

---

## Client IDs

The application uses different Epic client IDs for sandbox and production environments:

| Environment | Client ID | Description |
|-------------|-----------|-------------|
| **Sandbox** | `3030ba26-36d2-4af2-866c-ce0101280315` | Non-production, for Epic's public sandbox (fhir.epic.com) |
| **Production** | `8eb380b5-deda-47aa-8f8b-6aac19d1b705` | Production Epic instances |

### How to Switch Environments

Set `EPIC_ENV` in your `.env` file:

```bash
# For sandbox testing (default)
EPIC_ENV=sandbox

# For production
EPIC_ENV=prod
```

### How It Works

1. The backend reads `EPIC_ENV` at startup
2. It automatically selects the correct client ID:
   - `EPIC_ENV=sandbox` → uses sandbox client ID
   - `EPIC_ENV=prod` → uses production client ID
3. The selected client ID is logged at startup (masked for security)

### Verify Active Client ID

When the backend starts, you'll see:

```
INFO:config:Epic Configuration:
INFO:config:  EPIC_ENV: sandbox
INFO:config:  Client ID: 3030ba26...0315 (from sandbox (EPIC_CLIENT_ID_SANDBOX))
INFO:config:  Redirect URI: http://localhost:8000/callback
INFO:config:  Is Sandbox: True
```

### Override Client ID (Advanced)

You can override the auto-selected client ID by setting `EPIC_CLIENT_ID` directly:

```bash
# This will be used regardless of EPIC_ENV
EPIC_CLIENT_ID=my-custom-client-id
```

### Backwards Compatibility

The legacy `SANDBOX_MODE=true` setting is still supported. If `EPIC_ENV` is not set:
- `SANDBOX_MODE=true` → uses sandbox client ID
- `SANDBOX_MODE=false` (or unset) → defaults to sandbox for safety

---

## OAuth Scopes and App Audience

### Scope Mode Toggle (EPIC_SCOPE_MODE)

This app supports two scope modes, controlled by the `EPIC_SCOPE_MODE` environment variable:

| Mode | Scopes | Best For |
|------|--------|----------|
| **patient** (default) | `openid fhirUser patient/Patient.read patient/Observation.read launch/patient` | Epic sandbox testing with "Patients" audience |
| **user** | `openid fhirUser user/Patient.read user/Observation.read` | Clinician apps with "Clinicians" audience |

### Setting Scope Mode

In your `.env` file:

```bash
# For sandbox testing (recommended)
EPIC_SCOPE_MODE=patient

# For clinician apps
EPIC_SCOPE_MODE=user
```

### Why Patient Mode Works Best for Sandbox

Epic's public sandbox (fhir.epic.com) and USCDI test environments work most reliably with:
- **Audience = Patients**
- **Scopes = patient/***

When using `user/*` scopes (clinician mode), Epic may:
- Strip the scopes from the authorize URL
- Route to HSWeb/different OAuth endpoints
- Require additional app permissions not available in sandbox

**Recommendation**: Use `EPIC_SCOPE_MODE=patient` for sandbox testing.

### App Audience Types

Epic apps have an "Audience / User Type" setting that determines the OAuth flow:

| Audience | Required Scopes | OAuth Behavior |
|----------|-----------------|----------------|
| **Patients** | `patient/*` | Shows patient picker in sandbox, MyChart in production |
| **Clinicians** | `user/*` | May require additional Epic configuration |

### Common Issues

1. **Epic strips user/* scopes**
   - Symptom: Authorize URL only shows `scope=openid+fhirUser`
   - Cause: Epic sandbox doesn't fully support user/* for your app
   - Fix: Switch to `EPIC_SCOPE_MODE=patient` and set app audience to "Patients"

2. **Redirect to MyChart error page**
   - Symptom: "An error has occurred. The request is invalid."
   - Cause: Audience/scope mismatch
   - Fix: Ensure Epic app audience matches your scope mode

3. **HSWeb redirect instead of SMART auth**
   - Symptom: URL contains `HSWeb_uscdi` or similar
   - Cause: Epic routing user/* scopes differently
   - Fix: Use patient mode for sandbox testing

### Verify Current Configuration

Check `/api/auth/diagnostics` to see:
- `epic_scope_mode`: Current mode (patient or user)
- `scope`: Exact scope string being requested

---

## Auto-Launch Authentication (Sandbox Mode)

When `SANDBOX_MODE=true` is set in the backend `.env` file, the frontend will **automatically** start SMART authentication when you open it in the browser.

### How It Works

1. Frontend loads and calls `GET /api/auth/status`
2. If no valid session exists → auto-redirects to `/launch`
3. Epic OAuth flow completes → redirects back to frontend with session
4. Dashboard loads with authenticated session

### Enabling Sandbox Mode

**Backend (.env):**
```
SANDBOX_MODE=true
```

**Frontend (.env or environment):**
```
VITE_SANDBOX_MODE=true
```

### Loop Prevention

The auto-launch includes safety guards:

1. **Callback detection**: Won't auto-launch if URL contains `code=`, `state=`, or `/callback`
2. **Cooldown timer**: If auth fails, waits 30 seconds before retrying
3. **Local storage flag**: Tracks recent auth attempts to prevent loops

### Recovering from Auth Loops

If you get stuck in a redirect loop:

1. **Clear site data**: DevTools → Application → Clear site data
2. **Clear localStorage**: `localStorage.removeItem('smartAuthAttemptedAt')`
3. **Restart backend**: Clears in-memory session storage
4. **Check credentials**: Verify Epic Client ID is correct

---

## Quick Start

### 1. Start the Backend

```bash
cd backend
source venv/bin/activate  # if using venv
uvicorn main:app --reload --port 8000
```

Verify it's running:
```bash
curl http://localhost:8000/health
```

### 2. Start the Frontend

```bash
cd frontend
npm run dev
```

Frontend will be available at `http://localhost:3000`

### 3. Authenticate via SMART on FHIR

Open your browser and navigate to:

```
http://localhost:8000/launch?iss=https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
```

This will:
1. Redirect to Epic's authorization page
2. After login, redirect back with an access token
3. Send you to the frontend with a valid session

**Expected URL after auth:**
```
http://localhost:3000?session=session_state_...&patient=...
```

### 4. Test with Sandbox Patients

Once authenticated, the frontend will show the **Epic Sandbox Testing** panel:

1. Click **"Load Patients"** to fetch sandbox patients
2. Select a patient from the list (or enter a Patient ID manually)
3. Click **"Run Assessment"**
4. View the PE assessment result

### 5. Check Debug Info

Expand the **"Debug Info"** panel at the bottom to see:
- Which Patient ID was used
- Which FHIR calls were made
- How many vitals/labs were retrieved
- Missing critical vs optional fields
- Any mapping warnings

---

## API Endpoints for Testing

### List Patients

```bash
GET /api/fhir/patients?session_id={SESSION_ID}&count=20
```

Returns:
```json
{
  "patients": [
    {"id": "abc123", "name": "Test Patient", "birthDate": "1980-01-15", "gender": "male"}
  ],
  "count": 1,
  "fhir_url": "https://fhir.epic.com/.../Patient"
}
```

### Get Single Patient

```bash
GET /api/fhir/patient/{PATIENT_ID}?session_id={SESSION_ID}
```

### Get Observations

```bash
GET /api/fhir/observations?patient_id={PATIENT_ID}&session_id={SESSION_ID}&vitals=true&labs=true
```

Returns:
```json
{
  "vitals": [{"code": "8867-4", "display": "Heart rate", "value": 72, "unit": "bpm", "date": "..."}],
  "labs": [...],
  "debug": {
    "patient_id": "abc123",
    "fhir_calls": ["GET Observation?patient=abc123&category=vital-signs..."],
    "warnings": []
  }
}
```

### Run PE Assessment

```bash
POST /api/pe-assessment
Content-Type: application/json

{
  "patient_id": "abc123",
  "session_id": "session_state_..."
}
```

### Check Session Info

```bash
GET /api/session/info?session_id={SESSION_ID}
```

### Check Auth Status (for auto-launch)

```bash
GET /api/auth/status?session_id={SESSION_ID}
```

Returns:
```json
{
  "authenticated": true,
  "expiresAt": "2024-01-15T12:30:00",
  "patient": "abc123...",
  "fhirBase": "https://fhir.epic.com/...",
  "sandboxMode": true,
  "timeRemaining": 3200
}
```

### Get Sandbox Config

```bash
GET /api/auth/sandbox-config
```

Returns:
```json
{
  "sandboxMode": true,
  "launchUrl": "/launch?iss=https://fhir.epic.com/...",
  "fhirBaseUrl": "https://fhir.epic.com/..."
}
```

---

## Direct FHIR Sanity Checks

Use these curl commands to verify FHIR access directly. Set your access token first:

```bash
export ACCESS_TOKEN="your_access_token_here"
export FHIR_BASE="https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4"
```

### Get a Patient

```bash
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
     -H "Accept: application/fhir+json" \
     "$FHIR_BASE/Patient/{PATIENT_ID}"
```

### Get Vital Signs

```bash
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
     -H "Accept: application/fhir+json" \
     "$FHIR_BASE/Observation?patient={PATIENT_ID}&category=vital-signs&_count=10&_sort=-date"
```

### Get Lab Results

```bash
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
     -H "Accept: application/fhir+json" \
     "$FHIR_BASE/Observation?patient={PATIENT_ID}&category=laboratory&_count=10&_sort=-date"
```

---

## Common Failure Modes and Fixes

### 401 Unauthorized

**Symptoms:**
- "Token expired or invalid"
- "Valid session required"

**Causes:**
- Access token expired (typically 1 hour)
- Session not found in backend

**Fix:**
Re-authenticate via `/launch` endpoint.

### 403 Forbidden

**Symptoms:**
- "Forbidden: Patient.read scope may be missing"
- "Forbidden: Observation.read scope missing"

**Causes:**
- OAuth scopes not granted during authorization
- Client ID not configured for required scopes

**Fix:**
1. Check your Epic Client ID configuration
2. Ensure scopes include: `patient/Patient.read patient/Observation.read`
3. Re-register your app if scopes are missing

### Patient Found but No Observations

**Symptoms:**
- "No vital-signs returned for this patient"
- "No laboratory results returned for this patient"
- vitals_count: 0, labs_count: 0

**Causes:**
- Sandbox patient has no clinical data
- Category parameter not recognized

**Fix:**
- Try a different sandbox patient (some have more data than others)
- Check the Epic sandbox documentation for "data-rich" test patients

### Redirect URI Mismatch

**Symptoms:**
- OAuth callback fails with "redirect_uri mismatch"

**Causes:**
- Registered redirect URI doesn't match `.env` configuration

**Fix:**
1. Check `EPIC_REDIRECT_URI` in `.env`
2. Ensure it matches exactly what's registered in Epic App Orchard
3. Default: `http://localhost:8000/callback`

### Empty Feature Summary

**Symptoms:**
- Assessment runs but most features are "Not available"

**Causes:**
- LOINC codes don't match sandbox data
- Observations exist but use different code systems

**Fix:**
- Check the Debug Panel for mapping warnings
- Review returned observations in `/api/fhir/observations` endpoint
- Update LOINC mappings in `fhir_mapping.py` if needed

### Backend Not Receiving Session

**Symptoms:**
- Frontend shows "Not authenticated"
- Session ID in URL but not working

**Causes:**
- In-memory session storage cleared (backend restarted)
- Session ID not passed correctly

**Fix:**
- Re-authenticate (session was lost on backend restart)
- Check that `session` URL parameter is present

---

## Known Sandbox Test Patients

Epic's public sandbox includes several test patients. Try these if patient search returns empty:

| Patient ID | Description |
|------------|-------------|
| `Tbt3KuCY0B5PSrJvCu2j-PlK.aiHsu2xUjUM8bWpetXoB` | Adult patient with some clinical data |
| (Check Epic sandbox docs for current IDs) | |

**Note:** Sandbox patient IDs can change. Check Epic's current documentation.

---

## Troubleshooting Checklist

1. ✅ Backend running on port 8000?
2. ✅ Frontend running on port 3000?
3. ✅ `.env` file has correct Epic credentials?
4. ✅ Authenticated via `/launch` endpoint?
5. ✅ Session visible in URL after redirect?
6. ✅ No CORS errors in browser console?
7. ✅ Backend logs showing FHIR requests?

---

## Backend Logging

The backend logs detailed information for each assessment. Check the terminal running uvicorn for:

```
=== PE ASSESSMENT START: patient=abc123 ===
Fetching patient data from FHIR...
Found 15 observations
Mapped 8/24 features from FHIR
Running PE prediction...
=== ASSESSMENT RESULT ===
  patient_id: abc123
  data_source: fhir
  vitals_count: 5
  labs_count: 3
  missing_critical: ['d_dimer']
  probability: 0.0342
  decision: rule_out
```

---

## Debug Panel Fields Explained

| Field | Description |
|-------|-------------|
| Patient ID | FHIR Patient resource ID used |
| Data Source | "fhir" (live) or "provided_features" (test data) |
| FHIR Calls | API calls made (URLs without tokens) |
| Vitals Retrieved | Number of vital-sign observations found |
| Labs Retrieved | Number of laboratory observations found |
| Missing Critical | Fields required for reliable assessment |
| Missing Optional | Fields that improve but don't block assessment |
| Warnings | Mapping issues (e.g., "D-dimer not found") |

---

## Clinical History & Risk API Endpoints

These endpoints provide anticoagulation status, diagnoses, vitals, labs, and imaging data for the PE Rule-Out dashboard's History & Risk modules.

### GET /api/clinical/anticoagulation

Returns anticoagulation status and medication list.

```bash
curl "http://localhost:8000/api/clinical/anticoagulation?patient_id=YOUR_PATIENT_ID" \
  -H "Cookie: pe_session_id=YOUR_SESSION"
```

**Response:**
```json
{
  "status": "on_anticoagulant|none|unknown",
  "medications": [
    {"name": "Apixaban", "type": "DOAC", "status": "active", "start": "2024-01-15"}
  ],
  "has_warfarin": false
}
```

### GET /api/clinical/inr

Returns INR time series for warfarin patients.

```bash
curl "http://localhost:8000/api/clinical/inr?patient_id=YOUR_PATIENT_ID&days=30" \
  -H "Cookie: pe_session_id=YOUR_SESSION"
```

**Response:**
```json
{
  "series": [
    {"time": "2024-12-01T10:30:00Z", "value": 2.3, "unit": "INR"}
  ]
}
```

### GET /api/clinical/diagnoses

Returns PE mimic diagnosis flags and top conditions.

```bash
curl "http://localhost:8000/api/clinical/diagnoses?patient_id=YOUR_PATIENT_ID&years=5" \
  -H "Cookie: pe_session_id=YOUR_SESSION"
```

**Response:**
```json
{
  "flags": {
    "asthma": true,
    "anxiety": false,
    "copd": false,
    "chf": true,
    "pneumonia": false
  },
  "top_conditions": [
    {"display": "Chronic heart failure", "clinical_status": "active", "onset": "2023-06-15"}
  ]
}
```

### GET /api/clinical/vitals

Returns vital signs time series (HR, SpO2, RR, SBP).

```bash
curl "http://localhost:8000/api/clinical/vitals?patient_id=YOUR_PATIENT_ID&hours=24" \
  -H "Cookie: pe_session_id=YOUR_SESSION"
```

**Response:**
```json
{
  "series": {
    "hr": [{"time": "2024-12-31T10:00:00Z", "value": 88}],
    "spo2": [{"time": "2024-12-31T10:00:00Z", "value": 96}],
    "rr": [{"time": "2024-12-31T10:00:00Z", "value": 18}],
    "sbp": [{"time": "2024-12-31T10:00:00Z", "value": 120}]
  }
}
```

### GET /api/clinical/ddimer

Returns D-dimer time series.

```bash
curl "http://localhost:8000/api/clinical/ddimer?patient_id=YOUR_PATIENT_ID&days=30" \
  -H "Cookie: pe_session_id=YOUR_SESSION"
```

**Response:**
```json
{
  "series": [
    {"time": "2024-12-30T08:00:00Z", "value": 0.45, "unit": "μg/mL"}
  ]
}
```

### GET /api/clinical/imaging

Returns PE-relevant imaging studies (CTPA, V/Q).

```bash
curl "http://localhost:8000/api/clinical/imaging?patient_id=YOUR_PATIENT_ID&years=5&type=ctpa" \
  -H "Cookie: pe_session_id=YOUR_SESSION"
```

**Response:**
```json
{
  "studies": [
    {
      "date": "2024-11-15",
      "type": "CTPA",
      "title": "CT Angiography Chest PE Protocol",
      "snippet": "No evidence of pulmonary embolism...",
      "full_text": "FINDINGS: No evidence of pulmonary embolism. Normal pulmonary vasculature...",
      "resource_ref": "DiagnosticReport/abc123"
    }
  ]
}
```

### GET /api/clinical/summary

Returns aggregated clinical summary for the Essentials tab.

```bash
curl "http://localhost:8000/api/clinical/summary?patient_id=YOUR_PATIENT_ID" \
  -H "Cookie: pe_session_id=YOUR_SESSION"
```

**Response:**
```json
{
  "anticoagulation": {
    "status": "on_anticoagulant",
    "has_warfarin": false,
    "active_meds": ["Apixaban"]
  },
  "diagnosis_flags": {
    "asthma": false,
    "anxiety": false,
    "copd": true,
    "chf": false,
    "pneumonia": false
  },
  "vitals_available": {
    "hr": true,
    "spo2": true,
    "rr": true,
    "sbp": true
  }
}
```

---

## Medication Classification

The system classifies medications into the following categories:

| Category | Example Medications |
|----------|---------------------|
| DOAC | Apixaban (Eliquis), Rivaroxaban (Xarelto), Dabigatran (Pradaxa), Edoxaban |
| Warfarin | Warfarin, Coumadin |
| Heparin/LMWH | Heparin, Enoxaparin (Lovenox), Dalteparin, Fondaparinux |
| Antiplatelet | Aspirin, Clopidogrel (Plavix), Ticagrelor (Brilinta), Prasugrel |

---

## PE Mimic Diagnosis Categories

The system flags diagnoses that can mimic PE symptoms:

| Category | ICD-10 Prefixes | Keywords |
|----------|-----------------|----------|
| Asthma | J45 | asthma, reactive airway |
| Anxiety | F40, F41 | anxiety, panic, hyperventilation |
| COPD | J44, J43 | copd, emphysema, chronic bronchitis |
| CHF | I50 | heart failure, cardiomyopathy |
| Pneumonia | J12-J18 | pneumonia, lower respiratory infection |

