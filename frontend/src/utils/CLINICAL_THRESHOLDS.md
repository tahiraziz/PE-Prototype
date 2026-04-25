# Clinical Threshold & Display State Reference

This document covers **only what is currently rendered in the live dashboard** (`DashboardLayout.tsx` + `YearsCalculatorModal.tsx`). All threshold logic lives inline in those two files — no external clinical utility functions are used for rendering.

---

**Contents**

- [1. Vital Stability Section](#1-vital-stability-section)
- [2. Hemodynamic Stress Section](#2-hemodynamic-stress-section)
- [3. Previous Diagnoses Checklist](#3-previous-diagnoses-checklist)
- [4. Anticoagulants Section](#4-anticoagulants-section)
- [5. Prior CTPAs Section](#5-prior-ctpas-section)
- [6. CTPA Safety Barriers Section](#6-ctpa-safety-barriers-section)
- [7. YEARS Calculator Modal](#7-years-calculator-modal)
- [Layout & Typography Rules](#layout--typography-rules)

---

## 1. Vital Stability Section

**Source:** `DashboardLayout.tsx` → `VitalStabilitySection`

Five vitals displayed in a 5-column grid. Each vital has an icon + label (14px gray) above the value, and a unit below. Alert label appears below the unit when threshold is breached.

**Vital value style:** `24px regular (400) #111827` — never changes color for alert state.
**Alert label style:** `14px semibold (600)` — uppercase, color per table below.

| Vital | Unit | Alert Condition | Alert Label | Alert Color |
|-------|------|----------------|-------------|-------------|
| **HR** | bpm | `hr > 100` | `TACHYCARDIA` | `#991B1B` |
| **BP (SBP/DBP)** | mmHg | `sbp < 90` | `HYPOTENSION` | `#991B1B` |
| **SPO2** | % | `spo2 < 95` | `HYPOXIA` | `#991B1B` |
| **RR** | /min | `rr > 20` | `TACHYPNEA` | `#991B1B` |
| **TEMP** | °C | `temp > 38` | `FEBRILE` | `#991B1B` |

**Notes:**
- No bradycardia alert — only `hr > 100` triggers a state change.
- SPO2 shows O2 delivery device in brackets below the value (e.g. `[RA]`, `[NRB]`). Display-only, does not affect threshold.

---

## 2. Hemodynamic Stress Section

**Source:** `DashboardLayout.tsx` → `HemodynamicStressSection`
**Data source:** `calculateHemodynamics(patient.vitals)` from `data/demoData.ts`

Two metrics side by side: **MAP** and **Shock Index**. Both display in `24px regular (400) #111827`.

### MAP (Mean Arterial Pressure)
- Formula: `(SBP + 2 × DBP) / 3`
- No threshold — no alert state. Always renders in `#111827`.

### Shock Index
- Formula: `HR / SBP`
- Renders `—` if HR or SBP is missing.

| Shock Index | Status | Alert Label | Alert Color | Alert Style |
|-------------|--------|-------------|-------------|-------------|
| `≤ 0.7` | Safe | _(none)_ | — | — |
| `> 0.7` and `≤ 0.9` | Caution | `> 0.7 Caution` | `#D97706` | 14px semibold |
| `> 0.9` | Danger | `> 0.9 Risk` | `#991B1B` | 14px semibold |

---

## 3. Previous Diagnoses Checklist

**Source:** `DashboardLayout.tsx` → `PreviousDiagnosesChecklist`

Seven items always rendered. `gap: 16px` between items.

**Active state** (condition present):
- 10×10px filled `#991B1B` circle dot.
- Label: `14px medium (500) #991B1B`.
- Subtext (when available): `14px regular (400) #596887`, indented 18px.

**Inactive state** (condition absent):
- No dot (slot kept for alignment).
- Label: `14px regular (400) #596887` (gray — not black), phrased as explicit negative.
- No subtext.

### Items

| # | Active Label | Inactive Label | Active Subtext |
|---|-------------|----------------|----------------|
| 1 | Prior PE Diagnosis | No prior PE diagnosis | `patient.priorPEDate` if present |
| 2 | Cancer (last 6 months) | No cancer in the last 6 months | _(none)_ |
| 3 | Surgeries (last 4 weeks) | No surgeries in the last 4 weeks | _(none)_ |
| 4 | Immobilizations in the last 3 days | No immobilizations in the last 3 days | `"{date} · {description}"` |
| 5 | Prior Thrombophilia | No prior Thrombophilia | _(none)_ |
| 6 | Currently pregnant | Not currently pregnant | _(none)_ |
| 7 | Currently on estrogen | Not currently on estrogen | _(none)_ |

### Detection Logic

| Item | Condition |
|------|-----------|
| Prior PE | `patient.hasPriorVTE === true` |
| Cancer | Regex `/cancer\|malignancy\|chemotherapy\|tumor/i` on `patient.activeProblems` |
| Surgeries | `patient.hasRecentSurgery === true` |
| Immobilizations | `patient.recentImmobilization` is not null/undefined |
| Thrombophilia | `patient.priorThrombophilia === true` |
| Pregnancy | Regex `/pregnancy\|pregnant\|gestational/i` on `patient.activeProblems` |
| Estrogen | `patient.usesEstrogen === true` |

---

## 4. Anticoagulants Section

**Source:** `DashboardLayout.tsx` → `AnticoagulantsSection`

Filters `patient.medications` for `category === 'Anticoagulant'`. `gap: 16px` between items.

- Green dot (10×10px `#166534`) + drug name: `14px medium (500) #166534`.
- Dose subtext: `14px regular (400) #596887`, indented 18px.
- If none: "None on file" in `14px regular #596887`.

---

## 5. Prior CTPAs Section

**Source:** `DashboardLayout.tsx` → `PriorCTPAsSection`

Reads `patient.priorImaging`. If null: "None on file" in `14px regular #596887`.

When present, renders:
- **Date row:** `"CTPA on {Month Day, Year}"` — `14px regular (400) #111827` (listStyle) + result badge inline.
- **Result badge:** `12px regular (400)`, `padding: 2px 8px`, `borderRadius: 4px`.

| Result | Badge Text Color | Badge Background |
|--------|-----------------|-----------------|
| Positive | `#991B1B` | `#FFF5F3` |
| Negative | `#166534` | `#F0FDF4` |
| Indeterminate | `#D97706` | `#FEF6F0` |

- **Report summary:** `14px regular (400) #596887` below the date row.

---

## 6. CTPA Safety Barriers Section

**Source:** `DashboardLayout.tsx` → `CTPASafetyBarriersSection`

Three items. `gap: 16px` between items. Each item: label (`14px regular #111827`) + badge inline, then subtext below.

**Badge style:** `12px regular (400)`, `padding: 2px 8px`, `borderRadius: 4px`.

### eGFR

| eGFR | Badge | Text Color | Background |
|------|-------|-----------|------------|
| `≥ 60` | Safe | `#166534` | `#F0FDF4` |
| `≥ 30` and `< 60` | Caution | `#D97706` | `#FEF6F0` |
| `< 30` | Impaired | `#991B1B` | `#FFF5F3` |

Subtext format: `{egfr} · {description}` — descriptions: Normal kidney function / Mildly decreased function / Mild-moderate decrease / Moderate-severe decrease / Severely decreased / Kidney failure.

### Contrast Allergy

| Value | Badge | Text Color | Background |
|-------|-------|-----------|------------|
| `true` | Allergy | `#991B1B` | `#FFF5F3` |
| `false` | None | `#166534` | `#F0FDF4` |

Subtext: "Allergy documented" or "No known allergy".

### Total Radiation Exposure

Only rendered if `totalRadiationExposureMSV` is defined on the patient record.

| Value (mSv) | Badge | Text Color | Background |
|-------------|-------|-----------|------------|
| `> 100` | Unsafe | `#991B1B` | `#FFF5F3` |
| `> 50` and `≤ 100` | Caution | `#D97706` | `#FEF6F0` |
| `≤ 50` | Safe | `#166534` | `#F0FDF4` |

Subtext: `{value} mSv in the last 4 weeks`.

---

## 7. YEARS Calculator Modal

**Source:** `YearsCalculatorModal.tsx`
**Triggered by:** Cases 1 and 4 (cases with pre-chart YEARS teaching content)

Three yes/no clinical questions: Clinical DVT? · Hemoptysis? · PE is most likely diagnosis?

### Threshold Logic

| YEARS Score | D-Dimer Threshold |
|-------------|-------------------|
| `0` | 1000 ng/mL |
| `≥ 1` | 500 ng/mL |

### Result States

| Condition | Result | Background | Text Color |
|-----------|--------|-----------|------------|
| `dDimer < threshold` | rule-out | `#F0FDF4` | `#166534` |
| `dDimer ≥ threshold` | no-rule-out | `#FFF5F3` | `#991B1B` |

D-Dimer bar fill matches result color. Threshold tick always shown. Units: ng/mL.

---

## Layout & Typography Rules (all dashboard sections)

- **Section padding:** `24px` on all sections including the patient header row.
- **Section titles:** float within content container (no separate boxed header), `14px regular (400) #111827`, all-caps, `letterSpacing: 0.06em`, icon `size={14}`, `24px` gap below title before first item.
- **Patient header labels** ("Patient", "Chief Complaint"): `14px regular (400) #596887`, sentence case (not all-caps).
- **Patient header values** (name/age/gender, chief complaint): `14px regular (400) #111827`.
- **Large metric numbers** (HR, BP, SPO₂, RR, TEMP, MAP, Shock Index): `24px regular (400) #111827`. Color never changes for alert state.
- **Alert labels:** `14px semibold (600)`, uppercase.
- **List item text:** `14px regular (400)` — inactive/absent items use `#596887`, active/present items use `#991B1B` medium (500) or `#166534` medium (500).
- **Subtext / labels / units:** `14px regular (400) #596887`.
- **Badge text:** `12px regular (400)`, `padding: 2px 8px`, `borderRadius: 4px`.
- **List item gap:** `16px` in all list sections.

*Last updated: 2026-03-05. Source files: `components/DashboardLayout.tsx`, `components/YearsCalculatorModal.tsx`, `data/demoData.ts`, `styles/tokens.ts`.*
