# Luminur Design System Guidelines

Colors, typography, and spacing tokens are documented with live examples in the **Design System** tab of the docs view. This file covers component-level conventions only.

---

## Shared Style Constants (`DashboardLayout.tsx`)

These four constants are the single source of truth for typography in the dashboard. Any inline style that deviates from them is an exception and should be noted explicitly.

| Constant | fontSize | fontWeight | color | Other |
|----------|----------|------------|-------|-------|
| `labelStyle` | 14px | regular (400) | `#596887` gray | — |
| `hdrStyle` | 14px | regular (400) | `#596887` gray | `textTransform: uppercase` |
| `listStyle` | 14px | regular (400) | `#111827` black | — |
| `bigNumStyle` | 24px | regular (400) | `#111827` black | `lineHeight: 1.1` |

---

## Typography Scale

**Font family:** IBM Plex Sans — applied globally via `fontFamily: "'IBM Plex Sans', sans-serif"`.


| Role | Style constant | Exceptions / overrides |
|------|---------------|----------------------|
| Section title (e.g. "VITAL STABILITY") | `hdrStyle` | `color: colors.gray`, `fontWeight: regular (400)`, all-caps, icon `gap: 4px` |
| Patient header labels ("Patient", "Chief Complaint") | `labelStyle` | Sentence case — not all-caps |
| Patient header values (name, age, chief complaint) | `listStyle` | — |
| Vital/metric labels (HR, BP, MAP, SHOCK INDEX) | `labelStyle` | — |
| Units and subtext | `labelStyle` | — |
| List item — inactive/absent | `listStyle` overridden to `color: #596887` gray | Previous Diagnoses — both inline in DashboardLayout and via `ListItem` ui component |
| List item — active/present | `listStyle` overridden to `color: #991B1B` red, `fontWeight: medium (500)` | Previous Diagnoses |
| List item — anticoagulant name | `listStyle` overridden to `color: #166534` green, `fontWeight: medium (500)` | Anticoagulants section |
| Large metric numbers | `bigNumStyle` | Color never changes for alert state |
| Alert labels (TACHYCARDIA, HYPOXIA, > 0.9 RISK, etc.) | Inline: `14px semibold (600)`, `textTransform: uppercase` | Color: `#991B1B` red for vitals; `#D97706` orange for Shock Index caution |
| Badge text | Inline: `12px regular (400)` | `padding: 2px 8px`, `borderRadius: 4px`; color varies by state |

---

## Spacing Rhythm

| Token | Value | Applied to |
|-------|-------|------------|
| Section padding | 24px | All sections and the patient header row |
| Section title → first item gap | 24px | `marginBottom` on `sectionHdrRow` |
| List item gap | 16px | `gap` in flex column containers — Previous Diagnoses, Anticoagulants, CTPA Safety Barriers |

---

## Section Header Pattern

All sections use a single `padding: 24px` wrapper. The title sits at the top using `sectionHdrRow` (`display: flex`, `alignItems: center`, `gap: 4px`, `marginBottom: 24px`), followed directly by content — no separate boxed header row, no background color, no border below the title.

Title text: `14px regular (400)`, `colors.gray`, all-caps (e.g. "VITAL STABILITY", "PRIOR CTPAS"), `textTransform: uppercase`. Icons use `size={14}`, `color: #596887` gray.

## Card Layout

Sections are wrapped in individual cards arranged with `gap: 4px` between them. Card specs: `border: 1px solid #EEEEEE`, `borderRadius: 8px`, `overflow: hidden`, `backgroundColor: white`. See `components/ui/Card.tsx`.

---

## Badges

Used in Prior CTPAs (result) and CTPA Safety Barriers (eGFR, Contrast Allergy, Radiation):
- `fontSize: 12px`, `fontWeight: regular (400)`
- `padding: 2px 8px`, `borderRadius: 4px`
- Color and background vary by state — see CLINICAL_THRESHOLDS.md for exact values per badge.

---

## Previous Diagnoses Checklist — Label Convention

- **Active** (condition present): 10×10px `#991B1B` red dot + label in `#991B1B` medium (500). Subtext in `labelStyle` indented 18px, shown only when detail is available.
- **Inactive** (condition absent): no dot (slot preserved for alignment) + label in `#596887` gray regular (400). Phrased as explicit negative ("No cancer in the last 6 months", "Not currently pregnant"). Sentence case.

---

## Prior CTPAs — Date Format

Date is prefixed with "CTPA on", e.g. `CTPA on Jan 3, 2024`. Date text uses `listStyle`. Result badge inline to the right.

---

## Borders

`colors.border` (`#EEEEEE`) — dashboard panel outer border and all section dividers between rows and columns.

`colors.inputBorder` (`#D1D5DB`) — Yes/No toggle buttons (unselected state) in YEARS and Wells modals.

## Yes/No Toggle

| State | fontWeight | color | background | border |
|-------|-----------|-------|------------|--------|
| Selected | medium (500) | `colors.darkBlue` | `colors.lightBlue` | `1px solid colors.darkBlue` |
| Unselected | regular (400) | `colors.gray` | white | `1px solid colors.inputBorder` |
