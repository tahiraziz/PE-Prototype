# PE Rule-Out Dashboard - Frontend Documentation

## Overview

A minimal, ED-optimized decision support dashboard designed for 5-10 second clinical decisions. The UI acts as a mental checklist, not an EHR screen.

## Design Philosophy

**Core principle**: If it doesn't change the PE rule-out decision in the ED, hide it by default.

- **Decision first**: The rule-out vs continue-workup decision is unmistakable at first glance
- **High-signal only**: Only shows hypoxia, tachycardia, hemodynamics, D-dimer
- **Context matters**: Prior VTE, cancer, surgery surfaced prominently  
- **No scroll required**: Default view fits in viewport
- **Everything else collapsed**: Details available but hidden

## Information Hierarchy

The dashboard is structured as a mental checklist:

```
1. DECISION          → Rule Out or Continue Workup (huge, obvious)
2. PROBABILITY       → X% vs 8% threshold
3. RATIONALE         → One-line ED-style explanation (integrates scores)
4. CLINICAL SCORES   → Wells | Geneva | PERC (compact strip, expandable)
5. KEY INDICATORS    → Hypoxia, Tachycardia, Hemodynamics, D-dimer
6. PRIOR DIAGNOSES   → VTE, Cancer, Surgery (collapsed)
7. DETAILS           → Everything else (collapsed)
```

## Components

### 1. DecisionCard (`DecisionCard.tsx`)

The primary element. Shows:

- **Decision badge**: Large `✓ RULE OUT` (teal) or `→ CONTINUE WORKUP` (amber)
- **Probability**: Big number like `3.4%` with threshold context
- **One-line rationale**: ED-style summary that integrates clinical scores when relevant:
  - "Low-risk presentation with normal oxygenation. Wells low-risk and PERC negative."
  - "Elevated risk due to hypoxia and prior VTE with high Wells."

### 2. ClinicalScoresBar (`ClinicalScoresBar.tsx`)

Compact horizontal strip showing traditional clinical scores:

| Score | Risk Levels | Color |
|-------|-------------|-------|
| Wells | Low (<2) / Moderate (2-6) / High (>6) | Green / Amber / Red |
| Revised Geneva | Low (0-3) / Intermediate (4-10) / High (≥11) | Green / Amber / Red |
| PERC | Negative (0 criteria) / Positive | Green / Amber |

**Features**:
- Labeled "Traditional clinical scores (for context)"
- Click any score to expand component breakdown
- Handles missing data: shows "Incomplete" with tooltip
- Never competes with the primary decision

### 3. KeyIndicators (`KeyIndicators.tsx`)

Four high-signal items only:

| Indicator | Normal | Abnormal | Missing |
|-----------|--------|----------|---------|
| Oxygenation | SpO₂ ≥ 95% | SpO₂ < 95% | ? |
| Heart Rate | HR ≤ 100 | HR > 100 | ? |
| Hemodynamics | SBP ≥ 90 | SBP < 90 or SI > 1.0 | ? |
| D-dimer | ≤ 0.5 | > 0.5 | pending |

Visual cues:
- ✓ Normal (teal)
- ! Abnormal (amber)
- ? Missing (gray, dashed)

### 4. PriorDiagnoses (`PriorDiagnoses.tsx`)

Collapsed by default. Shows high-signal diagnoses:

- Prior PE ⚠️
- Prior DVT ⚠️  
- Active malignancy ⚠️
- Recent surgery/immobilization ⚠️
- Heart failure
- COPD/Lung disease

If none present: "No relevant prior diagnoses found"

### 5. DetailsPanel (`DetailsPanel.tsx`)

Collapsed by default. Contains:

- **Model Reasoning**: Full explanation from backend
- **Key Factors**: What increased/decreased risk
- **Missing Data**: Warning if critical fields missing
- **Assumptions**: Rule-out only, not diagnostic, etc.
- **Model Inputs**: Collapsible table of all features
- **Copy Summary**: Button to copy text to clipboard

### 6. TopBar (`TopBar.tsx`)

Minimal header:
- App title: "PE Rule-Out"
- Patient ID
- Demo toggle
- Run button

### 7. DemoModeSelector (`DemoModeSelector.tsx`)

Compact horizontal pills to select demo scenarios.

## File Structure

```
src/
├── App.tsx              # Main layout (minimal)
├── App.css              # All styling (~500 lines)
├── components/
│   ├── TopBar.tsx       # Minimal header
│   ├── DecisionCard.tsx # Primary decision display
│   ├── ClinicalScoresBar.tsx # Wells, Geneva, PERC (compact)
│   ├── KeyIndicators.tsx# 4 high-signal items
│   ├── PriorDiagnoses.tsx# Collapsed risk factors
│   ├── DetailsPanel.tsx # All other details (collapsed)
│   └── DemoModeSelector.tsx # Demo scenario picker
├── types/
│   └── assessment.ts    # TypeScript interfaces
├── data/
│   └── demoData.ts      # 5 demo scenarios
└── utils/
    └── dataTransform.ts # API transformation
```

## Language Guidelines

### Use ✓
- "Low-risk presentation"
- "Elevated risk due to..."
- "Consider ruling out PE"
- "Further workup recommended"
- "Clinical judgment required"

### Avoid ✗
- "PE ruled out" (diagnostic claim)
- "Safe to discharge"
- "Order CT-PA" (action language)
- Long paragraphs
- Academic terminology

## Visual Language

| Decision | Color | Icon | Feeling |
|----------|-------|------|---------|
| Rule Out | Teal (#0d7377) | ✓ | Calm, confident |
| Continue Workup | Amber (#c45c26) | → | Cautious, alerting |

## Demo Scenarios

5 built-in scenarios for testing:

1. **Low Risk - Complete**: Rule out, all data present
2. **Moderate Risk - Continue**: Some concerning features
3. **Missing Labs - Triage Only**: D-dimer pending
4. **High Risk - Urgent**: Multiple high-risk features
5. **Critical Missing**: Demographics incomplete

## No-Scroll Default View

The default view (decision + indicators + collapsed sections) fits within a typical laptop viewport without scrolling. This is intentional - an ED physician should see everything they need in one glance.

Expanding sections may require scrolling, which is acceptable for optional detail exploration.

## API Integration

Connects to `POST /api/pe-assessment` via Vite proxy to `localhost:8000`.

Expected response:
```json
{
  "probability": 0.034,
  "threshold": 0.08,
  "decision": "rule_out",
  "explanation": "...",
  "feature_summary": {...}
}
```

## Prototype Safeguards

- Yellow banner: "PROTOTYPE — Decision Support Only — Clinical Judgment Required"
- Footer: "Not for clinical use"
- All language framed as "consider" not "do"
- No order placement or cancellation
