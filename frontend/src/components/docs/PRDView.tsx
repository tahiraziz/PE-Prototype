import { useState, useEffect, useCallback } from 'react';
import {
  Pencil, Check, X, RotateCcw, Plus, Trash2,
} from 'lucide-react';
import { colors, fontSize, fontWeight } from '../../styles/tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DecisionEntry {
  id: string;
  decision: string;
  rationale: string;
  madeBy: string;
  date: string;
}

interface PRDData {
  meta: {
    productName: string;
    preparer: string;
    dateCreated: string;
    lastUpdated: string;
    version: string;
  };
  objective: string[];
  userPersonas: string[];
  successMetrics: string[];
  keyFeatures: string[];
  userStories: string[];
  uxAndDesign: string[];
  inScope: string[];
  outOfScope: string[];
  technicalRequirements: string[];
  dependencies: string[];
  timeline: string[];
  openQuestions: string[];
  supportingDocuments: string[];
  decisionLog: DecisionEntry[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const EMPTY_PRD: PRDData = {
  meta: { productName: '', preparer: '', dateCreated: '', lastUpdated: '', version: '' },
  objective: [''],
  userPersonas: [''],
  successMetrics: [''],
  keyFeatures: [''],
  userStories: [''],
  uxAndDesign: [''],
  inScope: [''],
  outOfScope: [''],
  technicalRequirements: [''],
  dependencies: [''],
  timeline: [''],
  openQuestions: [''],
  supportingDocuments: [''],
  decisionLog: [],
};

// ---------------------------------------------------------------------------
// Shared style atoms
// ---------------------------------------------------------------------------

const S = {
  sectionTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.black,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: `1px solid ${colors.border}`,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  } as React.CSSProperties,

  metaLabel: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    color: colors.gray,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    minWidth: 120,
  },

  metaValue: {
    fontSize: fontSize.body,
    color: colors.black,
  },

  metaInput: {
    fontSize: fontSize.body,
    color: colors.black,
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    padding: '3px 8px',
    outline: 'none',
    background: '#FAFAFA',
    flex: 1,
  } as React.CSSProperties,

  bulletText: {
    fontSize: fontSize.body,
    color: colors.black,
    lineHeight: 1.6,
  },

  textarea: {
    fontSize: fontSize.body,
    color: colors.black,
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    padding: '4px 8px',
    outline: 'none',
    background: '#FAFAFA',
    resize: 'vertical' as const,
    lineHeight: 1.6,
    width: '100%',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  },

  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    color: colors.gray,
    background: 'none',
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    cursor: 'pointer',
    padding: '3px 8px',
    marginTop: 4,
  } as React.CSSProperties,

  removeBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    color: colors.gray,
    background: 'none',
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    cursor: 'pointer',
    padding: '3px 5px',
    flexShrink: 0,
  } as React.CSSProperties,
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Simple bullet list – view or edit */
function BulletSection({
  title,
  items,
  editing,
  onChange,
  subtitle,
}: {
  title: string;
  items: string[];
  editing: boolean;
  onChange: (items: string[]) => void;
  subtitle?: string;
}) {
  const update = (i: number, val: string) => {
    const next = [...items]; next[i] = val; onChange(next);
  };
  const add    = () => onChange([...items, '']);
  const remove = (i: number) => {
    if (items.length === 1) { onChange(['']); return; }
    onChange(items.filter((_, idx) => idx !== i));
  };

  return (
    <section style={{ marginBottom: 32 }}>
      <div style={S.sectionTitle}>
        {title}
        {subtitle && (
          <span style={{ fontSize: 12, color: colors.gray, fontWeight: fontWeight.regular }}>
            — {subtitle}
          </span>
        )}
      </div>
      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ color: colors.gray, marginTop: 6, flexShrink: 0 }}>•</span>
              <textarea
                value={item}
                rows={2}
                onChange={e => update(i, e.target.value)}
                style={S.textarea}
              />
              <button style={S.removeBtn} onClick={() => remove(i)} title="Remove">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button style={S.addBtn} onClick={add}>
            <Plus size={12} /> Add item
          </button>
        </div>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 20, listStyleType: 'disc', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.filter(s => s.trim()).map((item, i) => (
            <li key={i} style={{ ...S.bulletText, paddingLeft: 4 }}>{item}</li>
          ))}
          {items.every(s => !s.trim()) && (
            <li style={{ ...S.bulletText, color: colors.gray, fontStyle: 'italic' }}>No content yet.</li>
          )}
        </ul>
      )}
    </section>
  );
}


