import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Check, X, Pencil } from 'lucide-react';
import { colors, fontSize, fontWeight } from '../../styles/tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Severity = 'info' | 'warning' | 'critical';

interface CDSCard {
  severity: Severity;
  title: string;
  detail: string;
  suggestion: string;
  link: string;
}

interface Case {
  id: string;
  label: string;
  card: CDSCard;
}

interface Section {
  id: string;
  label: string;
  cases: Case[];
}

interface CDSData {
  sections: Section[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// CDS Hooks spec: info, warning, critical (colors are client-defined)
const INDICATOR: Record<Severity, { accent: string; label: string }> = {
  info:     { accent: '#1D4ED8', label: 'Info' },
  warning:  { accent: '#D97706', label: 'Warning' },
  critical: { accent: '#DC2626', label: 'Critical' },
};

// ---------------------------------------------------------------------------
// CDS Card Preview — structure from cases page, colors from CDS Hooks spec
// ---------------------------------------------------------------------------

function CDSCardPreview({ card }: { card: CDSCard }) {
  const ind = INDICATOR[card.severity] ?? INDICATOR.info;
  return (
    <div style={{
      backgroundColor: 'white',
      border: `1px solid ${colors.border}`,
      borderLeft: `4px solid ${ind.accent}`,
      borderRadius: 8,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      maxWidth: 600,
    }}>
      {/* Badge + Title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          flexShrink: 0,
          marginTop: 2,
          width: 18,
          height: 18,
          borderRadius: '50%',
          backgroundColor: ind.accent,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
        }}>i</div>
        <p style={{
          fontSize: fontSize.body,
          fontWeight: fontWeight.medium,
          color: colors.black,
          lineHeight: 1.55,
          margin: 0,
        }}>
          {card.title || <span style={{ color: colors.gray, fontStyle: 'italic' }}>No title</span>}
        </p>
      </div>

      {/* Detail */}
      {card.detail && (
        <p style={{
          fontSize: fontSize.label,
          color: colors.gray,
          lineHeight: 1.6,
          margin: 0,
          paddingLeft: 28,
          whiteSpace: 'pre-line',
        }}>
          {card.detail}
        </p>
      )}

      {/* Actions */}
      {(card.suggestion || card.link) && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, paddingLeft: 28 }}>
          {card.suggestion && (
            <button style={{
              backgroundColor: ind.accent,
              color: 'white',
              border: 'none',
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: fontSize.label,
              fontWeight: fontWeight.medium,
              cursor: 'pointer',
            }}>
              {card.suggestion}
            </button>
          )}
          {card.link && (
            <span style={{
              color: ind.accent,
              fontSize: fontSize.label,
              fontWeight: fontWeight.medium,
              textDecoration: 'underline',
              cursor: 'default',
            }}>
              {card.link}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field row
// ---------------------------------------------------------------------------

function FieldRow({
  label, value, onChange, multiline = false, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void;
  multiline?: boolean; type?: string;
}) {
  const base: React.CSSProperties = {
    width: '100%',
    fontSize: fontSize.label,
    fontFamily: "'IBM Plex Sans', sans-serif",
    color: '#111827',
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: '6px 10px',
    outline: 'none',
    lineHeight: 1.5,
    boxSizing: 'border-box',
    resize: multiline ? 'vertical' : undefined,
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: fontWeight.semibold, color: colors.gray, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </label>
      {type === 'select' ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={{ ...base, cursor: 'pointer' }}>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
      ) : multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} style={base} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} style={base} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Case editor (right panel)
// ---------------------------------------------------------------------------

function CaseEditor({
  caseData, onUpdate, onDelete, onRename,
}: {
  caseData: Case;
  onUpdate: (card: CDSCard) => void;
  onDelete: () => void;
  onRename: (label: string) => void;
}) {
  const [card, setCard]             = useState<CDSCard>(caseData.card);
  const [isDirty, setIsDirty]       = useState(false);
  const [isSaving, setIsSaving]     = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [renaming, setRenaming]     = useState(false);
  const [renameVal, setRenameVal]   = useState(caseData.label);

  useEffect(() => {
    setCard(caseData.card);
    setRenameVal(caseData.label);
    setIsDirty(false);
    setRenaming(false);
  }, [caseData.id, caseData.card, caseData.label]);

  function updateField<K extends keyof CDSCard>(field: K, value: CDSCard[K]) {
    const next = { ...card, [field]: value };
    setCard(next);
    setIsDirty(true);
    onUpdate(next);
  }

  async function handleSave() {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 250));
    setIsSaving(false);
    setIsDirty(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  function commitRename() {
    const t = renameVal.trim();
    if (t) onRename(t);
    setRenaming(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {renaming ? (
          <>
            <input
              autoFocus
              value={renameVal}
              onChange={e => setRenameVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(false); }}
              style={{
                flex: 1, fontSize: 18, fontWeight: fontWeight.semibold,
                fontFamily: "'IBM Plex Sans', sans-serif", color: '#111827',
                border: `1px solid ${colors.border}`, borderRadius: 6, padding: '4px 8px', outline: 'none',
              }}
            />
            <button onClick={commitRename} style={iconBtn('#166534')}><Check size={14} /></button>
            <button onClick={() => setRenaming(false)} style={iconBtn(colors.gray)}><X size={14} /></button>
          </>
        ) : (
          <>
            <h2 style={{ flex: 1, fontSize: 18, fontWeight: fontWeight.semibold, color: '#111827', margin: 0 }}>
              {caseData.label}
            </h2>
            <button onClick={() => setRenaming(true)} title="Rename" style={iconBtn(colors.gray)}><Pencil size={14} /></button>
            <button onClick={onDelete} title="Delete" style={iconBtn('#991B1B')}><Trash2 size={14} /></button>
          </>
        )}
      </div>

      <CDSCardPreview card={card} />

      <div style={{ borderTop: `1px solid ${colors.border}` }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FieldRow label="Severity" value={card.severity} onChange={v => updateField('severity', v as Severity)} type="select" />
        <FieldRow label="Title" value={card.title} onChange={v => updateField('title', v)} />
        <FieldRow label="Detail" value={card.detail} onChange={v => updateField('detail', v)} multiline />
        <FieldRow label="Suggestion" value={card.suggestion} onChange={v => updateField('suggestion', v)} />
        <FieldRow label="Link (optional)" value={card.link} onChange={v => updateField('link', v)} type="url" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          style={{
            fontSize: fontSize.label, fontWeight: fontWeight.medium,
            fontFamily: "'IBM Plex Sans', sans-serif",
            color: 'white', backgroundColor: isDirty ? '#1D4ED8' : colors.gray,
            border: 'none', borderRadius: 6, padding: '7px 16px',
            cursor: isDirty ? 'pointer' : 'default', opacity: isSaving ? 0.7 : 1,
          }}
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
        {isDirty && (
          <button
            onClick={() => { setCard(caseData.card); setIsDirty(false); onUpdate(caseData.card); }}
            style={{
              fontSize: fontSize.label, fontFamily: "'IBM Plex Sans', sans-serif",
              color: colors.gray, backgroundColor: 'transparent',
              border: `1px solid ${colors.border}`, borderRadius: 6, padding: '7px 16px', cursor: 'pointer',
            }}
          >
            Discard
          </button>
        )}
        {savedFlash && <span style={{ fontSize: fontSize.label, color: '#166534' }}>Saved</span>}
      </div>
    </div>
  );
}

function iconBtn(color: string): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 6, border: 'none',
    backgroundColor: 'transparent', color, cursor: 'pointer', flexShrink: 0,
  };
}

// ---------------------------------------------------------------------------
// Left nav — always expanded, flat sections → cases
// ---------------------------------------------------------------------------

function NavTree({
  data, selectedCaseId, onSelectCase, onAddCase, onDeleteCase,
}: {
  data: CDSData;
  selectedCaseId: string | null;
  onSelectCase: (sectionId: string, caseId: string) => void;
  onAddCase: (sectionId: string) => void;
  onDeleteCase: (sectionId: string, caseId: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 16 }}>
      {data.sections.map((section, si) => (
        <div key={section.id} style={{ marginTop: si > 0 ? 8 : 0 }}>
          {/* Section header */}
          <div style={{ padding: '8px 16px 4px' }}>
            <span style={{
              fontSize: fontSize.label,
              fontWeight: fontWeight.semibold,
              color: '#111827',
            }}>
              {section.label}
            </span>
          </div>

          {/* Cases */}
          {section.cases.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center' }}>
              <button
                onClick={() => onSelectCase(section.id, c.id)}
                style={{
                  flex: 1,
                  padding: '5px 8px 5px 24px',
                  background: selectedCaseId === c.id ? colors.lightBlue : 'none',
                  borderTop: 'none',
                  borderRight: 'none',
                  borderBottom: 'none',
                  borderLeft: `3px solid ${selectedCaseId === c.id ? colors.darkBlue : 'transparent'}`,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{
                  fontSize: fontSize.label,
                  color: selectedCaseId === c.id ? colors.darkBlue : '#4B5563',
                  fontWeight: selectedCaseId === c.id ? fontWeight.medium : fontWeight.regular,
                }}>
                  {c.label}
                </span>
              </button>
              <button
                onClick={() => onDeleteCase(section.id, c.id)}
                title="Delete case"
                style={{ ...iconBtn('#991B1B'), opacity: 0.35, marginRight: 4 }}
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}

          {/* Add case */}
          <button
            onClick={() => onAddCase(section.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 8px 4px 24px',
              background: 'none', border: 'none', cursor: 'pointer', color: colors.gray,
            }}
          >
            <Plus size={11} />
            <span style={{ fontSize: 12 }}>Add case</span>
          </button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface Selection { sectionId: string; caseId: string; }

export default function CDSCardLogicView() {
  const [data, setData]             = useState<CDSData | null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selection, setSelection]   = useState<Selection | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/cds-card-logic');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: CDSData = await res.json();
      setData(json);
      if (json.sections[0]?.cases[0]) {
        setSelection({ sectionId: json.sections[0].id, caseId: json.sections[0].cases[0].id });
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function persist(next: CDSData) {
    await fetch('/api/cds-card-logic', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
  }

  function findCase(d: CDSData, sel: Selection): Case | undefined {
    return d.sections.find(s => s.id === sel.sectionId)?.cases.find(c => c.id === sel.caseId);
  }

  function updateCase(sectionId: string, caseId: string, card: CDSCard) {
    if (!data) return;
    const next: CDSData = {
      sections: data.sections.map(s => s.id !== sectionId ? s : {
        ...s, cases: s.cases.map(c => c.id !== caseId ? c : { ...c, card }),
      }),
    };
    setData(next);
    persist(next);
  }

  function renameCase(sectionId: string, caseId: string, label: string) {
    if (!data) return;
    const next: CDSData = {
      sections: data.sections.map(s => s.id !== sectionId ? s : {
        ...s, cases: s.cases.map(c => c.id !== caseId ? c : { ...c, label }),
      }),
    };
    setData(next);
    persist(next);
  }

  function addCase(sectionId: string) {
    if (!data) return;
    const newCase: Case = {
      id: uid(),
      label: 'New Case',
      card: { severity: 'info', title: '', detail: '', suggestion: '', link: '' },
    };
    const next: CDSData = {
      sections: data.sections.map(s => s.id !== sectionId ? s : {
        ...s, cases: [...s.cases, newCase],
      }),
    };
    setData(next);
    persist(next);
    setSelection({ sectionId, caseId: newCase.id });
  }

  function deleteCase(sectionId: string, caseId: string) {
    if (!data) return;
    const next: CDSData = {
      sections: data.sections.map(s => s.id !== sectionId ? s : {
        ...s, cases: s.cases.filter(c => c.id !== caseId),
      }),
    };
    setData(next);
    persist(next);
    const remaining = next.sections.find(s => s.id === sectionId)?.cases;
    setSelection(remaining?.length ? { sectionId, caseId: remaining[0].id } : null);
  }

  if (isLoading) return <div style={{ padding: 40, color: colors.gray, fontSize: fontSize.label }}>Loading…</div>;
  if (fetchError) return <div style={{ padding: 40, color: '#991B1B', fontSize: fontSize.label }}>Error: {fetchError}</div>;
  if (!data) return null;

  const selectedCase = selection ? findCase(data, selection) : null;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left nav */}
      <div style={{
        width: 240,
        flexShrink: 0,
        borderRight: `1px solid ${colors.border}`,
        overflowY: 'auto',
        paddingTop: 8,
      }}>
        <NavTree
          data={data}
          selectedCaseId={selection?.caseId ?? null}
          onSelectCase={(sectionId, caseId) => setSelection({ sectionId, caseId })}
          onAddCase={addCase}
          onDeleteCase={deleteCase}
        />
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
        {selectedCase && selection ? (
          <CaseEditor
            key={selectedCase.id}
            caseData={selectedCase}
            onUpdate={(card) => updateCase(selection.sectionId, selection.caseId, card)}
            onDelete={() => deleteCase(selection.sectionId, selection.caseId)}
            onRename={(label) => renameCase(selection.sectionId, selection.caseId, label)}
          />
        ) : (
          <p style={{ color: colors.gray, fontSize: fontSize.label }}>
            Select a case from the left to view and edit its CDS card.
          </p>
        )}
      </div>
    </div>
  );
}
