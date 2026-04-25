interface TopBarProps {
  patientId: string;
  isLoading: boolean;
  isDemoMode: boolean;
  onRunAssessment: () => void;
  onToggleDemoMode: () => void;
}

/**
 * Minimal top bar - patient ID, demo toggle, run button
 * No clutter, just essentials
 */
export default function TopBar({
  patientId,
  isLoading,
  isDemoMode,
  onRunAssessment,
  onToggleDemoMode
}: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <span className="app-title">PE Rule-Out</span>
        <span className="patient-id">{patientId}</span>
      </div>
      
      <div className="top-bar-right">
        <label className="demo-toggle">
          <input
            type="checkbox"
            checked={isDemoMode}
            onChange={onToggleDemoMode}
          />
          <span>Demo</span>
        </label>
        
        <button
          className="run-btn"
          onClick={onRunAssessment}
          disabled={isLoading}
        >
          {isLoading ? 'Running...' : 'Run'}
        </button>
      </div>
    </header>
  );
}
