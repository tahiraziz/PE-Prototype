/**
 * Clinical Dashboard Layout
 * Matches the PE Dashboard mockup exactly.
 *
 * Design system:
 *   Black  #111827 · Gray   #596887 · Border #E3ECFF
 *   Green  #166534 · LtGrn  #F0FDF4
 *   Red    #991B1B · LtRed  #FFF5F3
 *   Orange #D97706 · LtOrng #FEF6F0
 *
 * Typography:
 *   Labels / subtext  : 14px regular  gray
 *   Section headers   : 16px semibold black
 *   List items        : 16px regular  black
 *   Page title        : 20px medium   black
 *   Large numbers     : 24px semibold black (always black; alert labels carry color)
 */

import { useState, useEffect } from 'react';
import {
  Activity,
  Heart,
  Wind,
  Thermometer,
  Droplets,
  ClipboardList,
  Pill,
  Monitor,
  ShieldAlert,
} from 'lucide-react';
import {
  TEACHING_CASES,
  DEFAULT_CASE,
  type TeachingCase,
  calculateHemodynamics,
} from '../data/demoData';
import YearsCalculatorModal from './YearsCalculatorModal';
import { colors, fontSize, fontWeight } from '../styles/tokens';

// ===========================================================================
// Local aliases for brevity
// ===========================================================================

const BLACK  = colors.black;
const GRAY   = colors.gray;
const BORDER = colors.border;
const GREEN  = colors.green;
const LT_GRN = colors.lightGreen;
const RED    = colors.red;
const LT_RED = colors.lightRed;
const ORANGE = colors.orange;
const LT_ORG = colors.lightOrange;

// Shared text style helpers
const labelStyle     = { color: GRAY,  fontSize: fontSize.label } as const;
const hdrStyle       = { color: GRAY, fontSize: 14, fontWeight: fontWeight.regular, textTransform: 'uppercase' as const } as const;
const listStyle      = { color: BLACK, fontSize: fontSize.label,  fontWeight: fontWeight.regular } as const;
const bigNumStyle    = { color: BLACK, fontSize: fontSize.display, fontWeight: fontWeight.regular, lineHeight: 1.1 } as const;
const sectionHdrRow  = { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 24 } as const;

// ===========================================================================
// Types
// ===========================================================================

interface DashboardLayoutProps {
  caseIndex?: number;
  hideDDimer?: boolean;
}

// ===========================================================================
// Vital Stability Section
// ===========================================================================

function VitalCell({ v, Icon }: { v: { label: string; value: string; unit: string | null; suffix: string | null; alertLabel: string | null }; Icon: React.ElementType }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
        <Icon size={14} color={GRAY} />
        <span style={labelStyle}>{v.label}</span>
      </div>
      <div style={bigNumStyle}>{v.value}</div>
      {v.suffix && <div style={labelStyle}>{v.suffix}</div>}
      {v.unit && <div style={labelStyle}>{v.unit}</div>}
      {v.alertLabel && (
        <div style={{ color: RED, fontSize: 14, fontWeight: fontWeight.semibold, textTransform: 'uppercase', marginTop: 4 }}>
          {v.alertLabel}
        </div>
      )}
    </div>
  );
}

