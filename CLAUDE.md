# Luminur PE Integration — Claude Instructions

## Project Overview

Clinical dashboard for pulmonary embolism (PE) decision support. Integrates with Epic via SMART on FHIR. Frontend is React + TypeScript + Vite with inline styles (no Tailwind, no CSS modules). Backend is Python/FastAPI.

## Key Paths

| What | Where |
|------|-------|
| Design tokens (single source of truth) | `frontend/src/styles/tokens.ts` |
| Design system docs | `frontend/src/styles/DESIGN_SYSTEM.md` |
| Reusable UI components | `frontend/src/components/ui/` |
| Component gallery (live docs) | `frontend/src/components/docs/ComponentGallery.tsx` |
| Clinical logic | `frontend/src/utils/clinicalLogic.ts`, `clinicalRules.ts` |
| Demo/test data | `frontend/src/data/richDemoPatients.ts` |
| Backend entry | `backend/main.py` |

## Design System Rules

There are two distinct scenarios. Follow the right one based on what is being asked.

---

### Scenario 1: Making UI updates

When building or modifying UI (adding a feature, fixing a component, changing layout), you MUST:

- Import colors and typography from `frontend/src/styles/tokens.ts` — never hardcode hex values or font sizes that already exist as tokens.
- Use components from `frontend/src/components/ui/` (Card, Badge, ListItem, VitalSign, SectionHeader, Button, YesNoToggle, AlertCard, PageTitle, PatientBar) instead of rebuilding them inline.
- Follow the spacing rhythm: `padding: 24px` for section wrappers, `gap: 16px` between list items, `gap: 4px` between cards.
- Follow the typography conventions in `DESIGN_SYSTEM.md` — section headers are 14px regular gray all-caps, list items are 14px regular black, alert labels are 14px semibold red uppercase, large numbers are 24px regular black.
- Do NOT invent new colors or font sizes. If the design needs something that doesn't exist in tokens, flag it and propose adding it (see Scenario 2).

---

### Scenario 2: Changing the design system (styles, tokens, or component specs)

When changing a color, font size, spacing value, component API, or visual behavior, you MUST update ALL THREE of:

1. **`frontend/src/styles/tokens.ts`** — update or add the token value.
2. **`frontend/src/styles/DESIGN_SYSTEM.md`** — update the relevant table row or section to reflect the new spec.
3. **`frontend/src/components/docs/ComponentGallery.tsx`** — update the swatch, TypeSample, SpacingExample, or component Variant that demonstrates the changed token or behavior.

Never update only one or two of these. They must stay in sync.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, inline styles only (no CSS framework)
- **Icons**: `lucide-react`
- **Font**: IBM Plex Sans (loaded globally)
- **Backend**: Python 3, FastAPI, uvicorn
- **FHIR**: Epic SMART on FHIR OAuth2 + R4 FHIR queries in `frontend/src/utils/fhirQueries.ts`

## Coding Conventions

- All inline style values for colors, font sizes, and weights must come from `tokens.ts` imports — no magic numbers.
- Component files in `components/ui/` are the design system primitives. Clinical/layout components in `components/` use them.
- Clinical threshold logic lives in `utils/clinicalLogic.ts` and `utils/clinicalRules.ts` — keep presentation and clinical logic separate.
- Do not add Tailwind, CSS modules, or any CSS framework. The project uses inline styles by design for portability in clinical environments.
