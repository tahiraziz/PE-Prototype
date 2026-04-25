import { useState } from 'react';

interface Patient {
  id: string;
  name: string;
  birthDate: string | null;
  gender: string | null;
}

interface SandboxTestPanelProps {
  sessionId: string | null;
  onSelectPatient: (patientId: string) => void;
  onRunAssessment: (patientId: string) => void;
  isLoading: boolean;
}

/**
 * Sandbox testing panel for Epic FHIR patient selection
 */
export default function SandboxTestPanel({
  sessionId,
  onSelectPatient,
  onRunAssessment,
  isLoading
}: SandboxTestPanelProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [manualPatientId, setManualPatientId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const loadPatients = async () => {
    if (!sessionId) {
      setError('No session. Please authenticate via /launch first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Session is now read from cookie automatically
      const response = await fetch('/api/fhir/patients?count=20', { credentials: 'include' });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const detail = data.detail || `HTTP ${response.status}`;
        // Enhance error message for 403
        if (response.status === 403) {
          throw new Error(`Forbidden: token lacks required scope. Check /api/auth/last-token for granted scopes.`);
        }
        throw new Error(detail);
      }
      
      const data = await response.json();
      setPatients(data.patients || []);
      
      if (data.patients?.length === 0) {
        setError('No patients returned. With user/* scopes, try entering a Patient ID manually (e.g., erXuFYUfucBZaryVksYEcMg3 for Epic sandbox).');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    setManualPatientId(patientId);
    onSelectPatient(patientId);
  };

  const handleRunAssessment = () => {
    const patientId = manualPatientId || selectedPatientId;
    if (patientId) {
      onRunAssessment(patientId);
    }
  };

  if (!sessionId) {
    return (
      <div className="sandbox-panel sandbox-no-session">
        <div className="sandbox-header">
          <span className="sandbox-icon">🔗</span>
          <span className="sandbox-title">Epic Sandbox Testing</span>
        </div>
        <div className="sandbox-auth-prompt">
          <p>Not authenticated. To test with Epic sandbox patients:</p>
          <a 
            href="/launch?iss=https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4" 
            className="auth-link"
          >
            → Launch SMART on FHIR Authentication
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="sandbox-panel">
      <button 
        className="sandbox-header clickable"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="sandbox-icon">🧪</span>
        <span className="sandbox-title">Epic Sandbox Testing</span>
        <span className="sandbox-status">✓ Authenticated</span>
        <span className="sandbox-chevron">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="sandbox-content">
          {/* Patient List Section */}
          <div className="sandbox-section">
            <div className="section-row">
              <button
                className="load-btn"
                onClick={loadPatients}
                disabled={loading}
              >
                {loading ? 'Loading...' : '📋 Load Patients'}
              </button>
              <span className="patient-count">
                {patients.length > 0 && `${patients.length} patients`}
              </span>
            </div>

            {error && (
              <div className="sandbox-error">
                ⚠ {error}
              </div>
            )}

            {patients.length > 0 && (
              <div className="patient-list">
                {patients.map((patient) => (
                  <button
                    key={patient.id}
                    className={`patient-item ${selectedPatientId === patient.id ? 'selected' : ''}`}
                    onClick={() => handleSelectPatient(patient.id)}
                  >
                    <span className="patient-name">{patient.name}</span>
                    <span className="patient-meta">
                      {patient.gender?.charAt(0).toUpperCase() || '?'} • {patient.birthDate || 'DOB unknown'}
                    </span>
                    <span className="patient-id-small">{patient.id.slice(0, 20)}...</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Manual Entry Section */}
          <div className="sandbox-section">
            <label className="input-label">Patient ID (required with user/* scopes)</label>
            <div className="input-row">
              <input
                type="text"
                className="patient-id-input"
                value={manualPatientId}
                onChange={(e) => setManualPatientId(e.target.value)}
                placeholder="e.g., erXuFYUfucBZaryVksYEcMg3"
              />
              <button
                className="run-btn"
                onClick={handleRunAssessment}
                disabled={isLoading || !manualPatientId}
              >
                {isLoading ? 'Running...' : '▶ Run Assessment'}
              </button>
            </div>
            <div className="sandbox-hint">
              Epic sandbox test patients: <code>erXuFYUfucBZaryVksYEcMg3</code>, <code>eq081-VQEgP8drUUqCWzHfw3</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

