import { useState } from 'react';
import { Heart, Activity, Wind, Droplets, ClipboardList, ClipboardCopy } from 'lucide-react';
import { colors, fontSize, fontWeight } from '../../styles/tokens';
import PatientBar    from '../ui/PatientBar';
import SectionHeader from '../ui/SectionHeader';
import VitalSign     from '../ui/VitalSign';
import Badge         from '../ui/Badge';
import ListItem      from '../ui/ListItem';
import YesNoToggle   from '../ui/YesNoToggle';
import PageTitle     from '../ui/PageTitle';
import AlertCard     from '../ui/AlertCard';
import Button        from '../ui/Button';
import Card          from '../ui/Card';

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

function TokenSection({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <h2 style={{ fontSize: 20, fontWeight: fontWeight.semibold, color: colors.black, marginBottom: 20 }}>
        {name}
      </h2>
      {children}
    </div>
  );
}

function ComponentSection({ name, path, specs, children }: { name: string; path: string; specs?: string[]; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: fontWeight.semibold, color: colors.black, marginBottom: 4 }}>
          {name}
        </h2>
        <code style={{
          fontSize: 13,
          color: colors.darkBlue,
          backgroundColor: '#F1F5F9',
          border: `1px solid ${colors.border}`,
          borderRadius: 3,
          padding: '2px 6px',
        }}>
          {path}
        </code>
        {specs && (
          <ul style={{ margin: '10px 0 0', padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {specs.map((s, i) => (
              <li key={i} style={{ fontSize: fontSize.label, color: colors.gray }}>{s}</li>
            ))}
          </ul>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </div>
  );
}

function Variant({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: fontSize.label, color: colors.gray, marginBottom: 8, fontWeight: fontWeight.medium }}>
        {label}
      </p>
      <div style={{ border: `1px solid ${colors.border}`, borderRadius: 6, padding: 20, backgroundColor: 'white' }}>
        {children}
      </div>
    </div>
  );
}

function Row({ children, gap = 16 }: { children: React.ReactNode; gap?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap, flexWrap: 'wrap' }}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Color swatches
// ---------------------------------------------------------------------------

interface SwatchProps {
  token: string;
  hex: string;
  usage: string;
  light?: boolean; // adds a border so pale colors are visible on white
}

