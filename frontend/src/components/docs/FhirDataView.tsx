import { useState, useEffect, useCallback } from 'react';
import { Pencil, Check, X, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { colors, fontSize, fontWeight } from '../../styles/tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FhirRow {
  property: string;
  value: string;
}

interface FhirField {
  id: string;
  name: string;
  rows: FhirRow[];
}

interface FhirSection {
  id: string;
  title: string;
  subtitle: string;
  fields: FhirField[];
}

interface FhirData {
  meta: {
    fhirVersion: string;
    ehrTarget: string;
    date: string;
    lastUpdated: string;
  };
  sections: FhirSection[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const EMPTY: FhirData = {
  meta: { fhirVersion: '', ehrTarget: '', date: '', lastUpdated: '' },
  sections: [],
};

// ---------------------------------------------------------------------------
// Style atoms
// ---------------------------------------------------------------------------

const S = {
  sectionTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.black,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottom: `1px solid ${colors.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as React.CSSProperties,

  fieldName: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: colors.black,
    marginBottom: 6,
    marginTop: 16,
  } as React.CSSProperties,

  metaLabel: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    color: colors.gray,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    minWidth: 110,
    flexShrink: 0,
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

  textarea: {
    fontSize: 13,
    color: colors.black,
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    padding: '4px 8px',
    outline: 'none',
    background: '#FAFAFA',
    resize: 'vertical' as const,
    lineHeight: 1.5,
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
    marginTop: 6,
  } as React.CSSProperties,

  addBtnBlue: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    color: colors.darkBlue,
    background: colors.lightBlue,
    border: `1px solid ${colors.darkBlue}`,
    borderRadius: 4,
    cursor: 'pointer',
    padding: '3px 10px',
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

  th: {
    padding: '7px 12px',
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    color: colors.gray,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    textAlign: 'left' as const,
    borderBottom: `2px solid ${colors.border}`,
    background: '#FAFAFA',
  },

  td: {
    padding: '8px 12px',
    fontSize: 13,
    color: colors.black,
    verticalAlign: 'top' as const,
    borderBottom: `1px solid ${colors.border}`,
    lineHeight: 1.55,
  },

  tdProp: {
    padding: '8px 12px',
    fontSize: 13,
    fontWeight: fontWeight.medium,
    color: colors.black,
    verticalAlign: 'top' as const,
    borderBottom: `1px solid ${colors.border}`,
    background: '#FAFAFA',
    whiteSpace: 'nowrap' as const,
    lineHeight: 1.55,
  },
};

// ---------------------------------------------------------------------------
// FieldTable — renders one FHIR field as a property/value table
// ---------------------------------------------------------------------------

function FieldTable({
  field,
  editing,
  onChange,
  onRemoveField,
}: {
  field: FhirField;
  editing: boolean;
  onChange: (f: FhirField) => void;
  onRemoveField: () => void;
}) {
  const updateRow = (i: number, patch: Partial<FhirRow>) => {
    const rows = field.rows.map((r, idx) => idx === i ? { ...r, ...patch } : r);
    onChange({ ...field, rows });
  };
  const addRow = () => onChange({ ...field, rows: [...field.rows, { property: '', value: '' }] });
  const removeRow = (i: number) => onChange({ ...field, rows: field.rows.filter((_, idx) => idx !== i) });

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Field name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, marginTop: 20 }}>
        {editing ? (
          <>
            <input
              value={field.name}
              onChange={e => onChange({ ...field, name: e.target.value })}
              placeholder="Field name"
              style={{
                ...S.metaInput,
                fontSize: 13,
                fontWeight: fontWeight.semibold,
                flex: 1,
              }}
            />
            <button style={S.removeBtn} onClick={onRemoveField} title="Remove field">
              <Trash2 size={13} />
            </button>
          </>
        ) : (
          <p style={S.fieldName}>{field.name}</p>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', border: `1px solid ${colors.border}`, borderRadius: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: editing ? '24%' : '26%' }} />
            <col style={{ width: editing ? '68%' : '74%' }} />
            {editing && <col style={{ width: '8%' }} />}
          </colgroup>
          <thead>
            <tr>
              <th style={S.th}>Property</th>
              <th style={S.th}>Value</th>
              {editing && <th style={S.th} />}
            </tr>
          </thead>
          <tbody>
            {field.rows.map((row, i) => (
              <tr key={i}>
                <td style={S.tdProp}>
                  {editing ? (
                    <input
                      value={row.property}
                      onChange={e => updateRow(i, { property: e.target.value })}
                      style={{ ...S.metaInput, width: '100%' }}
                    />
                  ) : (
                    row.property
                  )}
                </td>
                <td style={S.td}>
                  {editing ? (
                    <textarea
                      value={row.value}
                      rows={2}
                      onChange={e => updateRow(i, { value: e.target.value })}
                      style={S.textarea}
                    />
                  ) : (
                    <span style={{ fontFamily: row.value.startsWith('⚠️') ? 'inherit' : 'inherit' }}>
                      {row.value}
                    </span>
                  )}
                </td>
                {editing && (
                  <td style={{ ...S.td, textAlign: 'center', background: 'transparent' }}>
                    <button style={S.removeBtn} onClick={() => removeRow(i)} title="Remove row">
                      <Trash2 size={12} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <button style={S.addBtn} onClick={addRow}>
          <Plus size={12} /> Add row
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SectionBlock
// ---------------------------------------------------------------------------

function SectionBlock({
  section,
  editing,
  onChange,
  onRemove,
}: {
  section: FhirSection;
  editing: boolean;
  onChange: (s: FhirSection) => void;
  onRemove: () => void;
}) {
  const updateField = (i: number, f: FhirField) => {
    const fields = section.fields.map((old, idx) => idx === i ? f : old);
    onChange({ ...section, fields });
  };
  const addField = () => {
    onChange({
      ...section,
      fields: [...section.fields, { id: uid(), name: 'New Field', rows: [{ property: 'Property', value: 'Value' }] }],
    });
  };
  const removeField = (i: number) => onChange({ ...section, fields: section.fields.filter((_, idx) => idx !== i) });

  return (
    <section style={{ marginBottom: 40 }}>
      <div style={S.sectionTitle}>
        {editing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <input
              value={section.title}
              onChange={e => onChange({ ...section, title: e.target.value })}
              style={{ ...S.metaInput, fontSize: fontSize.body, fontWeight: fontWeight.semibold, flex: 1 }}
            />
            <button style={S.removeBtn} onClick={onRemove} title="Remove section">
              <Trash2 size={13} />
            </button>
          </div>
        ) : (
          <span>{section.title}</span>
        )}
      </div>

      {/* Subtitle */}
      {(section.subtitle || editing) && (
        editing ? (
          <textarea
            value={section.subtitle}
            rows={2}
            onChange={e => onChange({ ...section, subtitle: e.target.value })}
            placeholder="Section subtitle / description…"
            style={{ ...S.textarea, marginBottom: 12, fontSize: 13, color: colors.gray }}
          />
        ) : (
          section.subtitle && (
            <p style={{ fontSize: 13, color: colors.gray, lineHeight: 1.6, marginBottom: 16, marginTop: -4 }}>
              {section.subtitle}
            </p>
          )
        )
      )}

      {section.fields.map((field, i) => (
        <FieldTable
          key={field.id}
          field={field}
          editing={editing}
          onChange={f => updateField(i, f)}
          onRemoveField={() => removeField(i)}
        />
      ))}

      {editing && (
        <button style={S.addBtnBlue} onClick={addField}>
          <Plus size={12} /> Add field
        </button>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main FhirDataView
// ---------------------------------------------------------------------------

export default function FhirDataView() {
  const [saved, setSaved]           = useState<FhirData | null>(null);
  const [draft, setDraft]           = useState<FhirData>(EMPTY);
  const [editing, setEditing]       = useState(false);
  const [isLoading, setIsLoading]   = useState(true);
  const [isSaving, setIsSaving]     = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/fhir-data');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: FhirData = await res.json();
      setSaved(data);
      setDraft(data);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleEdit = () => { setDraft(saved ?? EMPTY); setSaveError(null); setEditing(true); };
  const handleCancel = () => { setDraft(saved ?? EMPTY); setSaveError(null); setEditing(false); };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    const payload = { ...draft, meta: { ...draft.meta, lastUpdated: new Date().toISOString().slice(0, 10) } };
    try {
      const res = await fetch('/api/fhir-data', {
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

  const updateSection = (i: number, s: FhirSection) =>
    setDraft(d => ({ ...d, sections: d.sections.map((old, idx) => idx === i ? s : old) }));
  const removeSection = (i: number) =>
    setDraft(d => ({ ...d, sections: d.sections.filter((_, idx) => idx !== i) }));
  const addSection = () =>
    setDraft(d => ({
      ...d,
      sections: [...d.sections, { id: uid(), title: 'New Section', subtitle: '', fields: [] }],
    }));
  const setMeta = (patch: Partial<FhirData['meta']>) =>
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

  const metaRow = (label: string, key: keyof FhirData['meta']) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <span style={S.metaLabel}>{label}</span>
      {editing
        ? <input
            type={key === 'lastUpdated' ? 'date' : 'text'}
            value={d.meta[key]}
            onChange={e => setMeta({ [key]: e.target.value })}
            style={S.metaInput}
          />
        : <span style={{ fontSize: fontSize.body, color: colors.black }}>{d.meta[key] || <em style={{ color: colors.gray }}>—</em>}</span>
      }
    </div>
  );

  return (
    <div style={{ maxWidth: 900 }}>
      {toolbar}

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 22, fontWeight: fontWeight.semibold, color: colors.black, margin: '0 0 16px' }}>
          FHIR Field Reference
        </h1>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0 32px',
          padding: '14px 20px',
          background: '#FAFAFA',
          borderRadius: 8,
          border: `1px solid ${colors.border}`,
        }}>
          {metaRow('FHIR Version', 'fhirVersion')}
          {metaRow('EHR Target', 'ehrTarget')}
          {metaRow('Date', 'date')}
          {metaRow('Last Updated', 'lastUpdated')}
        </div>
      </div>

      {/* Sections */}
      {d.sections.map((section, i) => (
        <SectionBlock
          key={section.id}
          section={section}
          editing={editing}
          onChange={s => updateSection(i, s)}
          onRemove={() => removeSection(i)}
        />
      ))}

      {editing && (
        <button
          onClick={addSection}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: fontSize.label, color: colors.darkBlue,
            background: colors.lightBlue,
            border: `1px solid ${colors.darkBlue}`,
            borderRadius: 4, padding: '6px 14px', cursor: 'pointer', marginTop: 8,
          }}
        >
          <Plus size={13} /> Add section
        </button>
      )}
    </div>
  );
}