/** Scope section with two lists side by side */
function ScopeSection({
  inScope,
  outOfScope,
  editing,
  onChangeIn,
  onChangeOut,
}: {
  inScope: string[];
  outOfScope: string[];
  editing: boolean;
  onChangeIn: (v: string[]) => void;
  onChangeOut: (v: string[]) => void;
}) {
  const updateList = (list: string[], setter: (v: string[]) => void, i: number, val: string) => {
    const next = [...list]; next[i] = val; setter(next);
  };
  const addItem    = (list: string[], setter: (v: string[]) => void) => setter([...list, '']);
  const removeItem = (list: string[], setter: (v: string[]) => void, i: number) => {
    if (list.length === 1) { setter(['']); return; }
    setter(list.filter((_, idx) => idx !== i));
  };

  const renderList = (
    label: string,
    color: string,
    list: string[],
    setter: (v: string[]) => void,
  ) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 12, fontWeight: fontWeight.semibold, color, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </p>
      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {list.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <span style={{ color: colors.gray, marginTop: 6 }}>•</span>
              <textarea
                value={item}
                rows={2}
                onChange={e => updateList(list, setter, i, e.target.value)}
                style={S.textarea}
              />
              <button style={S.removeBtn} onClick={() => removeItem(list, setter, i)}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button style={S.addBtn} onClick={() => addItem(list, setter)}>
            <Plus size={12} /> Add
          </button>
        </div>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18, listStyleType: 'disc', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.filter(s => s.trim()).map((item, i) => (
            <li key={i} style={{ ...S.bulletText, paddingLeft: 4 }}>{item}</li>
          ))}
          {list.every(s => !s.trim()) && (
            <li style={{ ...S.bulletText, color: colors.gray, fontStyle: 'italic' }}>None.</li>
          )}
        </ul>
      )}
    </div>
  );

  return (
    <section style={{ marginBottom: 32 }}>
      <div style={S.sectionTitle}>Scope of Work</div>
      <div style={{ display: 'flex', gap: 32 }}>
        {renderList('In Scope', colors.green ?? '#1a7f4b', inScope, onChangeIn)}
        {renderList('Out of Scope', colors.red ?? '#c0392b', outOfScope, onChangeOut)}
      </div>
    </section>
  );
}

