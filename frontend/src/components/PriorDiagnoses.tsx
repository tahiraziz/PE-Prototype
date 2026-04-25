interface PriorDiagnosesProps {
  features: Record<string, unknown> | null;
}

interface HistoryItem {
  key: string;
  label: string;
  present: boolean | null; // null = unknown
}

/**
 * PriorDiagnoses - FIRST LAYER component
 * Shows prior PE/DVT, malignancy, surgery, etc. as prominent chips
 * Always visible on front page
 * 
 * NO EMOJIS - professional clinical interface
 */
export default function PriorDiagnoses({ features }: PriorDiagnosesProps) {
  if (!features) {
    return (
      <div className="prior-diagnoses">
        <div className="pd-label">Prior History</div>
        <div className="pd-row">
          <span className="pd-chip unknown">
            <span className="pd-text">History not loaded</span>
          </span>
        </div>
      </div>
    );
  }

  // Extract history flags from feature summary - clinical labels only, no icons
  const historyItems: HistoryItem[] = [
    {
      key: 'prior_pe',
      label: 'Prior PE',
      present: getFlag(features, ['prior_pe_diagnosis', 'prior_pe'])
    },
    {
      key: 'prior_dvt',
      label: 'Prior DVT',
      present: getFlag(features, ['prior_dvt_diagnosis', 'prior_dvt'])
    },
    {
      key: 'malignancy',
      label: 'Active malignancy',
      present: getFlag(features, ['active_cancer', 'active_malignancy', 'prior_cancer'])
    },
    {
      key: 'surgery',
      label: 'Recent surgery/immobilization',
      present: getFlag(features, ['recent_surgery', 'surgery_within_month', 'immobilization'])
    },
    {
      key: 'estrogen',
      label: 'Estrogen/pregnancy',
      present: getFlag(features, ['estrogen_use', 'oral_contraceptive', 'hrt', 'pregnancy', 'pregnant', 'postpartum'])
    },
    {
      key: 'thrombophilia',
      label: 'Thrombophilia',
      present: getFlag(features, ['thrombophilia', 'hypercoagulable', 'clotting_disorder'])
    }
  ];

  // Separate into present, absent, and unknown
  const presentItems = historyItems.filter(item => item.present === true);
  const unknownItems = historyItems.filter(item => item.present === null);
  const hasAnyKnown = historyItems.some(item => item.present !== null);

  return (
    <div className="prior-diagnoses">
      <div className="pd-label">Prior History / Risk Factors</div>
      <div className="pd-row">
        {presentItems.length > 0 ? (
          // Show all present risk factors
          presentItems.map(item => (
            <span key={item.key} className="pd-chip present">
              <span className="pd-text">{item.label}</span>
            </span>
          ))
        ) : hasAnyKnown ? (
          // No risk factors but we checked
          <span className="pd-chip none">
            <span className="pd-text">No high-risk history identified</span>
          </span>
        ) : (
          // All unknown
          <span className="pd-chip unknown">
            <span className="pd-text">History incomplete</span>
          </span>
        )}

        {/* Show unknown count if some are unknown but some are known */}
        {unknownItems.length > 0 && hasAnyKnown && unknownItems.length < historyItems.length && (
          <span 
            className="pd-chip unknown-count" 
            title={`Unknown: ${unknownItems.map(i => i.label).join(', ')}`}
          >
            <span className="pd-text">{unknownItems.length} unknown</span>
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Extract boolean flag from features, trying multiple possible keys
 * Returns: true (present), false (absent), null (unknown)
 */
function getFlag(features: Record<string, unknown>, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = features[key];
    
    // Explicit boolean
    if (value === true) return true;
    if (value === false) return false;
    
    // Numeric (1/0)
    if (value === 1) return true;
    if (value === 0) return false;
    
    // String "true"/"false"
    if (value === 'true' || value === 'True') return true;
    if (value === 'false' || value === 'False') return false;
  }
  
  // No key found or all null/undefined
  return null;
}
