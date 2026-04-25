---
name: luminur-design
description: Use this skill when the user asks to make UI changes, update styles, change colors or typography, modify components, or update the design system in the Luminur PE dashboard project. Triggers on phrases like "update the design", "change the style", "add a component", "update the color", "change the spacing", "update the design system", "fix the UI", or any request involving visual changes to the frontend.
version: 1.0.0
---

# Luminur Design System Skill

This skill governs all UI and design system work in the Luminur PE Integration project. Every design change falls into one of two scenarios. Identify which one applies before making any edits.

## Scenario 1: UI Update (follow the design system as-is)

The user wants to build or modify a UI element without changing the underlying design system.

**Checklist before writing any code:**
- [ ] Import `colors`, `fontSize`, `fontWeight` from `frontend/src/styles/tokens.ts`
- [ ] Check `frontend/src/components/ui/` — use an existing component if one fits (Card, Badge, ListItem, VitalSign, SectionHeader, Button, YesNoToggle, AlertCard, PageTitle, PatientBar)
- [ ] Use `padding: 24px` for section wrappers, `gap: 16px` between list items, `gap: 4px` between sibling cards
- [ ] Section headers: `fontSize: 14, fontWeight: 400, color: colors.gray, textTransform: 'uppercase'`, icon `size={14}` gray
- [ ] Alert labels: `fontSize: 14, fontWeight: 600, textTransform: 'uppercase'`, red for vitals, orange for caution
- [ ] Large metric numbers: `fontSize: 24, fontWeight: 400, color: colors.black` — color never changes for alert state
- [ ] Badges: `fontSize: 12, fontWeight: 400, padding: '2px 8px', borderRadius: 4` — use `<Badge>` component with a semantic variant

**Do NOT:**
- Hardcode any hex values that exist in `colors`
- Hardcode font sizes that exist in `fontSize`
- Create a new inline component that duplicates something already in `components/ui/`
- Invent new colors or spacing values — if needed, flag and go to Scenario 2

---

## Scenario 2: Design System Change (update tokens + docs + gallery)

The user wants to change a color, font size, spacing rule, or component visual spec. This requires updating three files in sync.

**Required edits — all three, every time:**

### 1. `frontend/src/styles/tokens.ts`
- Add or update the token value
- Keep the object structure: `colors`, `fontSize`, `fontWeight`
- Add a comment if the token's usage isn't obvious from the name

### 2. `frontend/src/styles/DESIGN_SYSTEM.md`
- Update the relevant table row (Typography Scale, Spacing Rhythm, Borders, Badges, etc.)
- If a new pattern is introduced, add a new section
- Keep table formatting consistent

### 3. `frontend/src/components/docs/ComponentGallery.tsx`
- Colors: update the `<Swatch>` entry inside the relevant `<SwatchGroup>`
- Typography: update the `<TypeSample>` row
- Spacing: update the `<SpacingExample>` block
- Components: update the `<Variant>` that demonstrates the changed behavior
- If a new token is added, add a new swatch or type sample to make it visible in the gallery

**Verification:** After edits, confirm all three files reference the same value. They must never be out of sync.

---

## Color Palette Reference

| Token | Hex | Use |
|-------|-----|-----|
| `colors.black` | `#111827` | Primary text, active states |
| `colors.gray` | `#596887` | Labels, subtext, icons |
| `colors.border` | `#EEEEEE` | Card borders, dividers |
| `colors.inputBorder` | `#D1D5DB` | Toggle button unselected border |
| `colors.green` / `colors.lightGreen` | `#166534` / `#F0FDF4` | Safe / rule-out states |
| `colors.red` / `colors.lightRed` | `#991B1B` / `#FFF5F3` | Alert / danger states |
| `colors.orange` / `colors.lightOrange` | `#D97706` / `#FEF6F0` | Caution states |
| `colors.darkBlue` / `colors.lightBlue` | `#375292` / `#EFF6FF` | Buttons, selected toggles, tags |

## Typography Reference

| Role | Size | Weight | Color |
|------|------|--------|-------|
| Section header | 14px | 400 | `colors.gray`, uppercase |
| Label / subtext | 14px | 400 | `colors.gray` |
| List item (inactive) | 14px | 400 | `colors.gray` |
| List item (active/present) | 14px | 500 | `colors.red` |
| List item (safe/anticoagulant) | 14px | 500 | `colors.green` |
| Alert label | 14px | 600 | `colors.red` or `colors.orange`, uppercase |
| Large metric | 24px | 400 | `colors.black` |
| Badge text | 12px | 400 | varies by variant |
