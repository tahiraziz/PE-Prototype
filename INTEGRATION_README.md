# PE Rule-Out SMART on FHIR Integration Demo

**Version:** 1.0.0  
**Date:** November 24, 2025  
**Status:** 🔬 Demonstration Prototype

---

## ⚠️ Important Disclaimer

**THIS IS A DEMONSTRATION PROTOTYPE ONLY**

- ❌ NOT FDA approved
- ❌ NOT for clinical use
- ❌ NOT production-ready
- ✅ For demonstration and educational purposes only
- ✅ Requires physician oversight if used in any clinical context
- ✅ Read-only decision support (does not create/modify/cancel orders)

---

## 📋 Table of Contents

1. [What This Demo Does](#what-this-demo-does)
2. [Architecture Overview](#architecture-overview)
3. [Prerequisites](#prerequisites)
4. [Epic Sandbox Setup](#epic-sandbox-setup)
5. [Backend Setup](#backend-setup)
6. [Frontend Setup](#frontend-setup)
7. [Running the Application](#running-the-application)
8. [Testing](#testing)
9. [API Documentation](#api-documentation)
10. [Model Details](#model-details)
11. [Troubleshooting](#troubleshooting)
12. [Known Limitations](#known-limitations)

---

## 🎯 What This Demo Does

This demonstration integrates the **PE (Pulmonary Embolism) Rule-Out Model** with Epic's FHIR sandbox using the SMART on FHIR framework.

### Key Features

1. **SMART on FHIR Authentication**: Implements OAuth 2.0 flow with Epic sandbox
2. **FHIR Data Retrieval**: Fetches Patient and Observation resources via FHIR API
3. **Feature Mapping**: Maps FHIR data to model inputs using LOINC codes
4. **PE Prediction**: Runs logistic regression model to predict PE probability
5. **Clinical Decision Support**: Applies 0.08 threshold for rule-out recommendations
6. **Web Interface**: Simple React UI for running assessments

### What It Does NOT Do

- ❌ Create, modify, or cancel clinical orders
- ❌ Write data back to the EHR
- ❌ Make autonomous clinical decisions
- ❌ Replace physician judgment

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Epic FHIR Sandbox                     │
│                  (Patient + Observation Data)                │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │ FHIR API (OAuth 2.0)
                             │
┌────────────────────────────▼────────────────────────────────┐
│                     Backend (FastAPI)                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │  SMART on FHIR OAuth Handler                       │    │
│  │  (/launch, /callback)                              │    │
│  └────────────────────────┬───────────────────────────┘    │
│                           │                                  │
│  ┌────────────────────────▼───────────────────────────┐    │
│  │  FHIR Integration Layer                            │    │
│  │  • Fetch Patient/Observation resources            │    │
│  │  • Map LOINC codes to features                     │    │
│  │  • Handle missing data                             │    │
│  └────────────────────────┬───────────────────────────┘    │
│                           │                                  │
│  ┌────────────────────────▼───────────────────────────┐    │
│  │  PE Model Serving Layer                            │    │
│  │  • Load logistic regression model                  │    │
│  │  • Median imputation for missing values            │    │
│  │  • Predict PE probability                          │    │
│  │  • Apply 0.08 threshold                            │    │
│  └────────────────────────┬───────────────────────────┘    │
│                           │                                  │
│  ┌────────────────────────▼───────────────────────────┐    │
│  │  REST API (/api/pe-assessment)                     │    │
│  └────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │ HTTP/JSON
                             │
┌────────────────────────────▼────────────────────────────────┐
│                   Frontend (React + TypeScript)              │
│  • Patient ID input                                          │
│  • Run assessment button                                     │
│  • Display results (probability, decision, features)         │
└──────────────────────────────────────────────────────────────┘
```

---

## 📦 Prerequisites

### Required Software

- **Python 3.12** (backend)
- **Node.js 18+** (frontend)
- **Git** (to clone/manage code)

### Epic Sandbox Account

You'll need an Epic FHIR sandbox account:

1. Go to https://fhir.epic.com/
2. Create a developer account
3. Register a new application:
   - **App Type:** SMART on FHIR
   - **Launch Type:** EHR Launch or Standalone Launch
   - **Redirect URI:** `http://localhost:8000/callback`
   - **Scopes:** `patient/Patient.read`, `patient/Observation.read`, `launch`
4. Note your **Client ID** (you'll need this)

---

## 🔧 Epic Sandbox Setup

### 1. Register Your App

1. Log into Epic FHIR sandbox: https://fhir.epic.com/
2. Navigate to "Build Apps" → "Create App"
3. Fill in application details:
   - **Application Name:** PE Rule-Out Demo
   - **Application Type:** SMART on FHIR
   - **Launch URI:** `http://localhost:8000/launch` (if using EHR launch)
   - **Redirect URI:** `http://localhost:8000/callback`
   - **FHIR Scopes:** 
     - `patient/Patient.read`
     - `patient/Observation.read`
     - `launch` (if using EHR launch)
     - `launch/patient` (if using standalone launch)

4. Save and note your **Client ID**

### 2. Get Test Patient IDs

Epic provides test patients in their sandbox:

- **Example Patient ID:** `Tbt3KuCY0B5PSrJvCu2j-PlK.aiHsu2xUjUM8bWpetXoB`
- Find more at: https://fhir.epic.com/Documentation?docId=testpatients

### 3. Test FHIR Access (Optional)

Verify FHIR connectivity:

```bash
curl -H "Accept: application/fhir+json" \
  https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/metadata
```

---

## 🐍 Backend Setup

### 1. Navigate to Backend Directory

```bash
cd /Users/MusabHashem/Downloads/MIMIC_Testing/backend
```

### 2. Create Python Virtual Environment

```bash
python3.12 -m venv venv
source venv/bin/activate  # On macOS/Linux
# Or: venv\Scripts\activate  # On Windows
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your Epic credentials
nano .env  # or use any text editor
```

Fill in your `.env` file:

```bash
FHIR_BASE_URL=https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
EPIC_CLIENT_ID=your_actual_client_id_here
EPIC_REDIRECT_URI=http://localhost:8000/callback
EPIC_AUTH_URL=https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize
EPIC_TOKEN_URL=https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token
FRONTEND_URL=http://localhost:3000
```

### 5. Export Model (Optional - uses dummy model by default)

If you have access to the MIMIC-IV data and want to train the real model:

```bash
python export_model.py
```

This will:
- Train the logistic regression model on MIMIC-IV data
- Export to `output/pe_lr_model.pkl`
- Export preprocessor to `output/pe_lr_preprocessor.pkl`
- Export feature metadata to `output/pe_lr_features.json`

**Note:** If you skip this step, the system will use a rule-based dummy model for demonstration.

---

## ⚛️ Frontend Setup

### 1. Navigate to Frontend Directory

```bash
cd /Users/MusabHashem/Downloads/MIMIC_Testing/frontend
```

### 2. Install Node Dependencies

```bash
npm install
```

---

## 🚀 Running the Application

### Step 1: Start the Backend

```bash
cd /Users/MusabHashem/Downloads/MIMIC_Testing/backend
source venv/bin/activate
python -m uvicorn main:app --reload --port 8000
```

You should see:

```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Loading PE rule-out model...
INFO:     ✓ Model loaded successfully
```

**Backend API:** http://localhost:8000  
**API Docs:** http://localhost:8000/docs (Swagger UI)

### Step 2: Start the Frontend

In a new terminal:

```bash
cd /Users/MusabHashem/Downloads/MIMIC_Testing/frontend
npm run dev
```

You should see:

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
```

**Frontend UI:** http://localhost:3000

### Step 3: Test the Application

#### Option A: Direct Feature Input (No FHIR)

1. Open http://localhost:3000
2. Enter a patient ID (any string for testing)
3. Click "Run PE Assessment"
4. View results

The backend will use dummy features if no session is provided.

#### Option B: Full SMART on FHIR Flow

1. Initiate OAuth flow:
   ```
   http://localhost:8000/launch?iss=https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
   ```

2. Epic will redirect to their authorization page

3. Log in with Epic sandbox credentials

4. Authorize the app

5. Epic redirects to `http://localhost:8000/callback`

6. Backend exchanges code for token

7. Redirects to frontend with session: `http://localhost:3000?session=xxx&patient=xxx`

8. Enter patient ID (or use pre-filled) and run assessment

---

## 🧪 Testing

### Run Backend Tests

```bash
cd /Users/MusabHashem/Downloads/MIMIC_Testing/backend
source venv/bin/activate
pytest
```

Tests cover:
- ✅ Model loading and serving
- ✅ Prediction with complete/missing features
- ✅ Threshold interpretation
- ✅ FHIR data extraction
- ✅ LOINC code mapping
- ✅ API endpoints

### Run Specific Test Files

```bash
# Test model only
pytest tests/test_model.py -v

# Test FHIR mapping
pytest tests/test_fhir_mapping.py -v

# Test API endpoints
pytest tests/test_api.py -v
```

### Test Coverage

```bash
pytest --cov=. --cov-report=html
```

---

## 📚 API Documentation

### Endpoints

#### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "timestamp": "2025-11-24T10:30:00"
}
```

#### `GET /launch`

Initiates SMART on FHIR OAuth flow.

**Query Parameters:**
- `iss` (optional): FHIR server base URL
- `launch` (optional): Launch token from EHR

**Response:** Redirects to Epic authorization page

#### `GET /callback`

OAuth callback endpoint.

**Query Parameters:**
- `code`: Authorization code from Epic
- `state`: State parameter (CSRF protection)

**Response:** Redirects to frontend with session

#### `POST /api/pe-assessment`

Run PE assessment for a patient.

**Request Body:**
```json
{
  "patient_id": "Tbt3KuCY0B5PSrJvCu2j-PlK.aiHsu2xUjUM8bWpetXoB",
  "session_id": "session_123456789",  // Optional
  "features": {  // Optional - for direct feature input
    "age": 65,
    "gender": "M",
    "triage_hr": 95,
    "triage_o2sat": 96,
    "d_dimer": 450
  }
}
```

**Response:**
```json
{
  "patient_id": "...",
  "timestamp": "2025-11-24T10:30:00",
  "probability": 0.0543,
  "threshold": 0.08,
  "decision": "rule_out",
  "explanation": "Low PE probability (5.4%). Based on the model, PE can be RULED OUT...",
  "feature_summary": {
    "demographics": {
      "age": "65 years",
      "gender": "M",
      "bmi": "28.5 kg/m²"
    },
    "vital_signs": {
      "heart_rate": "95 bpm",
      "oxygen_saturation": "96 %"
    },
    "laboratory": {
      "d_dimer": "450 ng/mL"
    },
    "data_completeness": {
      "total_features": 25,
      "available_features": 18,
      "missing_features": 7
    }
  },
  "safety_note": "This is a decision support tool only. Clinical judgment should always take precedence."
}
```

---

## 🧠 Model Details

### Model Specifications

From `TECHNICAL_METHODS.md` and `COMPREHENSIVE_RESULTS_REPORT.md`:

| Attribute | Value |
|-----------|-------|
| **Model Type** | Logistic Regression (L2-regularized) |
| **Features** | 25 clinical features |
| **Threshold** | 0.08 probability |
| **Sensitivity** | 97.4% |
| **Specificity** | 27.0% |
| **NPV** | 98.95% |
| **PPV** | 12.7% |
| **Rule-out Rate** | 24.6% |
| **AUC** | 0.696 |
| **Dataset** | MIMIC-IV ED (n=11,634) |
| **Test Set** | n=3,491 patients |
| **FDA Status** | Tier-1 Exempt (100% interpretable) |

### 25 Model Features

#### Demographics (5)
- age, gender, bmi, height_cm, weight_lbs

#### Triage Vitals (6)
- triage_hr, triage_rr, triage_o2sat, triage_temp, triage_sbp, triage_dbp

#### Laboratory Values (14)
- d_dimer, troponin_t, ntprobnp, creatinine
- hemoglobin, wbc, platelet
- sodium, potassium, bun, glucose
- lactate, po2, pco2

### Decision Rule

```
IF probability < 0.08:
    → RULE OUT PE
    → Consider avoiding CT pulmonary angiography
    → NPV 98.95% (high confidence)

ELSE:
    → CONTINUE WORKUP
    → Standard PE evaluation pathway
    → Clinical judgment + imaging as indicated
```

### Missing Data Handling

- **Strategy:** Median imputation
- **Implementation:** Scikit-learn SimpleImputer with strategy='median'
- **Note:** More complete data improves prediction accuracy

---

## 🔍 Troubleshooting

### Backend Issues

#### "Model not loaded"
**Solution:** Run `python export_model.py` or let it use the dummy model

#### "EPIC_CLIENT_ID not configured"
**Solution:** Create `.env` file with your Epic client ID

#### "401 Unauthorized" from FHIR
**Solution:** Check that:
- Client ID is correct
- OAuth flow completed successfully
- Access token hasn't expired

### Frontend Issues

#### "Cannot connect to backend"
**Solution:** Ensure backend is running on port 8000

#### "Network error"
**Solution:** Check CORS settings and proxy configuration in `vite.config.ts`

### Epic Sandbox Issues

#### "Invalid redirect URI"
**Solution:** Ensure redirect URI in Epic app matches `http://localhost:8000/callback` exactly

#### "No patient data found"
**Solution:** Use valid Epic sandbox test patient IDs

### Test Failures

#### "Model tests fail"
**Solution:** Ensure model is loaded before running tests:
```bash
python export_model.py  # or let it use dummy model
pytest tests/test_model.py
```

---

## ⚠️ Known Limitations

### Technical Limitations

1. **In-Memory Session Storage**
   - Sessions stored in memory (not persisted)
   - Lost on server restart
   - **Production:** Use Redis, database, or secure session management

2. **No Token Refresh**
   - Access tokens expire (typically 1 hour)
   - No automatic refresh implemented
   - **Production:** Implement refresh token flow

3. **Simplified LOINC Mapping**
   - Uses common LOINC codes
   - May miss institution-specific codes
   - **Production:** Customize LOINC mappings for your EHR

4. **Basic Error Handling**
   - Limited error recovery
   - **Production:** Add retry logic, circuit breakers

5. **No Audit Logging**
   - No persistent logs of predictions
   - **Production:** Implement comprehensive audit trail

### Clinical Limitations

1. **Retrospective Validation Only**
   - Not validated prospectively
   - Not validated on external datasets

2. **Single-Center Data**
   - Trained on MIMIC-IV only (Beth Israel Deaconess)
   - May not generalize to other populations

3. **Low Specificity**
   - 27% specificity means many false positives
   - Most "continue workup" patients won't have PE

4. **Not FDA Approved**
   - Designed to be FDA Tier-1 exempt
   - No formal regulatory clearance

5. **Requires Labs**
   - Model benefits from lab results (D-dimer, troponin, etc.)
   - Less accurate with only vitals

---

## 📖 Additional Documentation

### Project Documentation

- **DOCUMENTATION_INDEX.md** - Complete documentation index
- **QUICK_REFERENCE.md** - Clinical quick reference card
- **EXECUTIVE_SUMMARY.md** - For decision-makers
- **COMPREHENSIVE_RESULTS_REPORT.md** - Full scientific report (50+ pages)
- **TECHNICAL_METHODS.md** - Reproducibility guide

### Code Documentation

- **Backend:** See inline docstrings in Python files
- **Frontend:** See TypeScript comments in React components
- **Tests:** See test files in `backend/tests/`

---

## 🤝 Support & Contact

### Questions?

- **Technical issues:** Review troubleshooting section above
- **Clinical questions:** See COMPREHENSIVE_RESULTS_REPORT.md Section 5
- **Model details:** See TECHNICAL_METHODS.md

### Reporting Issues

If you encounter problems:

1. Check logs (backend console output)
2. Review troubleshooting section
3. Verify Epic sandbox configuration
4. Test with direct feature input (bypass FHIR)

---

## 📄 License & Usage

**Demonstration purposes only.**

This prototype is provided as-is for educational and demonstration purposes. It is **not intended for clinical use** without proper validation, regulatory approval, and physician oversight.

**If adapting for any clinical context:**
1. Perform prospective validation
2. Obtain IRB approval
3. Implement proper audit logging
4. Add clinical oversight requirements
5. Follow institutional policies
6. Consider FDA regulatory pathways

---

## ✅ Quick Start Checklist

- [ ] Python 3.12 installed
- [ ] Node.js 18+ installed
- [ ] Epic FHIR sandbox account created
- [ ] Epic app registered with Client ID
- [ ] `.env` file configured with Client ID
- [ ] Backend dependencies installed (`pip install -r requirements.txt`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Backend running on port 8000
- [ ] Frontend running on port 3000
- [ ] Tests passing (`pytest`)
- [ ] Accessed http://localhost:3000 successfully

---

**Document Version:** 1.0.0  
**Last Updated:** November 24, 2025  
**Status:** ✅ Complete

**Ready to start?** Follow the setup instructions above and refer to this README as needed.

---

**REMEMBER:** This is a **demonstration prototype**. Not for clinical use. Requires physician oversight.