/** Decision Log – structured table */
function DecisionLogSection({
  entries,
  editing,
  onChange,
}: {
  entries: DecisionEntry[];
  editing: boolean;
  onChange: (entries: DecisionEntry[]) => void;
}) {
  const update = (id: string, patch: Partial<DecisionEntry>) => {
    onChange(entries.map(e => e.id === id ? { ...e, ...patch } : e));
  };
  const add = () => {
    const today = new Date().toISOString().slice(0, 10);
    onChange([...entries, { id: uid(), decision: '', rationale: '', madeBy: '', date: today }]);
  };
  const remove = (id: string) => onChange(entries.filter(e => e.id !== id));

  const cellStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: fontSize.body,
    color: colors.black,
    verticalAlign: 'top',
    borderBottom: `1px solid ${colors.border}`,
  };

  const cellInput = (value: string, onChange: (v: string) => void, rows = 2) => (
    <textarea
      value={value}
      rows={rows}
      onChange={e => onChange(e.target.value)}
      style={{ ...S.textarea, minWidth: 0 }}
    />
  );

  const thStyle: React.CSSProperties = {
    padding: '8px 12px',
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    color: colors.gray,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    textAlign: 'left',
    borderBottom: `2px solid ${colors.border}`,
    whiteSpace: 'nowrap',
  };

  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ ...S.sectionTitle, justifyContent: 'space-between' }}>
        <span>Decision Log</span>
        {editing && (
          <button
            onClick={add}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: colors.darkBlue,
              background: colors.lightBlue,
              border: `1px solid ${colors.darkBlue}`,
              borderRadius: 4, padding: '3px 10px', cursor: 'pointer',
            }}
          >
            <Plus size={12} /> Add decision
          </button>
        )}
      </div>

      {entries.length === 0 && !editing && (
        <p style={{ ...S.bulletText, color: colors.gray, fontStyle: 'italic' }}>No decisions logged yet.</p>
      )}

      {entries.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '30%' }} />
              <col style={{ width: '35%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '12%' }} />
              {editing && <col style={{ width: '5%' }} />}
            </colgroup>
            <thead>
              <tr>
                <th style={thStyle}>Decision</th>
                <th style={thStyle}>Rationale</th>
                <th style={thStyle}>Made By</th>
                <th style={thStyle}>Date</th>
                {editing && <th style={thStyle} />}
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id}>
                  <td style={cellStyle}>
                    {editing
                      ? cellInput(entry.decision, v => update(entry.id, { decision: v }))
                      : entry.decision}
                  </td>
                  <td style={cellStyle}>
                    {editing
                      ? cellInput(entry.rationale, v => update(entry.id, { rationale: v }))
                      : entry.rationale}
                  </td>
                  <td style={cellStyle}>
                    {editing
                      ? <input
                          type="text"
                          value={entry.madeBy}
                          onChange={e => update(entry.id, { madeBy: e.target.value })}
                          style={{ ...S.metaInput, width: '100%' }}
                        />
                      : entry.madeBy}
                  </td>
                  <td style={cellStyle}>
                    {editing
                      ? <input
                          type="date"
                          value={entry.date}
                          onChange={e => update(entry.id, { date: e.target.value })}
                          style={{ ...S.metaInput, width: '100%' }}
                        />
                      : entry.date}
                  </td>
                  {editing && (
                    <td style={{ ...cellStyle, textAlign: 'center' }}>
                      <button style={S.removeBtn} onClick={() => remove(entry.id)} title="Remove">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {entries.length === 0 && editing && (
        <p style={{ ...S.bulletText, color: colors.gray, fontStyle: 'italic', marginTop: 8 }}>
          No decisions yet. Click "Add decision" to log the first one.
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main PRDView
// ---------------------------------------------------------------------------

export default function PRDView() {
  const [saved, setSaved]         = useState<PRDData | null>(null);
  const [draft, setDraft]         = useState<PRDData>(EMPTY_PRD);
  const [editing, setEditing]     = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving]   = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/prd');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PRDData = await res.json();
      setSaved(data);
      setDraft(data);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleEdit = () => {
    setDraft(saved ?? EMPTY_PRD);
    setSaveError(null);
    setEditing(true);
  };

  const handleCancel = () => {
    setDraft(saved ?? EMPTY_PRD);
    setSaveError(null);
    setEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    const payload = { ...draft, meta: { ...draft.meta, lastUpdated: new Date().toISOString().slice(0, 10) } };
    try {
      const res = await fetch('/api/prd', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaved(payload);
      setDraft(payload);
      setEditing(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const set = <K extends keyof PRDData>(key: K, val: PRDData[K]) =>
    setDraft(d => ({ ...d, [key]: val }));

  const setMeta = (patch: Partial<PRDData['meta']>) =>
    setDraft(d => ({ ...d, meta: { ...d.meta, ...patch } }));

  // ── Toolbar ──────────────────────────────────────────────────────────────
  const toolbar = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 28 }}>
      {savedFlash && (
        <span style={{ fontSize: fontSize.label, color: colors.green, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Check size={13} /> Saved
        </span>
      )}
      {saveError && (
        <span style={{ fontSize: fontSize.label, color: colors.red }}>{saveError}</span>
      )}
      {!editing ? (
        <>
          <button
            onClick={handleEdit}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '0 12px', height: 32,
              fontSize: fontSize.label, fontWeight: fontWeight.medium,
              color: colors.darkBlue, backgroundColor: colors.lightBlue,
              border: `1px solid ${colors.darkBlue}`, borderRadius: 4, cursor: 'pointer',
            }}
          >
            <Pencil size={13} /> Edit
          </button>
          <button
            onClick={load}
            title="Reload"
            style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '0 8px', height: 32,
              color: colors.gray, backgroundColor: 'transparent',
              border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer',
            }}
          >
            <RotateCcw size={13} />
          </button>
        </>
      ) : (
        <>
          <button
            onClick={handleCancel}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '0 12px', height: 32,
              fontSize: fontSize.label, fontWeight: fontWeight.medium,
              color: colors.gray, backgroundColor: 'white',
              border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer',
            }}
          >
            <X size={13} /> Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '0 12px', height: 32,
              fontSize: fontSize.label, fontWeight: fontWeight.semibold,
              color: 'white', backgroundColor: colors.black,
              border: 'none', borderRadius: 4,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            <Check size={13} /> {isSaving ? 'Saving…' : 'Save'}
          </button>
        </>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div style={{ maxWidth: 900 }}>
        {toolbar}
        <p style={{ fontSize: fontSize.body, color: colors.gray }}>Loading…</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ maxWidth: 900 }}>
        {toolbar}
        <p style={{ fontSize: fontSize.body, color: colors.red }}>Failed to load: {fetchError}</p>
        <button onClick={load} style={{ marginTop: 8, fontSize: fontSize.label, color: colors.darkBlue, background: 'none', border: 'none', cursor: 'pointer' }}>
          Retry
        </button>
      </div>
    );
  }

  const d = draft;

  // ── Meta row helper ───────────────────────────────────────────────────────
  const metaRow = (label: string, key: keyof PRDData['meta']) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <span style={S.metaLabel}>{label}</span>
      {editing
        ? <input
            type={key === 'dateCreated' || key === 'lastUpdated' ? 'date' : 'text'}
            value={d.meta[key]}
            onChange={e => setMeta({ [key]: e.target.value })}
            style={S.metaInput}
          />
        : <span style={S.metaValue}>{d.meta[key] || <em style={{ color: colors.gray }}>—</em>}</span>
      }
    </div>
  );

  return (
    <div style={{ maxWidth: 900 }}>
      {toolbar}

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        {editing
          ? <input
              value={d.meta.productName}
              onChange={e => setMeta({ productName: e.target.value })}
              placeholder="Product name"
              style={{
                fontSize: 24, fontWeight: fontWeight.semibold, color: colors.black,
                border: 'none', borderBottom: `2px solid ${colors.darkBlue}`,
                outline: 'none', background: 'transparent', width: '100%', marginBottom: 16,
              }}
            />
          : <h1 style={{ fontSize: 24, fontWeight: fontWeight.semibold, color: colors.black, marginBottom: 16, margin: '0 0 16px' }}>
              {d.meta.productName || 'Untitled PRD'}
            </h1>
        }

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0 32px',
          padding: '16px 20px',
          background: '#FAFAFA',
          borderRadius: 8,
          border: `1px solid ${colors.border}`,
        }}>
          {metaRow('Preparer',     'preparer')}
          {metaRow('Version',      'version')}
          {metaRow('Date Created', 'dateCreated')}
          {metaRow('Last Updated', 'lastUpdated')}
        </div>
      </div>

      {/* Sections */}
      <BulletSection
        title="Objective"
        subtitle="What are you trying to build and why?"
        items={d.objective}
        editing={editing}
        onChange={v => set('objective', v)}
      />

      <BulletSection
        title="User Personas"
        subtitle="Who are you building this for?"
        items={d.userPersonas}
        editing={editing}
        onChange={v => set('userPersonas', v)}
      />

      <BulletSection
        title="Success Metrics / KPIs"
        subtitle="How will we measure success?"
        items={d.successMetrics}
        editing={editing}
        onChange={v => set('successMetrics', v)}
      />

      <BulletSection
        title="Key Features / Requirements"
        items={d.keyFeatures}
        editing={editing}
        onChange={v => set('keyFeatures', v)}
      />

      <BulletSection
        title="User Stories"
        items={d.userStories}
        editing={editing}
        onChange={v => set('userStories', v)}
      />

      <BulletSection
        title="UX & Design"
        items={d.uxAndDesign}
        editing={editing}
        onChange={v => set('uxAndDesign', v)}
      />

      <BulletSection
        title="Technical Requirements"
        items={d.technicalRequirements}
        editing={editing}
        onChange={v => set('technicalRequirements', v)}
      />

      <BulletSection
        title="Dependencies"
        items={d.dependencies}
        editing={editing}
        onChange={v => set('dependencies', v)}
      />

      <BulletSection
        title="Timeline"
        items={d.timeline}
        editing={editing}
        onChange={v => set('timeline', v)}
      />

      <BulletSection
        title="Open Questions / Risks"
        subtitle="Unresolved questions and potential risks"
        items={d.openQuestions}
        editing={editing}
        onChange={v => set('openQuestions', v)}
      />

      <BulletSection
        title="Supporting Documents"
        subtitle="Links to related documents and resources"
        items={d.supportingDocuments}
        editing={editing}
        onChange={v => set('supportingDocuments', v)}
      />

      <DecisionLogSection
        entries={d.decisionLog}
        editing={editing}
        onChange={v => set('decisionLog', v)}
      />
    </div>
  );
}
