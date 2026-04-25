import { useState, useEffect, useCallback } from 'react';
import { Pencil, Check, X, RotateCcw } from 'lucide-react';
import { colors, fontSize, fontWeight } from '../../styles/tokens';
import MarkdownRenderer from './MarkdownRenderer';
import ComponentGallery from './ComponentGallery';
import PRDView from './PRDView';
import ClinicalThresholdsView from './ClinicalThresholdsView';
import FhirDataView from './FhirDataView';
import CDSCardLogicView from './CDSCardLogicView';

// ---------------------------------------------------------------------------
// Doc registry
// ---------------------------------------------------------------------------

type DocEntry =
  | { label: string; kind: 'editable-markdown'; apiId: string }
  | { label: string; kind: 'component' }
  | { label: string; kind: 'prd' }
  | { label: string; kind: 'clinical-thresholds' }
  | { label: string; kind: 'fhir-data' }
  | { label: string; kind: 'cds-card-logic' };

const DOCS: DocEntry[] = [
  { label: 'PRD',                 kind: 'prd' },
  { label: 'Clinical Thresholds', kind: 'clinical-thresholds' },
  { label: 'CDS Card Logic',      kind: 'cds-card-logic' },
  { label: 'FHIR Data',           kind: 'fhir-data' },
  { label: 'Design System',       kind: 'component' },
];

// ---------------------------------------------------------------------------
// Editable markdown view
// ---------------------------------------------------------------------------

function EditableMarkdownView({ apiId }: { apiId: string }) {
  const [savedContent, setSavedContent]   = useState<string | null>(null);
  const [draftContent, setDraftContent]   = useState('');
  const [isEditing, setIsEditing]         = useState(false);
  const [isSaving, setIsSaving]           = useState(false);
  const [isLoading, setIsLoading]         = useState(true);
  const [fetchError, setFetchError]       = useState<string | null>(null);
  const [saveError, setSaveError]         = useState<string | null>(null);
  const [savedFlash, setSavedFlash]       = useState(false);

  const fetchContent = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/docs/${apiId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSavedContent(data.content);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, [apiId]);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const handleEdit = () => {
    setDraftContent(savedContent ?? '');
    setSaveError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/docs/${apiId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: draftContent }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSavedContent(draftContent);
      setIsEditing(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const isDirty = draftContent !== (savedContent ?? '');

  // ── Toolbar ──
  const toolbar = (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
      marginBottom: 24,
    }}>
      {savedFlash && (
        <span style={{ fontSize: fontSize.label, color: colors.green, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Check size={13} /> Saved
        </span>
      )}
      {saveError && (
        <span style={{ fontSize: fontSize.label, color: colors.red }}>{saveError}</span>
      )}

      {!isEditing ? (
        <button
          onClick={handleEdit}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '0 12px', height: 32,
            fontSize: fontSize.label, fontWeight: fontWeight.medium,
            color: colors.darkBlue, backgroundColor: colors.lightBlue,
            border: `1px solid ${colors.darkBlue}`, borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          <Pencil size={13} />
          Edit
        </button>
      ) : (
        <>
          <button
            onClick={handleCancel}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '0 12px', height: 32,
              fontSize: fontSize.label, fontWeight: fontWeight.medium,
              color: colors.gray, backgroundColor: 'white',
              border: `1px solid ${colors.border}`, borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            <X size={13} />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '0 12px', height: 32,
              fontSize: fontSize.label, fontWeight: fontWeight.semibold,
              color: 'white', backgroundColor: isDirty ? colors.black : colors.gray,
              border: 'none', borderRadius: 4,
              cursor: isSaving || !isDirty ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            <Check size={13} />
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </>
      )}

      {!isEditing && (
        <button
          onClick={fetchContent}
          title="Reload from disk"
          style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '0 8px', height: 32,
            color: colors.gray, backgroundColor: 'transparent',
            border: `1px solid ${colors.border}`, borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={13} />
        </button>
      )}
    </div>
  );

  // ── Loading / error states ──
  if (isLoading) {
    return (
      <div style={{ maxWidth: 860 }}>
        {toolbar}
        <p style={{ fontSize: fontSize.body, color: colors.gray }}>Loading…</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ maxWidth: 860 }}>
        {toolbar}
        <p style={{ fontSize: fontSize.body, color: colors.red }}>
          Failed to load: {fetchError}
        </p>
        <button
          onClick={fetchContent}
          style={{
            marginTop: 12, fontSize: fontSize.label, color: colors.darkBlue,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Edit mode ──
  if (isEditing) {
    return (
      <div style={{ maxWidth: 860 }}>
        {toolbar}
        <textarea
          value={draftContent}
          onChange={e => setDraftContent(e.target.value)}
          spellCheck={false}
          style={{
            width: '100%',
            height: 'calc(100vh - 220px)',
            fontFamily: 'monospace',
            fontSize: 13,
            lineHeight: 1.7,
            color: colors.black,
            backgroundColor: '#FAFAFA',
            border: `1px solid ${colors.border}`,
            borderRadius: 6,
            padding: '16px',
            resize: 'none',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>
    );
  }

  // ── View mode ──
  return (
    <div style={{ maxWidth: 860 }}>
      {toolbar}
      <MarkdownRenderer content={savedContent ?? ''} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// DocsView
// ---------------------------------------------------------------------------

export default function DocsView() {
  const [selected, setSelected] = useState(0);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Left Nav */}
      <div style={{
        width: 200,
        flexShrink: 0,
        backgroundColor: 'white',
        borderRight: `1px solid ${colors.border}`,
        padding: '16px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}>
        <p style={{
          fontSize: 11,
          fontWeight: fontWeight.semibold,
          color: colors.gray,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          padding: '0 16px 8px',
        }}>
          Documentation
        </p>

        {DOCS.map((doc, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 16px',
              background: selected === i ? colors.lightBlue : 'transparent',
              border: 'none',
              borderLeft: `3px solid ${selected === i ? colors.darkBlue : 'transparent'}`,
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <span style={{
              fontSize: fontSize.label,
              fontWeight: selected === i ? fontWeight.semibold : fontWeight.regular,
              color: selected === i ? colors.darkBlue : colors.black,
            }}>
              {doc.label}
            </span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '32px 40px' }}>
        {(() => {
          const doc = DOCS[selected];
          if (doc.kind === 'component') return <ComponentGallery />;
          if (doc.kind === 'prd') return <PRDView />;
          if (doc.kind === 'clinical-thresholds') return <ClinicalThresholdsView />;
          if (doc.kind === 'fhir-data') return <FhirDataView />;
          if (doc.kind === 'cds-card-logic') return <CDSCardLogicView />;
          return <EditableMarkdownView key={doc.apiId} apiId={doc.apiId} />;
        })()}
      </div>
    </div>
  );
}
