# Luminur PE Decision Support - Project Summary

## Overview

Luminur is a SMART on FHIR clinical decision support application for Pulmonary Embolism (PE) risk assessment. The application integrates with Epic EHR systems via the FHIR R4 API and provides real-time clinical decision support with a "Heads-Up Display" (HUD) design philosophy.

## Architecture

```
frontend/                          # React + TypeScript + Vite
├── src/
│   ├── components/               # UI Components
│   │   ├── clinical/             # Clinical-specific components
│   │   │   ├── ImagingSafetyCard.tsx    # Renal function & CTA history
│   │   │   ├── MedsCoagsTab.tsx         # Anticoagulation triage
│   │   │   ├── EssentialsTab.tsx        # Key vitals/labs
│   │   │   └── VitalsChart.tsx          # Vitals visualization
│   │   ├── DecisionCard.tsx      # Primary PE decision display
│   │   ├── SafetyBadge.tsx       # "Can I Scan?" safety status
│   │   ├── ContextStrip.tsx      # Shock Index, Vitals Trends
│   │   ├── DashboardLayout.tsx   # Bento Box 3-zone grid
│   │   └── ...
│   ├── context/
│   │   └── FHIRContext.tsx       # FHIR authentication state
│   ├── data/
│   │   ├── demoData.ts           # Basic demo scenarios
│   │   └── richDemoPatients.ts   # Rich demo patients with full clinical data
│   ├── hooks/
│   │   └── useAutoAuth.ts        # SMART on FHIR authentication hook
│   ├── utils/
│   │   ├── clinicalLogic.ts      # Clinical calculations engine
│   │   ├── fhirQueries.ts        # FHIR data fetching utilities
│   │   └── dataTransform.ts      # Data transformation utilities
│   └── types/
│       └── assessment.ts         # TypeScript interfaces
│
backend/                          # Python + FastAPI
├── main.py                       # FastAPI application entry point
├── integration/
│   └── fhir_mapping.py           # FHIR to model feature mapping
├── pe_model/
│   └── serve_model.py            # ML model serving
└── scripts/
    └── seed_epic_demo.py         # Epic Sandbox data seeding
```

## Key Features

### 1. SMART on FHIR Integration
- EHR Launch flow support (Epic Hyperspace)
- OAuth2 authentication with 3-second timeout fallback
- Automatic demo mode when connection fails

### 2. Clinical Decision Support
- **Decision Card**: Wells Score, PERC Rule, Age-Adjusted D-Dimer
- **Safety Badge**: GFR status, contrast allergies, anticoagulation status
- **Shock Index**: Real-time hemodynamic assessment
- **Prior Imaging**: CTA/V/Q history with duplicate ordering alerts

### 3. Medication Adherence Triage
- Anticoagulant filtering (Apixaban, Rivaroxaban, Warfarin, Heparin, Enoxaparin)
- Gap detection: `(Today - LastDispenseDate) / DaysSupply`
- Visual status: Green (Covered), Yellow (Warfarin/Subtherapeutic), Red (Gap)

### 4. Imaging Safety Module
- Renal function assessment (Creatinine + GFR)
- Contrast risk badges: Green (safe), Yellow (caution), Red (contraindicated)
- Prior CTA history with 48-hour duplicate ordering flag

## Demo Patients

The application includes rich demo patients for testing without FHIR connectivity:

| Patient | Scenario | Key Features |
|---------|----------|--------------|
| Test, HighRisk | High Risk | Medication gap, contrast warning, iodine allergy, prior CTAs |
| Test, LowRisk | Low Risk | PERC negative, normal labs, no risk factors |
| Test, Warfarin | Warfarin | Subtherapeutic INR (1.4), prior PE |
| Test, RecentCTA | Duplicate | CTA 6 hours ago (duplicate ordering flag) |
| Test, CKD | Severe CKD | GFR 22 (contrast contraindicated), on Enoxaparin |

## Configuration

### Environment Variables

```bash
# Frontend (.env)
VITE_SANDBOX_MODE=true
VITE_API_URL=http://localhost:8000

# Backend (.env)
EPIC_CLIENT_ID=your_client_id
EPIC_CLIENT_SECRET=your_client_secret
FHIR_BASE_URL=https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
```

## Running the Application

### Development Mode
```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

### Demo Mode (No Backend Required)
The frontend automatically falls back to demo mode if:
1. Backend is unreachable
2. FHIR connection times out (3 seconds)
3. User clicks "Use Demo Mode"

## Clinical Logic

### Age-Adjusted D-Dimer
```
If Age > 50: Threshold = Age × 10 ng/mL (or Age × 0.01 µg/mL)
If Age ≤ 50: Threshold = 500 ng/mL (or 0.50 µg/mL)
```

### GFR-Based Contrast Risk
- **Green (Safe)**: GFR ≥ 60
- **Yellow (Caution)**: GFR 30-60
- **Red (High Risk)**: GFR < 30 OR Creatinine > 1.5

### Shock Index
```
Shock Index = Heart Rate / Systolic Blood Pressure
- Normal: ≤ 0.7
- Elevated: 0.7 - 1.0
- High: > 1.0
```

## FHIR Resources Used

| Resource | Purpose |
|----------|---------|
| Patient | Demographics (age, sex) |
| Observation | Vitals, labs (D-dimer, creatinine, INR) |
| Condition | Problem list (VTE, cancer) |
| MedicationRequest | Active orders |
| MedicationDispense | Fill history (adherence) |
| AllergyIntolerance | Contrast/iodine allergies |
| DiagnosticReport | Prior imaging results |

## Version History

- **v2.0.0**: SMART on FHIR HUD Dashboard with rich demo fallback
- **v1.0.0**: Initial PE Rule-Out Demo

## License

For internal/research use only. Not for clinical deployment.