function Swatch({ token, hex, usage, light }: SwatchProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${colors.border}` }}>
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 6,
        backgroundColor: hex,
        flexShrink: 0,
        border: light ? `1px solid ${colors.border}` : undefined,
      }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <code style={{ fontSize: 13, color: colors.darkBlue, fontWeight: fontWeight.medium }}>{token}</code>
          <span style={{ fontSize: 12, color: colors.gray, fontFamily: 'monospace' }}>{hex}</span>
        </div>
        <p style={{ fontSize: fontSize.label, color: colors.gray, marginTop: 2 }}>{usage}</p>
      </div>
    </div>
  );
}

function SwatchGroup({ title, swatches }: { title: string; swatches: SwatchProps[] }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontSize: fontSize.label, fontWeight: fontWeight.semibold, color: colors.gray, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        {title}
      </p>
      {swatches.map(s => <Swatch key={s.token} {...s} />)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Typography scale
// ---------------------------------------------------------------------------

interface TypeSampleProps {
  role: string;
  token: string;
  size: number;
  weight: number;
  color: string;
  sample: string;
  uppercase?: boolean;
}

function TypeSample({ role, token, size, weight, color, sample, uppercase }: TypeSampleProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 32, padding: '14px 0', borderBottom: `1px solid ${colors.border}` }}>
      <div style={{ width: 200, flexShrink: 0 }}>
        <p style={{ fontSize: size, fontWeight: weight, color, lineHeight: 1.3, textTransform: uppercase ? 'uppercase' : undefined }}>
          {sample}
        </p>
      </div>
      <div>
        <p style={{ fontSize: 13, color: colors.black, fontWeight: fontWeight.medium }}>{role}</p>
        <p style={{ fontSize: 12, color: colors.gray, fontFamily: 'monospace', marginTop: 2 }}>
          {token} · {size}px · {weight === 400 ? 'regular' : weight === 500 ? 'medium' : 'semibold'}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spacing examples
// ---------------------------------------------------------------------------

function SpacingExample({ label, spec, children }: { label: string; spec: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <p style={{ fontSize: fontSize.label, fontWeight: fontWeight.medium, color: colors.black }}>{label}</p>
        <code style={{ fontSize: 12, color: colors.darkBlue, fontFamily: 'monospace' }}>{spec}</code>
      </div>
      <div style={{ border: `1px solid ${colors.border}`, borderRadius: 6, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ComponentGallery() {
  const [yesNoA, setYesNoA] = useState<boolean | null>(null);
  const [yesNoB, setYesNoB] = useState<boolean | null>(true);
  const [yesNoC, setYesNoC] = useState<boolean | null>(false);

  return (
    <div style={{ maxWidth: 860 }}>

      {/* Page header */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 26, fontWeight: fontWeight.semibold, color: colors.black, marginBottom: 8 }}>
          Design System
        </h1>
        <p style={{ fontSize: fontSize.body, color: colors.gray, lineHeight: 1.6 }}>
          Tokens live in <code style={{ fontSize: '0.9em', color: colors.darkBlue }}>styles/tokens.ts</code>.
          Components are imported from <code style={{ fontSize: '0.9em', color: colors.darkBlue }}>components/ui</code>.
        </p>
      </div>

      <hr style={{ border: 'none', borderTop: `1px solid ${colors.border}`, marginBottom: 40 }} />

      {/* ── Colors ───────────────────────────────────────────────── */}
      <TokenSection name="Colors">
        <SwatchGroup title="Neutrals" swatches={[
          { token: 'colors.black',       hex: '#111827', usage: 'Primary text, active states, headings' },
          { token: 'colors.gray',        hex: '#596887', usage: 'Labels, subtext, icons, units' },
          { token: 'colors.border',      hex: '#EEEEEE', usage: 'Panel borders, section dividers', light: true },
          { token: 'colors.inputBorder', hex: '#D1D5DB', usage: 'Yes/No toggle buttons — unselected border', light: true },
        ]} />
        <SwatchGroup title="Green — safe / rule-out" swatches={[
          { token: 'colors.green',       hex: '#166534', usage: 'Text and icons for safe states, rule-out results' },
          { token: 'colors.lightGreen',  hex: '#F0FDF4', usage: 'Background for green badges and result cards', light: true },
        ]} />
        <SwatchGroup title="Red — alert / danger" swatches={[
          { token: 'colors.red',         hex: '#991B1B', usage: 'Abnormal vitals, alert labels, active checklist items' },
          { token: 'colors.lightRed',    hex: '#FFF5F3', usage: 'Background for red badges and result cards', light: true },
        ]} />
        <SwatchGroup title="Orange — caution" swatches={[
          { token: 'colors.orange',      hex: '#D97706', usage: 'Caution states (shock index > 0.7, eGFR caution)' },
          { token: 'colors.lightOrange', hex: '#FEF6F0', usage: 'Background for caution badges', light: true },
        ]} />
        <SwatchGroup title="Blue — buttons / tags" swatches={[
          { token: 'colors.darkBlue',    hex: '#375292', usage: 'Button text, border, selected toggle state' },
          { token: 'colors.lightBlue',   hex: '#EFF6FF', usage: 'Button and tag background, selected toggle fill', light: true },
        ]} />
      </TokenSection>

      {/* ── Typography ───────────────────────────────────────────── */}
      <TokenSection name="Typography">
        <p style={{ fontSize: fontSize.label, color: colors.gray, marginBottom: 16 }}>
          Font family: <strong style={{ color: colors.black, fontWeight: fontWeight.medium }}>IBM Plex Sans</strong> — applied globally via{' '}
          <code style={{ fontSize: '0.9em', color: colors.darkBlue }}>fontFamily: "'IBM Plex Sans', sans-serif"</code>.
        </p>
        <TypeSample role="Large numbers"          token="fontSize.display" size={24} weight={400} color={colors.black} sample="102" />
        <TypeSample role="Section header"         token="fontSize.label"   size={14} weight={400} color={colors.gray}  sample="VITAL STABILITY" uppercase />
        <TypeSample role="List item"              token="fontSize.label"   size={14} weight={400} color={colors.black} sample="Prior PE Diagnosis" />
        <TypeSample role="Alert label"            token="fontSize.label"   size={14} weight={600} color={colors.red}   sample="TACHYCARDIA" uppercase />
        <TypeSample role="Badge text"             token="—"                size={12} weight={400} color={colors.green} sample="Safe" />
        <TypeSample role="Label / subtext / unit" token="fontSize.label"   size={14} weight={400} color={colors.gray}  sample="03/12/2021" />
      </TokenSection>

      {/* ── Spacing ──────────────────────────────────────────────── */}
      <TokenSection name="Spacing">
        <SpacingExample label="Section padding + title → items gap" spec="padding: 24px · marginBottom: 24px">
          <div style={{ padding: 24 }}>
            <SectionHeader icon={<Heart size={14} color={colors.gray} />} label="VITAL STABILITY" />
            <div style={{ marginTop: 24 }}>
              <ListItem label="Prior PE Diagnosis" alertState="active" detail="03/12/2021" />
            </div>
          </div>
        </SpacingExample>

        <SpacingExample label="Between list items" spec="gap: 16px">
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <ListItem label="Prior PE Diagnosis"               alertState="active"   detail="03/12/2021" />
              <ListItem label="No cancer in the last 6 months"   alertState="inactive" />
              <ListItem label="No surgeries in the last 4 weeks" alertState="inactive" />
            </div>
          </div>
        </SpacingExample>

        <SpacingExample label="Patient header padding" spec="padding: 24px">
          <div style={{ padding: 24, borderBottom: `1px solid ${colors.border}` }}>
            <PatientBar name="Barnes, Richard" ageSex="52M" chiefComplaint="Left calf cramping × 3 days, mild SOB today" />
          </div>
        </SpacingExample>
      </TokenSection>

      <hr style={{ border: 'none', borderTop: `1px solid ${colors.border}`, marginBottom: 40 }} />

      {/* ── UI Components ────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: fontWeight.semibold, color: colors.black }}>UI Components</h2>
      </div>

      {/* PatientBar */}
      <ComponentSection name="PatientBar" path="import { PatientBar } from '../ui'">
        <Variant label="Default">
          <PatientBar
            name="Barnes, Richard"
            ageSex="52M"
            chiefComplaint="Left calf cramping × 3 days, mild SOB today"
          />
        </Variant>
      </ComponentSection>

      {/* SectionHeader */}
      <ComponentSection name="SectionHeader" path="import { SectionHeader } from '../ui'">
        <Variant label="Floating title — 14px regular gray all-caps · icon size={14} gray · gap 4px · no background or border">
          <div style={{ padding: 24 }}>
            <SectionHeader icon={<Heart size={14} color={colors.gray} />} label="VITAL STABILITY" />
            <div style={{ marginTop: 24 }}>
              <SectionHeader icon={<ClipboardList size={14} color={colors.gray} />} label="Previous Diagnoses Checklist" />
            </div>
          </div>
        </Variant>
      </ComponentSection>

      {/* VitalSign */}
      <ComponentSection name="VitalSign" path="import { VitalSign } from '../ui'">
        <Variant label="Normal — value in black, no alert">
          <Row gap={40}>
            <VitalSign icon={<Heart size={14} color={colors.gray} />}    label="HR"   value="72"     unit="bpm"  />
            <VitalSign icon={<Activity size={14} color={colors.gray} />} label="BP"   value="118/76" unit="mmHg" />
            <VitalSign icon={<Wind size={14} color={colors.gray} />}     label="RR"   value="16"     unit="/min" />
            <VitalSign icon={<Droplets size={14} color={colors.gray} />} label="SPO2" value="98%"    suffix="[RA]" />
          </Row>
        </Variant>
        <Variant label="Alert — value stays black, alert label renders in red below">
          <Row gap={40}>
            <VitalSign icon={<Heart size={14} color={colors.gray} />}    label="HR"   value="118"   unit="bpm"  alertLabel="TACHYCARDIA" />
            <VitalSign icon={<Activity size={14} color={colors.gray} />} label="BP"   value="84/52" unit="mmHg" alertLabel="HYPOTENSION" />
            <VitalSign icon={<Droplets size={14} color={colors.gray} />} label="SPO2" value="91%"   suffix="[NRB]" alertLabel="HYPOXIA" />
          </Row>
        </Variant>
      </ComponentSection>

      {/* Badge */}
      <ComponentSection name="Badge" path="import { Badge } from '../ui'">
        <Variant label="Semantic variants">
          <Row>
            <Badge label="Safe"     variant="safe"    />
            <Badge label="Caution"  variant="caution" />
            <Badge label="Impaired" variant="danger"  />
            <Badge label="Allergy"  variant="danger"  />
            <Badge label="D-Dimer"  variant="blue"    />
          </Row>
        </Variant>
      </ComponentSection>

      {/* ListItem */}
      <ComponentSection name="ListItem" path="import { ListItem } from '../ui'">
        <Variant label="Plain — label + detail subtext">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ListItem label="Warfarin" detail="5mg 2×/day" />
            <ListItem label="CTPA on Jan 12, 2023" detail="No acute PE identified. No filling defect in main, lobar, or segmental pulmonary arteries." />
          </div>
        </Variant>
        <Variant label="Alert dot — active (red) and inactive (gray)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ListItem label="Prior PE Diagnosis"               alertState="active"   detail="03/12/2021" />
            <ListItem label="Cancer (last 6 months)"           alertState="active"   />
            <ListItem label="No surgeries in the last 4 weeks" alertState="inactive" />
            <ListItem label="Not currently pregnant"           alertState="inactive" />
          </div>
        </Variant>
        <Variant label="With badge — label + inline badge + detail below">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ListItem label="eGFR"            badge={<Badge label="Safe"    variant="safe"    />} detail="92 · Normal kidney function" />
            <ListItem label="eGFR"            badge={<Badge label="Caution" variant="caution" />} detail="48 · Mild-moderate decrease" />
            <ListItem label="Contrast Allergy" badge={<Badge label="Allergy" variant="danger"  />} detail="Allergy documented" />
          </div>
        </Variant>
      </ComponentSection>

      {/* YesNoToggle */}
      <ComponentSection name="YesNoToggle" path="import { YesNoToggle } from '../ui'"
        specs={[
          'Selected: medium (500) · darkBlue text · lightBlue bg · darkBlue border',
          'Unselected: regular (400) · gray text · white bg · inputBorder (#D1D5DB)',
        ]}
      >
        <Variant label="Interactive — click to toggle">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 400 }}>
            <div>
              <p style={{ fontSize: fontSize.label, color: colors.black, fontWeight: fontWeight.medium, marginBottom: 10 }}>
                Clinical DVT?
              </p>
              <YesNoToggle value={yesNoA} onChange={setYesNoA} />
            </div>
            <div>
              <p style={{ fontSize: fontSize.label, color: colors.black, fontWeight: fontWeight.medium, marginBottom: 10 }}>
                Hemoptysis?
              </p>
              <YesNoToggle value={yesNoB} onChange={setYesNoB} />
            </div>
            <div>
              <p style={{ fontSize: fontSize.label, color: colors.black, fontWeight: fontWeight.medium, marginBottom: 10 }}>
                PE is most likely diagnosis?
              </p>
              <YesNoToggle value={yesNoC} onChange={setYesNoC} />
            </div>
          </div>
        </Variant>
      </ComponentSection>

      {/* PageTitle */}
      <ComponentSection name="PageTitle" path="import { PageTitle } from '../ui'">
        <Variant label="Title only">
          <PageTitle title="YEARS Algorithm Calculator" />
        </Variant>
        <Variant label="Title + subtitle">
          <PageTitle
            title="YEARS can rule out PE if no additional factors are present."
            subtitle="MDM will be generated based on chart data and YEARS."
          />
        </Variant>
      </ComponentSection>

      {/* AlertCard */}
      <ComponentSection name="AlertCard" path="import { AlertCard } from '../ui'">
        <Variant label="Success — rule-out">
          <AlertCard
            variant="success"
            title="PE can be ruled out."
            body="D-Dimer 760 ng/mL is below the YEARS threshold of 1000 with no YEARS clinical factors present. PE is ruled out with a 0.43% VTE risk at 3-month follow-up."
            action={{ label: 'Copy MDM', onClick: () => {} }}
          />
        </Variant>
        <Variant label="Danger — cannot rule out">
          <AlertCard
            variant="danger"
            title="PE cannot be ruled out. CTPA is recommended."
            body="D-Dimer 512 ng/mL exceeds the YEARS threshold of 500 when ≥ 1 clinical factors are present. CTPA is recommended."
            action={{ label: 'Copy MDM', onClick: () => {} }}
          />
        </Variant>
      </ComponentSection>

      {/* Button */}
      <ComponentSection name="Button" path="import { Button } from '../ui'">
        <Variant label="Variants">
          <Row>
            <Button label="Copy MDM"     variant="primary" icon={<ClipboardCopy size={14} />} />
            <Button label="View D-Dimer" variant="blue"    />
            <Button label="Disabled"     variant="primary" disabled />
          </Row>
        </Variant>
      </ComponentSection>

      {/* Card */}
      <ComponentSection name="Card" path="import { Card } from '../ui'">
        <Variant label="Single card — border: 1px solid #EEEEEE · borderRadius: 8px · overflow: hidden · background: white">
          <Card>
            <div style={{ padding: 24 }}>
              <SectionHeader icon={<Heart size={14} color={colors.gray} />} label="VITAL STABILITY" />
              <div style={{ marginTop: 24, display: 'flex', gap: 40 }}>
                <VitalSign icon={<Heart size={14} color={colors.gray} />}    label="HR"   value="72"     unit="bpm"  />
                <VitalSign icon={<Activity size={14} color={colors.gray} />} label="BP"   value="118/76" unit="mmHg" />
                <VitalSign icon={<Wind size={14} color={colors.gray} />}     label="RR"   value="16"     unit="/min" />
              </div>
            </div>
          </Card>
        </Variant>
        <Variant label="Card grid — gap: 4px between cards">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Card style={{ padding: 24 }}>
              <SectionHeader icon={<Heart size={14} color={colors.gray} />} label="VITAL STABILITY" />
            </Card>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              <Card style={{ padding: 24 }}>
                <SectionHeader icon={<ClipboardList size={14} color={colors.gray} />} label="PREVIOUS DIAGNOSES" />
              </Card>
              <Card style={{ padding: 24 }}>
                <SectionHeader icon={<Activity size={14} color={colors.gray} />} label="HEMODYNAMIC STRESS" />
              </Card>
            </div>
          </div>
        </Variant>
      </ComponentSection>

    </div>
  );
}
