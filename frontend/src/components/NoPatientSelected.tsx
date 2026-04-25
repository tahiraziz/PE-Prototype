interface NoPatientSelectedProps {
  message?: string;
}

/**
 * NoPatientSelected - Friendly empty state when no patient context
 * Professional styling - no emojis
 */
export default function NoPatientSelected({ message }: NoPatientSelectedProps) {
  return (
    <div className="no-patient-callout">
      <div className="callout-content">
        <span className="callout-title">
          {message || 'No patient selected'}
        </span>
        <span className="callout-hint">
          Use the patient selector above, or launch from SMART context.
        </span>
      </div>
    </div>
  );
}