function VitalStabilitySection({ patient, compact }: { patient: TeachingCase; compact?: boolean }) {
  const { hr, sbp, dbp, rr, spo2, o2Device, temp } = patient.vitals;

  const vitals = [
    {
      label: 'HR',
      Icon: Heart,
      value: `${hr}`,
      unit: 'bpm',
      suffix: null as string | null,
      alert: hr > 100,
      alertLabel: hr > 100 ? 'TACHYCARDIA' : null,
    },
    {
      label: 'BP',
      Icon: Activity,
      value: `${sbp}/${dbp}`,
      unit: 'mmHg',
      suffix: null as string | null,
      alert: sbp < 90,
      alertLabel: sbp < 90 ? 'HYPOTENSION' : null,
    },
    {
      label: 'SPO2',
      Icon: Droplets,
      value: `${spo2}%`,
      unit: null as string | null,
      suffix: o2Device && o2Device !== 'Room Air' ? `[${o2Device}]` : '[RA]',
      alert: spo2 < 95,
      alertLabel: spo2 < 95 ? 'HYPOXIA' : null,
    },
    {
      label: 'RR',
      Icon: Wind,
      value: `${rr}`,
      unit: '/min',
      suffix: null as string | null,
      alert: rr > 20,
      alertLabel: rr > 20 ? 'TACHYPNEA' : null,
    },
    {
      label: 'TEMP',
      Icon: Thermometer,
      value: `${temp.toFixed(1)}`,
      unit: '°C',
      suffix: null as string | null,
      alert: temp > 38,
      alertLabel: temp > 38 ? 'FEBRILE' : null,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Section header */}
      <div style={sectionHdrRow}>
        <Heart size={14} color={GRAY} />
        <span style={hdrStyle}>Vital Stability</span>
      </div>

      {/* Five vitals */}
      {compact ? (
        // Small layout: HR + BP on row 1, SPO2 + RR + TEMP on row 2
        <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 24 }}>
            {vitals.slice(0, 2).map((v) => { const { Icon } = v; return <VitalCell key={v.label} v={v} Icon={Icon} />; })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 16 }}>
            {vitals.slice(2).map((v) => { const { Icon } = v; return <VitalCell key={v.label} v={v} Icon={Icon} />; })}
          </div>
        </div>
      ) : (
        // Default: all five in one row
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', columnGap: 40 }}>
          {vitals.map((v) => { const { Icon } = v; return <VitalCell key={v.label} v={v} Icon={Icon} />; })}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Hemodynamic Stress Section
// ===========================================================================

function HemodynamicStressSection({ patient }: { patient: TeachingCase }) {
  const { shockIndex, map } = calculateHemodynamics(patient.vitals);

  const siStatus =
    shockIndex !== null && shockIndex > 0.9 ? 'danger'
    : shockIndex !== null && shockIndex > 0.7 ? 'caution'
    : 'safe';

  return (
    <div style={{ padding: 24 }}>
      {/* Section header */}
      <div style={sectionHdrRow}>
        <Activity size={14} color={GRAY} />
        <span style={hdrStyle}>Hemodynamic Stress</span>
      </div>

      {/* MAP | SHOCK INDEX */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
        {/* MAP */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ ...labelStyle, marginBottom: 4 }}>MAP</div>
          <div style={bigNumStyle}>{map}</div>
          <div style={labelStyle}>mmHg</div>
          <div style={labelStyle}>(SBP+2×DBP)/3</div>
        </div>

        {/* SHOCK INDEX */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ ...labelStyle, marginBottom: 4 }}>SHOCK INDEX</div>
          <div style={bigNumStyle}>
            {shockIndex?.toFixed(2) ?? '—'}
          </div>
          <div style={labelStyle}>HR / SBP</div>
          {siStatus === 'caution' && (
            <div style={{ color: ORANGE, fontSize: 14, fontWeight: fontWeight.semibold, marginTop: 4, textTransform: 'uppercase' }}>&gt; 0.7 CAUTION</div>
          )}
          {siStatus === 'danger' && (
            <div style={{ color: RED, fontSize: 14, fontWeight: fontWeight.semibold, marginTop: 4, textTransform: 'uppercase' }}>&gt; 0.9 RISK</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Previous Diagnoses Checklist
// ===========================================================================

function PreviousDiagnosesChecklist({ patient }: { patient: TeachingCase }) {
  const hasCancer = patient.activeProblems.some((p) =>
    /cancer|malignancy|chemotherapy|tumor/i.test(p)
  );
  const isPregnant = patient.activeProblems.some((p) =>
    /pregnancy|pregnant|gestational/i.test(p)
  );

  // Each item: activeLabel shown in red with dot + subtext when active;
  // inactiveLabel shown in black with no dot and no subtext when inactive.
  const items: Array<{ activeLabel: string; inactiveLabel: string; active: boolean; subtext: string | null }> = [
    {
      activeLabel: 'Prior PE Diagnosis',
      inactiveLabel: 'No prior PE diagnosis',
      active: patient.hasPriorVTE,
      subtext: patient.hasPriorVTE ? (patient.priorPEDate ?? null) : null,
    },
    {
      activeLabel: 'Cancer (last 6 months)',
      inactiveLabel: 'No cancer in the last 6 months',
      active: hasCancer,
      subtext: null,
    },
    {
      activeLabel: 'Surgeries (last 4 weeks)',
      inactiveLabel: 'No surgeries in the last 4 weeks',
      active: patient.hasRecentSurgery,
      subtext: null,
    },
    {
      activeLabel: 'Immobilizations in the last 3 days',
      inactiveLabel: 'No immobilizations in the last 3 days',
      active: !!patient.recentImmobilization,
      subtext: patient.recentImmobilization
        ? `${patient.recentImmobilization.date} · ${patient.recentImmobilization.description}`
        : null,
    },
    {
      activeLabel: 'Prior Thrombophilia',
      inactiveLabel: 'No prior Thrombophilia',
      active: patient.priorThrombophilia ?? false,
      subtext: null,
    },
    {
      activeLabel: 'Currently pregnant',
      inactiveLabel: 'Not currently pregnant',
      active: isPregnant,
      subtext: null,
    },
    {
      activeLabel: 'Currently on estrogen',
      inactiveLabel: 'Not currently on estrogen',
      active: patient.usesEstrogen,
      subtext: null,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={sectionHdrRow}>
        <ClipboardList size={14} color={GRAY} />
        <span style={hdrStyle}>Previous Diagnoses Checklist</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {items.map((item) => (
          <div key={item.activeLabel}>
            {/* Name row: dot + red label when active, gray label when not */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flexShrink: 0, width: 10 }}>
                {item.active && (
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: RED }} />
                )}
              </div>
              <div style={{ ...listStyle, color: item.active ? RED : GRAY, fontWeight: item.active ? fontWeight.medium : fontWeight.regular }}>
                {item.active ? item.activeLabel : item.inactiveLabel}
              </div>
            </div>
            {/* Subtext only when active and there's something to show */}
            {item.active && item.subtext && (
              <div style={{ ...labelStyle, marginLeft: 18 }}>{item.subtext}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===========================================================================
// Anticoagulants Section
// ===========================================================================

function AnticoagulantsSection({ patient }: { patient: TeachingCase }) {
  const anticoags = patient.medications.filter((m) => m.category === 'Anticoagulant');

  return (
    <div style={{ padding: 24 }}>
      <div style={sectionHdrRow}>
        <Pill size={14} color={GRAY} />
        <span style={hdrStyle}>Anticoagulants</span>
      </div>
      {anticoags.length === 0 ? (
        <div style={labelStyle}>None on file</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {anticoags.map((med, i) => (
            <div key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flexShrink: 0, width: 10, height: 10, borderRadius: '50%', backgroundColor: GREEN }} />
                <div style={{ ...listStyle, color: GREEN, fontWeight: fontWeight.medium }}>{med.name}</div>
              </div>
              <div style={{ ...labelStyle, marginLeft: 18 }}>{med.dose}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Prior CTPAs Section
// ===========================================================================

function formatImagingDate(dateStr: string): string {
  // Parse yyyy-mm-dd directly to avoid UTC→local timezone shift
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function PriorCTPAsSection({ patient }: { patient: TeachingCase }) {
  const imaging = patient.priorImaging;

  const resultColors: Record<string, { color: string; bg: string }> = {
    Positive:      { color: RED,    bg: LT_RED },
    Negative:      { color: GREEN,  bg: LT_GRN },
    Indeterminate: { color: ORANGE, bg: LT_ORG },
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={sectionHdrRow}>
        <Monitor size={14} color={GRAY} />
        <span style={hdrStyle}>Prior CTPAs</span>
      </div>
      {!imaging ? (
        <div style={labelStyle}>None on file</div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={listStyle}>CTPA on {formatImagingDate(imaging.date)}</span>
            <span
              style={{
                color: resultColors[imaging.result]?.color ?? GRAY,
                backgroundColor: resultColors[imaging.result]?.bg ?? 'transparent',
                fontSize: 12,
                fontWeight: fontWeight.regular,
                padding: '2px 8px',
                borderRadius: 4,
              }}
            >
              {imaging.result}
            </span>
          </div>
          <div style={labelStyle}>{imaging.reportSummary}</div>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// CTPA Safety Barriers Section
// ===========================================================================

function CTPASafetyBarriersSection({ patient }: { patient: TeachingCase }) {
  const { egfr, hasContrastAllergy, totalRadiationExposureMSV } = patient;

  const renalSafe    = egfr >= 60;
  const renalCaution = egfr >= 30 && egfr < 60;

  const egfrDescription =
    egfr >= 90 ? 'Normal kidney function' :
    egfr >= 60 ? 'Mildly decreased function' :
    egfr >= 45 ? 'Mild-moderate decrease' :
    egfr >= 30 ? 'Moderate-severe decrease' :
    egfr >= 15 ? 'Severely decreased' :
                 'Kidney failure';

  const radUnsafe  = totalRadiationExposureMSV !== undefined && totalRadiationExposureMSV > 100;
  const radCaution = totalRadiationExposureMSV !== undefined && totalRadiationExposureMSV > 50 && !radUnsafe;

  const badge = (label: string, color: string, bg: string) => (
    <span style={{ color, backgroundColor: bg, fontSize: 12, fontWeight: fontWeight.regular, padding: '2px 8px', borderRadius: 4 }}>
      {label}
    </span>
  );

  return (
    <div style={{ padding: 24 }}>
      <div style={sectionHdrRow}>
        <ShieldAlert size={14} color={GRAY} />
        <span style={hdrStyle}>CTPA Safety Barriers</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* eGFR */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={listStyle}>eGFR</span>
            {badge(
              renalSafe ? 'Safe' : renalCaution ? 'Caution' : 'Impaired',
              renalSafe ? GREEN  : renalCaution ? ORANGE    : RED,
              renalSafe ? LT_GRN : renalCaution ? LT_ORG   : LT_RED,
            )}
          </div>
          <div style={{ ...labelStyle, marginTop: 0 }}>{egfr} · {egfrDescription}</div>
        </div>

        {/* Contrast Allergy */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={listStyle}>Contrast Allergy</span>
            {badge(
              hasContrastAllergy ? 'Allergy' : 'None',
              hasContrastAllergy ? RED       : GREEN,
              hasContrastAllergy ? LT_RED    : LT_GRN,
            )}
          </div>
          <div style={{ ...labelStyle, marginTop: 0 }}>
            {hasContrastAllergy ? 'Allergy documented' : 'No known allergy'}
          </div>
        </div>

        {/* Total Radiation Exposure */}
        {totalRadiationExposureMSV !== undefined && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={listStyle}>Total Radiation Exposure</span>
              {badge(
                radUnsafe ? 'Unsafe' : radCaution ? 'Caution' : 'Safe',
                radUnsafe ? RED      : radCaution ? ORANGE    : GREEN,
                radUnsafe ? LT_RED   : radCaution ? LT_ORG    : LT_GRN,
              )}
            </div>
            <div style={{ ...labelStyle, marginTop: 0 }}>{totalRadiationExposureMSV} mSv in the last 4 weeks</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// Main Component
// ===========================================================================

const DDIMER_BUTTON_CASES: Record<number, 'case1' | 'case4'> = {
  11: 'case1',
  0:  'case4',
};

export default function DashboardLayout({ caseIndex = 0, hideDDimer = false }: DashboardLayoutProps) {
  const patient = TEACHING_CASES[caseIndex] || DEFAULT_CASE;
  const [showYearsModal, setShowYearsModal] = useState(false);
  const ddimerModalCase = DDIMER_BUTTON_CASES[caseIndex];
  const [isNarrow, setIsNarrow] = useState(window.innerWidth < 950);
  const [isCompact, setIsCompact] = useState(window.innerWidth <= 620);

  useEffect(() => {
    const handler = () => {
      setIsNarrow(window.innerWidth < 950);
      setIsCompact(window.innerWidth <= 620);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const cardStyle = {
    backgroundColor: '#fff',
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    overflow: 'hidden',
  } as const;

  // Shared patient header content
  const patientHeader = (
    <div style={{ display: 'flex', gap: 40 }}>
      <div>
        <div style={labelStyle}>Patient</div>
        <div style={listStyle}>{patient.name} · {patient.age}{patient.gender === 'Male' ? 'M' : 'F'}</div>
      </div>
      <div>
        <div style={labelStyle}>Chief Complaint</div>
        <div style={listStyle}>{patient.chiefComplaint}</div>
      </div>
    </div>
  );

  // Shared D-Dimer button
  const ddimerButton = ddimerModalCase && !hideDDimer && (
    <button
      onClick={() => setShowYearsModal(true)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 16px', fontSize: 14, fontWeight: 500,
        color: '#375292', backgroundColor: '#eff6ff',
        border: '1px solid #375292', borderRadius: 6, cursor: 'pointer',
      }}
    >
      View D-Dimer Result
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Patient header card */}
      <div style={{ ...cardStyle, padding: 24 }}>
        {patientHeader}
      </div>

      {/* Vitals card */}
      <div style={cardStyle}>
        <VitalStabilitySection patient={patient} compact={isCompact} />
      </div>

      {/* Section cards */}
      {isCompact ? (
        <>
          <div style={cardStyle}><HemodynamicStressSection patient={patient} /></div>
          <div style={cardStyle}><PreviousDiagnosesChecklist patient={patient} /></div>
          <div style={cardStyle}><AnticoagulantsSection patient={patient} /></div>
          <div style={cardStyle}><PriorCTPAsSection patient={patient} /></div>
          <div style={cardStyle}><CTPASafetyBarriersSection patient={patient} /></div>
        </>
      ) : isNarrow ? (
        <>
          <div style={cardStyle}><HemodynamicStressSection patient={patient} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <div style={cardStyle}><PreviousDiagnosesChecklist patient={patient} /></div>
            <div style={cardStyle}><AnticoagulantsSection patient={patient} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <div style={cardStyle}><PriorCTPAsSection patient={patient} /></div>
            <div style={cardStyle}><CTPASafetyBarriersSection patient={patient} /></div>
          </div>
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 4 }}>
          <div style={cardStyle}><PreviousDiagnosesChecklist patient={patient} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <div style={cardStyle}><HemodynamicStressSection patient={patient} /></div>
            <div style={cardStyle}><PriorCTPAsSection patient={patient} /></div>
            <div style={cardStyle}><AnticoagulantsSection patient={patient} /></div>
            <div style={cardStyle}><CTPASafetyBarriersSection patient={patient} /></div>
          </div>
        </div>
      )}

      {/* D-Dimer button */}
      {ddimerModalCase && !hideDDimer && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0 8px' }}>
          {ddimerButton}
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '8px 16px', textAlign: 'center' }}>
        <span style={{ ...labelStyle, fontSize: 11, letterSpacing: '0.06em' }}>
          LUMINUR PE CALCULATOR · DATA AGGREGATION TOOL · NOT A DIAGNOSTIC DEVICE
        </span>
      </div>

      {/* YEARS Calculator Modal */}
      {showYearsModal && ddimerModalCase && (
        <YearsCalculatorModal
          initialCase={ddimerModalCase}
          onClose={() => setShowYearsModal(false)}
        />
      )}
    </div>
  );
}
