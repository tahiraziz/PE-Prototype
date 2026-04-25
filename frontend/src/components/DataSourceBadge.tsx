interface DataSourceBadgeProps {
  isDemoMode: boolean;
  isAuthenticated: boolean;
  patientId: string | null;
}

/**
 * DataSourceBadge - Shows where clinical data is coming from
 * DEMO (fixtures) vs EPIC (FHIR)
 * 
 * Professional styling - no emojis
 */
export default function DataSourceBadge({ 
  isDemoMode, 
  isAuthenticated,
  patientId 
}: DataSourceBadgeProps) {
  // Determine data source
  let source: 'demo' | 'epic' | 'none' = 'none';
  let label = '';
  let tooltip = '';

  if (isDemoMode) {
    source = 'demo';
    label = 'DEMO';
    tooltip = 'Using demo scenarios (no backend connection)';
  } else if (isAuthenticated && patientId) {
    source = 'epic';
    label = 'EPIC FHIR';
    tooltip = 'Connected to Epic FHIR sandbox';
  } else {
    source = 'none';
    label = 'Not connected';
    tooltip = 'No data source connected';
  }

  return (
    <div className={`data-source-badge source-${source}`} title={tooltip}>
      <span className="source-dot" />
      <span className="source-label">{label}</span>
    </div>
  );
}
