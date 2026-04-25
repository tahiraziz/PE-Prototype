import { useState, useEffect, useCallback } from 'react';
import { Pencil, Check, X, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { colors, fontSize, fontWeight } from '../../styles/tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VitalRow    { id: string; vital: string; unit: string; condition: string; alertLabel: string; alertColor: string; }
interface ShockState  { id: string; condition: string; status: string; valueColor: string; labelText: string; labelColor: string; }
interface DiagnosisItem { id: string; activeLabel: string; inactiveLabel: string; activeSubtext: string; detectionCondition: string; }
interface BadgeState  { id: string; condition: string; badgeLabel: string; textColor: string; background: string; }
interface EgfrDesc    { id: string; range: string; description: string; }
interface AllergyDesc { id: string; value: string; description: string; }
interface YearsThreshold { id: string; score: string; threshold: string; }
interface YearsResult { id: string; condition: string; result: string; background: string; textColor: string; icon: string; }

interface CTData {
  lastUpdated: string;
  vitalStability: { vitals: VitalRow[]; notes: string[]; };
  hemodynamicStress: { mapFormula: string; mapColor: string; shockIndexFormula: string; shockStates: ShockState[]; };
  previousDiagnoses: { items: DiagnosisItem[]; };
  priorCtpas: { badgeStates: BadgeState[]; notes: string[]; };
  ctpaSafety: {
    egfr: { badgeStates: BadgeState[]; descriptions: EgfrDesc[]; };
    contrastAllergy: { badgeStates: BadgeState[]; descriptions: AllergyDesc[]; };
    radiation: { badgeStates: BadgeState[]; };
  };
  years: { factors: string[]; thresholds: YearsThreshold[]; results: YearsResult[]; barChartNotes: string[]; };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid() { return Math.random().toString(36).slice(2, 10); }

const HEX_TO_TOKEN: Record<string, string> = {
  '#111827': 'colors.black',
  '#596887': 'colors.gray',
  '#EEEEEE': 'colors.border',
  '#166534': 'colors.green',
  '#F0FDF4': 'colors.lightGreen',
  '#991B1B': 'colors.red',
  '#FFF5F3': 'colors.lightRed',
  '#D97706': 'colors.orange',
  '#FEF6F0': 'colors.lightOrange',
  '#EFF6FF': 'colors.lightBlue',
  '#375292': 'colors.darkBlue',
  '#D1D5DB': 'colors.inputBorder',
};

function tokenName(hex: string) {
  return HEX_TO_TOKEN[hex.toUpperCase()] ?? HEX_TO_TOKEN[hex] ?? null;
}

function ColorChip({ hex }: { hex: string }) {
  if (!hex) return null;
  const token = tokenName(hex);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, verticalAlign: 'middle' }}>
      <span style={{
        display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
        backgroundColor: hex, border: '1px solid rgba(0,0,0,0.15)', flexShrink: 0,
      }} />
      <code style={{ fontSize: 12, fontFamily: 'monospace', color: colors.darkBlue,
        backgroundColor: '#F1F5F9', border: `1px solid #E2E8F0`, borderRadius: 3, padding: '0 4px' }}>
        {token ?? hex}
      </code>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Style atoms
// ---------------------------------------------------------------------------

const S = {
  section: { marginBottom: 40 } as React.CSSProperties,

  sectionTitle: {
    fontSize: fontSize.body, fontWeight: fontWeight.semibold, color: colors.black,
    marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${colors.border}`,
  } as React.CSSProperties,

  subTitle: {
    fontSize: fontSize.label, fontWeight: fontWeight.semibold, color: colors.gray,
    textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 8,
  },

  th: {
    padding: '7px 10px', fontSize: 11, fontWeight: fontWeight.semibold,
    color: colors.gray, textTransform: 'uppercase' as const,
    letterSpacing: '0.04em', textAlign: 'left' as const,
    borderBottom: `2px solid ${colors.border}`, whiteSpace: 'nowrap' as const,
    backgroundColor: '#F8FAFC',
  },

  td: {
    padding: '8px 10px', fontSize: fontSize.label, color: colors.black,
    verticalAlign: 'top' as const, borderBottom: `1px solid ${colors.border}`,
  },

  input: {
    fontSize: fontSize.label, color: colors.black, fontFamily: 'inherit',
    border: `1px solid ${colors.border}`, borderRadius: 4,
    padding: '3px 7px', outline: 'none', background: '#FAFAFA',
    width: '100%', boxSizing: 'border-box' as const,
  },

  addBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 12, color: colors.gray, background: 'none',
    border: `1px solid ${colors.border}`, borderRadius: 4,
    cursor: 'pointer', padding: '3px 8px', marginTop: 6,
  } as React.CSSProperties,

  removeBtn: {
    display: 'inline-flex', alignItems: 'center',
    color: colors.gray, background: 'none',
    border: `1px solid ${colors.border}`, borderRadius: 4,
    cursor: 'pointer', padding: '3px 5px', flexShrink: 0,
  } as React.CSSProperties,
};

// ---------------------------------------------------------------------------
// Reusable table wrapper
// ---------------------------------------------------------------------------

function DocTable({ columns, children }: { columns: string[]; children: React.ReactNode }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: 20 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: fontSize.label }}>
        <thead>
          <tr>{columns.map(c => <th key={c} style={S.th}>{c}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline text input for table cells
// ---------------------------------------------------------------------------

function CellInput({ value, onChange, width = '100%' }: { value: string; onChange: (v: string) => void; width?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ ...S.input, width }}
    />
  );
}

// ---------------------------------------------------------------------------
// Section: Vital Stability
// ---------------------------------------------------------------------------

function VitalStabilitySection({ data, editing, onChange }: {
  data: CTData['vitalStability']; editing: boolean;
  onChange: (v: CTData['vitalStability']) => void;
}) {
  const updateVital = (id: string, patch: Partial<VitalRow>) =>
    onChange({ ...data, vitals: data.vitals.map(v => v.id === id ? { ...v, ...patch } : v) });
  const addVital = () =>
    onChange({ ...data, vitals: [...data.vitals, { id: uid(), vital: '', unit: '', condition: '', alertLabel: '', alertColor: '#991B1B' }] });
  const removeVital = (id: string) =>
    onChange({ ...data, vitals: data.vitals.filter(v => v.id !== id) });
  const updateNote = (i: number, val: string) => {
    const notes = [...data.notes]; notes[i] = val;
    onChange({ ...data, notes });
  };

  return (
    <section style={S.section}>
      <div style={S.sectionTitle}>1. Vital Stability Section</div>
      <p style={{ fontSize: fontSize.label, color: colors.gray, marginBottom: 12 }}>
        Source: <code style={{ fontSize: 12 }}>DashboardLayout.tsx → VitalStabilitySection</code>
      </p>

      <DocTable columns={['Vital', 'Unit', 'Alert Condition', 'Alert Label', 'Alert Color', ...(editing ? [''] : [])]}>
        {data.vitals.map(v => (
          <tr key={v.id}>
            <td style={S.td}>{editing ? <CellInput value={v.vital}     onChange={val => updateVital(v.id, { vital: val })} /> : <strong>{v.vital}</strong>}</td>
            <td style={S.td}>{editing ? <CellInput value={v.unit}      onChange={val => updateVital(v.id, { unit: val })} /> : v.unit}</td>
            <td style={S.td}>{editing ? <CellInput value={v.condition} onChange={val => updateVital(v.id, { condition: val })} /> : <code style={{ fontSize: 12 }}>{v.condition}</code>}</td>
            <td style={S.td}>{editing ? <CellInput value={v.alertLabel} onChange={val => updateVital(v.id, { alertLabel: val })} /> : <code style={{ fontSize: 12 }}>{v.alertLabel}</code>}</td>
            <td style={S.td}>
              {editing
                ? <CellInput value={v.alertColor} onChange={val => updateVital(v.id, { alertColor: val })} />
                : <ColorChip hex={v.alertColor} />
              }
            </td>
            {editing && (
              <td style={S.td}>
                <button style={S.removeBtn} onClick={() => removeVital(v.id)}><Trash2 size={13} /></button>
              </td>
            )}
          </tr>
        ))}
      </DocTable>
      {editing && <button style={S.addBtn} onClick={addVital}><Plus size={12} /> Add vital</button>}

      <div style={{ marginTop: 16 }}>
        <p style={S.subTitle}>Notes</p>
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.notes.map((n, i) => (
              <div key={i} style={{ display: 'flex', gap: 8 }}>
                <span style={{ color: colors.gray, marginTop: 5 }}>•</span>
                <input type="text" value={n} onChange={e => updateNote(i, e.target.value)} style={{ ...S.input }} />
              </div>
            ))}
          </div>
        ) : (
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {data.notes.map((n, i) => <li key={i} style={{ fontSize: fontSize.label, color: colors.black, lineHeight: 1.6, marginBottom: 4 }}>{n}</li>)}
          </ul>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section: Hemodynamic Stress
// ---------------------------------------------------------------------------

function HemodynamicSection({ data, editing, onChange }: {
  data: CTData['hemodynamicStress']; editing: boolean;
  onChange: (v: CTData['hemodynamicStress']) => void;
}) {
  const updateState = (id: string, patch: Partial<ShockState>) =>
    onChange({ ...data, shockStates: data.shockStates.map(s => s.id === id ? { ...s, ...patch } : s) });

  const field = (label: string, key: keyof CTData['hemodynamicStress'], isColor = false) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <span style={{ fontSize: fontSize.label, color: colors.gray, minWidth: 140 }}>{label}</span>
      {editing
        ? <input type="text" value={data[key] as string} onChange={e => onChange({ ...data, [key]: e.target.value })} style={{ ...S.input, maxWidth: 260 }} />
        : isColor ? <ColorChip hex={data[key] as string} /> : <code style={{ fontSize: 12 }}>{data[key] as string}</code>
      }
    </div>
  );

  return (
    <section style={S.section}>
      <div style={S.sectionTitle}>2. Hemodynamic Stress Section</div>

      <p style={S.subTitle}>MAP (Mean Arterial Pressure)</p>
      {field('Formula', 'mapFormula')}
      {field('Always renders in', 'mapColor', true)}

      <p style={{ ...S.subTitle, marginTop: 20 }}>Shock Index</p>
      {field('Formula', 'shockIndexFormula')}

      <DocTable columns={['Condition', 'Status', 'Value Color', 'Label Text', 'Label Color']}>
        {data.shockStates.map(s => (
          <tr key={s.id}>
            <td style={S.td}>{editing ? <CellInput value={s.condition}  onChange={v => updateState(s.id, { condition: v })} /> : <code style={{ fontSize: 12 }}>{s.condition}</code>}</td>
            <td style={S.td}>{editing ? <CellInput value={s.status}     onChange={v => updateState(s.id, { status: v })} />    : s.status}</td>
            <td style={S.td}>{editing ? <CellInput value={s.valueColor} onChange={v => updateState(s.id, { valueColor: v })} /> : <ColorChip hex={s.valueColor} />}</td>
            <td style={S.td}>{editing ? <CellInput value={s.labelText}  onChange={v => updateState(s.id, { labelText: v })} />  : (s.labelText ? <code style={{ fontSize: 12 }}>{s.labelText}</code> : <span style={{ color: colors.gray }}>—</span>)}</td>
            <td style={S.td}>{editing ? <CellInput value={s.labelColor} onChange={v => updateState(s.id, { labelColor: v })} /> : (s.labelColor ? <ColorChip hex={s.labelColor} /> : <span style={{ color: colors.gray }}>—</span>)}</td>
          </tr>
        ))}
      </DocTable>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section: Previous Diagnoses
// ---------------------------------------------------------------------------

function PreviousDiagnosesSection({ data, editing, onChange }: {
  data: CTData['previousDiagnoses']; editing: boolean;
  onChange: (v: CTData['previousDiagnoses']) => void;
}) {
  const update = (id: string, patch: Partial<DiagnosisItem>) =>
    onChange({ items: data.items.map(d => d.id === id ? { ...d, ...patch } : d) });
  const add = () =>
    onChange({ items: [...data.items, { id: uid(), activeLabel: '', inactiveLabel: '', activeSubtext: '', detectionCondition: '' }] });
  const remove = (id: string) =>
    onChange({ items: data.items.filter(d => d.id !== id) });

  return (
    <section style={S.section}>
      <div style={S.sectionTitle}>3. Previous Diagnoses Checklist</div>

      <DocTable columns={['#', 'Active Label', 'Inactive Label', 'Active Subtext', 'Detection Logic', ...(editing ? [''] : [])]}>
        {data.items.map((d, i) => (
          <tr key={d.id}>
            <td style={{ ...S.td, color: colors.gray, width: 28 }}>{i + 1}</td>
            <td style={S.td}>{editing ? <CellInput value={d.activeLabel}   onChange={v => update(d.id, { activeLabel: v })} />   : <strong style={{ color: colors.red }}>{d.activeLabel}</strong>}</td>
            <td style={S.td}>{editing ? <CellInput value={d.inactiveLabel} onChange={v => update(d.id, { inactiveLabel: v })} /> : d.inactiveLabel}</td>
            <td style={S.td}>{editing ? <CellInput value={d.activeSubtext} onChange={v => update(d.id, { activeSubtext: v })} /> : (d.activeSubtext ? <span style={{ color: colors.gray }}>{d.activeSubtext}</span> : <span style={{ color: colors.gray }}>—</span>)}</td>
            <td style={S.td}>{editing ? <CellInput value={d.detectionCondition} onChange={v => update(d.id, { detectionCondition: v })} /> : <code style={{ fontSize: 11 }}>{d.detectionCondition}</code>}</td>
            {editing && <td style={S.td}><button style={S.removeBtn} onClick={() => remove(d.id)}><Trash2 size={13} /></button></td>}
          </tr>
        ))}
      </DocTable>
      {editing && <button style={S.addBtn} onClick={add}><Plus size={12} /> Add item</button>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section: Prior CTPAs
// ---------------------------------------------------------------------------

function PriorCTPAsSection({ data, editing, onChange }: {
  data: CTData['priorCtpas']; editing: boolean;
  onChange: (v: CTData['priorCtpas']) => void;
}) {
  const updateBadge = (id: string, patch: Partial<BadgeState>) =>
    onChange({ ...data, badgeStates: data.badgeStates.map(s => s.id === id ? { ...s, ...patch } : s) });
  const updateNote = (i: number, val: string) => {
    const notes = [...data.notes]; notes[i] = val;
    onChange({ ...data, notes });
  };

  return (
    <section style={S.section}>
      <div style={S.sectionTitle}>4. Prior CTPAs Section</div>
      <p style={{ fontSize: fontSize.label, color: colors.gray, marginBottom: 12 }}>
        Source: <code style={{ fontSize: 12 }}>DashboardLayout.tsx → PriorCTPAsSection</code>
      </p>

      <p style={S.subTitle}>Result Badge States</p>
      <DocTable columns={['Result', 'Badge Label', 'Text Color', 'Background']}>
        {data.badgeStates.map(s => (
          <tr key={s.id}>
            <td style={S.td}>{editing ? <CellInput value={s.condition}  onChange={v => updateBadge(s.id, { condition: v })} /> : <code style={{ fontSize: 12 }}>{s.condition}</code>}</td>
            <td style={S.td}>{editing ? <CellInput value={s.badgeLabel} onChange={v => updateBadge(s.id, { badgeLabel: v })} /> : <code style={{ fontSize: 12 }}>{s.badgeLabel}</code>}</td>
            <td style={S.td}>{editing ? <CellInput value={s.textColor}  onChange={v => updateBadge(s.id, { textColor: v })} />  : <ColorChip hex={s.textColor} />}</td>
            <td style={S.td}>{editing ? <CellInput value={s.background} onChange={v => updateBadge(s.id, { background: v })} /> : <ColorChip hex={s.background} />}</td>
          </tr>
        ))}
      </DocTable>

      <p style={{ ...S.subTitle, marginTop: 16 }}>Display Notes</p>
      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.notes.map((n, i) => (
            <div key={i} style={{ display: 'flex', gap: 8 }}>
              <span style={{ color: colors.gray, marginTop: 5 }}>•</span>
              <input type="text" value={n} onChange={e => updateNote(i, e.target.value)} style={{ ...S.input }} />
            </div>
          ))}
        </div>
      ) : (
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          {data.notes.map((n, i) => <li key={i} style={{ fontSize: fontSize.label, color: colors.black, lineHeight: 1.6, marginBottom: 4 }}>{n}</li>)}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section: CTPA Safety Barriers
// ---------------------------------------------------------------------------

function BadgeTable({ states, editing, onUpdate, extraColumn }: {
  states: BadgeState[]; editing: boolean;
  onUpdate: (id: string, patch: Partial<BadgeState>) => void;
  extraColumn?: string;
}) {
  return (
    <DocTable columns={['Condition', 'Badge Label', 'Text Color', 'Background']}>
      {states.map(s => (
        <tr key={s.id}>
          <td style={S.td}>{editing ? <CellInput value={s.condition}  onChange={v => onUpdate(s.id, { condition: v })} /> : <code style={{ fontSize: 12 }}>{s.condition}</code>}</td>
          <td style={S.td}>{editing ? <CellInput value={s.badgeLabel} onChange={v => onUpdate(s.id, { badgeLabel: v })} /> : <code style={{ fontSize: 12 }}>{s.badgeLabel}</code>}</td>
          <td style={S.td}>{editing ? <CellInput value={s.textColor}  onChange={v => onUpdate(s.id, { textColor: v })} />  : <ColorChip hex={s.textColor} />}</td>
          <td style={S.td}>{editing ? <CellInput value={s.background} onChange={v => onUpdate(s.id, { background: v })} /> : <ColorChip hex={s.background} />}</td>
        </tr>
      ))}
    </DocTable>
  );
}

function CTPASafetySection({ data, editing, onChange }: {
  data: CTData['ctpaSafety']; editing: boolean;
  onChange: (v: CTData['ctpaSafety']) => void;
}) {
  const updateEgfrBadge = (id: string, patch: Partial<BadgeState>) =>
    onChange({ ...data, egfr: { ...data.egfr, badgeStates: data.egfr.badgeStates.map(s => s.id === id ? { ...s, ...patch } : s) } });
  const updateEgfrDesc = (id: string, patch: Partial<EgfrDesc>) =>
    onChange({ ...data, egfr: { ...data.egfr, descriptions: data.egfr.descriptions.map(d => d.id === id ? { ...d, ...patch } : d) } });
  const updateCaBadge = (id: string, patch: Partial<BadgeState>) =>
    onChange({ ...data, contrastAllergy: { ...data.contrastAllergy, badgeStates: data.contrastAllergy.badgeStates.map(s => s.id === id ? { ...s, ...patch } : s) } });
  const updateCaDesc = (id: string, patch: Partial<AllergyDesc>) =>
    onChange({ ...data, contrastAllergy: { ...data.contrastAllergy, descriptions: data.contrastAllergy.descriptions.map(d => d.id === id ? { ...d, ...patch } : d) } });
  const updateRadBadge = (id: string, patch: Partial<BadgeState>) =>
    onChange({ ...data, radiation: { badgeStates: data.radiation.badgeStates.map(s => s.id === id ? { ...s, ...patch } : s) } });

  return (
    <section style={S.section}>
      <div style={S.sectionTitle}>5. CTPA Safety Barriers Section</div>

      {/* eGFR */}
      <p style={S.subTitle}>eGFR — Badge States</p>
      <BadgeTable states={data.egfr.badgeStates} editing={editing} onUpdate={updateEgfrBadge} />

      <p style={S.subTitle}>eGFR — Description Text</p>
      <DocTable columns={['eGFR Range', 'Description']}>
        {data.egfr.descriptions.map(d => (
          <tr key={d.id}>
            <td style={S.td}>{editing ? <CellInput value={d.range}       onChange={v => updateEgfrDesc(d.id, { range: v })} />       : <code style={{ fontSize: 12 }}>{d.range}</code>}</td>
            <td style={S.td}>{editing ? <CellInput value={d.description} onChange={v => updateEgfrDesc(d.id, { description: v })} /> : d.description}</td>
          </tr>
        ))}
      </DocTable>

      {/* Contrast Allergy */}
      <p style={{ ...S.subTitle, marginTop: 20 }}>Contrast Allergy — Badge States</p>
      <BadgeTable states={data.contrastAllergy.badgeStates} editing={editing} onUpdate={updateCaBadge} />

      <p style={S.subTitle}>Contrast Allergy — Descriptions</p>
      <DocTable columns={['Value', 'Description']}>
        {data.contrastAllergy.descriptions.map(d => (
          <tr key={d.id}>
            <td style={S.td}>{editing ? <CellInput value={d.value}       onChange={v => updateCaDesc(d.id, { value: v })} />       : <code style={{ fontSize: 12 }}>{d.value}</code>}</td>
            <td style={S.td}>{editing ? <CellInput value={d.description} onChange={v => updateCaDesc(d.id, { description: v })} /> : d.description}</td>
          </tr>
        ))}
      </DocTable>

      {/* Radiation */}
      <p style={{ ...S.subTitle, marginTop: 20 }}>Total Radiation Exposure (mSv) — Badge States</p>
      <BadgeTable states={data.radiation.badgeStates} editing={editing} onUpdate={updateRadBadge} />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section: YEARS Calculator
// ---------------------------------------------------------------------------

function YearsSection({ data, editing, onChange }: {
  data: CTData['years']; editing: boolean;
  onChange: (v: CTData['years']) => void;
}) {
  const updateFactor = (i: number, val: string) => {
    const factors = [...data.factors]; factors[i] = val;
    onChange({ ...data, factors });
  };
  const updateThreshold = (id: string, patch: Partial<YearsThreshold>) =>
    onChange({ ...data, thresholds: data.thresholds.map(t => t.id === id ? { ...t, ...patch } : t) });
  const updateResult = (id: string, patch: Partial<YearsResult>) =>
    onChange({ ...data, results: data.results.map(r => r.id === id ? { ...r, ...patch } : r) });
  const updateNote = (i: number, val: string) => {
    const barChartNotes = [...data.barChartNotes]; barChartNotes[i] = val;
    onChange({ ...data, barChartNotes });
  };

  return (
    <section style={S.section}>
      <div style={S.sectionTitle}>6. YEARS Calculator Modal</div>

      {/* Factors */}
      <p style={S.subTitle}>Clinical Factors (clinician selects Yes/No)</p>
      <div style={{ marginBottom: 16 }}>
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.factors.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: colors.gray, minWidth: 20 }}>{i + 1}.</span>
                <input type="text" value={f} onChange={e => updateFactor(i, e.target.value)} style={{ ...S.input }} />
              </div>
            ))}
          </div>
        ) : (
          <ol style={{ paddingLeft: 20, margin: 0 }}>
            {data.factors.map((f, i) => <li key={i} style={{ fontSize: fontSize.label, lineHeight: 1.7, marginBottom: 2 }}>{f}</li>)}
          </ol>
        )}
      </div>

      {/* Threshold logic */}
      <p style={{ ...S.subTitle, marginTop: 20 }}>Threshold Logic</p>
      <DocTable columns={['YEARS Score', 'D-Dimer Threshold']}>
        {data.thresholds.map(t => (
          <tr key={t.id}>
            <td style={S.td}>{editing ? <CellInput value={t.score}     onChange={v => updateThreshold(t.id, { score: v })} />     : <code style={{ fontSize: 12 }}>{t.score}</code>}</td>
            <td style={S.td}>{editing ? <CellInput value={t.threshold} onChange={v => updateThreshold(t.id, { threshold: v })} /> : t.threshold}</td>
          </tr>
        ))}
      </DocTable>

      {/* Result states */}
      <p style={S.subTitle}>Result States</p>
      <DocTable columns={['Condition', 'Result', 'Background', 'Text Color', 'Icon']}>
        {data.results.map(r => (
          <tr key={r.id}>
            <td style={S.td}>{editing ? <CellInput value={r.condition} onChange={v => updateResult(r.id, { condition: v })} /> : <code style={{ fontSize: 12 }}>{r.condition}</code>}</td>
            <td style={S.td}>{editing ? <CellInput value={r.result}    onChange={v => updateResult(r.id, { result: v })} />    : <code style={{ fontSize: 12 }}>{r.result}</code>}</td>
            <td style={S.td}>{editing ? <CellInput value={r.background} onChange={v => updateResult(r.id, { background: v })} /> : <ColorChip hex={r.background} />}</td>
            <td style={S.td}>{editing ? <CellInput value={r.textColor} onChange={v => updateResult(r.id, { textColor: v })} />  : <ColorChip hex={r.textColor} />}</td>
            <td style={S.td}>{editing ? <CellInput value={r.icon}      onChange={v => updateResult(r.id, { icon: v })} />      : r.icon}</td>
          </tr>
        ))}
      </DocTable>

      {/* Bar chart notes */}
      <p style={{ ...S.subTitle, marginTop: 4 }}>D-Dimer Bar Chart</p>
      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.barChartNotes.map((n, i) => (
            <div key={i} style={{ display: 'flex', gap: 8 }}>
              <span style={{ color: colors.gray, marginTop: 5 }}>•</span>
              <input type="text" value={n} onChange={e => updateNote(i, e.target.value)} style={{ ...S.input }} />
            </div>
          ))}
        </div>
      ) : (
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          {data.barChartNotes.map((n, i) => <li key={i} style={{ fontSize: fontSize.label, color: colors.black, lineHeight: 1.7, marginBottom: 4 }}>{n}</li>)}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export default function ClinicalThresholdsView() {
  const [saved, setSaved]       = useState<CTData | null>(null);
  const [draft, setDraft]       = useState<CTData | null>(null);
  const [editing, setEditing]   = useState(false);
  const [isLoading, setLoading] = useState(true);
  const [isSaving, setSaving]   = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setFetchError(null);
    try {
      const res = await fetch('/api/clinical-thresholds');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: CTData = await res.json();
      setSaved(data); setDraft(data);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleEdit   = () => { setDraft(saved); setSaveError(null); setEditing(true); };
  const handleCancel = () => { setDraft(saved); setSaveError(null); setEditing(false); };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true); setSaveError(null);
    const payload = { ...draft, lastUpdated: new Date().toISOString().slice(0, 10) };
    try {
      const res = await fetch('/api/clinical-thresholds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaved(payload); setDraft(payload); setEditing(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Toolbar ───────────────────────────────────────────────────────────────
  const toolbar = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 28 }}>
      {savedFlash && (
        <span style={{ fontSize: fontSize.label, color: colors.green, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Check size={13} /> Saved
        </span>
      )}
      {saveError && <span style={{ fontSize: fontSize.label, color: colors.red }}>{saveError}</span>}

      {!editing ? (
        <>
          <button onClick={handleEdit} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '0 12px', height: 32, fontSize: fontSize.label, fontWeight: fontWeight.medium,
            color: colors.darkBlue, backgroundColor: colors.lightBlue,
            border: `1px solid ${colors.darkBlue}`, borderRadius: 4, cursor: 'pointer',
          }}>
            <Pencil size={13} /> Edit
          </button>
          <button onClick={load} title="Reload" style={{
            display: 'inline-flex', alignItems: 'center', padding: '0 8px', height: 32,
            color: colors.gray, backgroundColor: 'transparent',
            border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer',
          }}>
            <RotateCcw size={13} />
          </button>
        </>
      ) : (
        <>
          <button onClick={handleCancel} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '0 12px', height: 32, fontSize: fontSize.label, fontWeight: fontWeight.medium,
            color: colors.gray, backgroundColor: 'white',
            border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer',
          }}>
            <X size={13} /> Cancel
          </button>
          <button onClick={handleSave} disabled={isSaving} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '0 12px', height: 32, fontSize: fontSize.label, fontWeight: fontWeight.semibold,
            color: 'white', backgroundColor: colors.black,
            border: 'none', borderRadius: 4, cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.7 : 1,
          }}>
            <Check size={13} /> {isSaving ? 'Saving…' : 'Save'}
          </button>
        </>
      )}
    </div>
  );

  if (isLoading) return <div style={{ maxWidth: 900 }}>{toolbar}<p style={{ color: colors.gray }}>Loading…</p></div>;
  if (fetchError) return (
    <div style={{ maxWidth: 900 }}>
      {toolbar}
      <p style={{ color: colors.red }}>Failed to load: {fetchError}</p>
      <button onClick={load} style={{ marginTop: 8, fontSize: fontSize.label, color: colors.darkBlue, background: 'none', border: 'none', cursor: 'pointer' }}>Retry</button>
    </div>
  );
  if (!draft) return null;

  return (
    <div style={{ maxWidth: 900 }}>
      {toolbar}

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: fontWeight.semibold, color: colors.black, marginBottom: 6 }}>
          Clinical Threshold & Display State Reference
        </h1>
        <p style={{ fontSize: fontSize.label, color: colors.gray }}>
          Source files: <code style={{ fontSize: 12 }}>DashboardLayout.tsx</code>, <code style={{ fontSize: 12 }}>YearsCalculatorModal.tsx</code>
          {saved?.lastUpdated && <span> · Last updated: {saved.lastUpdated}</span>}
        </p>
      </div>

      <hr style={{ border: 'none', borderTop: `1px solid ${colors.border}`, marginBottom: 32 }} />

      <VitalStabilitySection
        data={draft.vitalStability}
        editing={editing}
        onChange={v => setDraft(d => d ? { ...d, vitalStability: v } : d)}
      />
      <HemodynamicSection
        data={draft.hemodynamicStress}
        editing={editing}
        onChange={v => setDraft(d => d ? { ...d, hemodynamicStress: v } : d)}
      />
      <PreviousDiagnosesSection
        data={draft.previousDiagnoses}
        editing={editing}
        onChange={v => setDraft(d => d ? { ...d, previousDiagnoses: v } : d)}
      />
      <PriorCTPAsSection
        data={draft.priorCtpas}
        editing={editing}
        onChange={v => setDraft(d => d ? { ...d, priorCtpas: v } : d)}
      />
      <CTPASafetySection
        data={draft.ctpaSafety}
        editing={editing}
        onChange={v => setDraft(d => d ? { ...d, ctpaSafety: v } : d)}
      />
      <YearsSection
        data={draft.years}
        editing={editing}
        onChange={v => setDraft(d => d ? { ...d, years: v } : d)}
      />
    </div>
  );
}
