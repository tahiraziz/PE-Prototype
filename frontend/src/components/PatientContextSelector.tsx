import { useState, useEffect } from 'react';

interface PatientSample {
  id: string;
  name: string;
  gender: string | null;
  birthDate: string | null;
}

interface PatientContextSelectorProps {
  sessionId: string | null;
  currentPatientId: string;
  onPatientLoad: (patientId: string) => void;
  isLoading: boolean;
}

/**
 * Patient context selector for clinician workflow.
 * Shows when authenticated with user/* scopes but no patient context from launch.
 */
export default function PatientContextSelector({
  sessionId,
  currentPatientId,
  onPatientLoad,
  isLoading
}: PatientContextSelectorProps) {
  const [patientIdInput, setPatientIdInput] = useState(currentPatientId || '');
  const [samples, setSamples] = useState<PatientSample[]>([]);
  const [samplesMessage, setSamplesMessage] = useState<string | null>(null);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch sample patients on mount if authenticated
  useEffect(() => {
    if (sessionId && samples.length === 0 && !loadingSamples) {
      fetchSamples();
    }
  }, [sessionId]);

  const fetchSamples = async () => {
    if (!sessionId) return;
    
    setLoadingSamples(true);
    setError(null);
    
    try {
      // Session is now read from cookie automatically
      const response = await fetch('/api/fhir/patient-samples', { credentials: 'include' });
      const data = await response.json();
      
      setSamples(data.samples || []);
      setSamplesMessage(data.message);
    } catch (err) {
      console.error('Failed to fetch patient samples:', err);
      setSamplesMessage('Could not load sample patients. Enter a Patient ID manually.');
    } finally {
      setLoadingSamples(false);
    }
  };

  const handleLoadPatient = () => {
    if (patientIdInput.trim()) {
      setError(null);
      onPatientLoad(patientIdInput.trim());
    } else {
      setError('Please enter a Patient ID');
    }
  };

  const handleSelectSample = (sample: PatientSample) => {
    setPatientIdInput(sample.id);
    onPatientLoad(sample.id);
  };

  if (!sessionId) {
    return null;
  }

  return (
    <div className="patient-context-selector">
      <div className="patient-context-header">
        <span className="patient-context-icon">👤</span>
        <span className="patient-context-title">Patient Context</span>
        {!currentPatientId && (
          <span className="patient-context-hint">
            Standalone clinician launch has no patient context. Enter a Patient ID.
          </span>
        )}
      </div>

      <div className="patient-context-content">
        <div className="patient-input-row">
          <input
            type="text"
            className="patient-id-input"
            value={patientIdInput}
            onChange={(e) => setPatientIdInput(e.target.value)}
            placeholder="Enter Patient ID (e.g., erXuFYUfucBZaryVksYEcMg3)"
            onKeyDown={(e) => e.key === 'Enter' && handleLoadPatient()}
          />
          <button
            className="load-patient-btn"
            onClick={handleLoadPatient}
            disabled={isLoading || !patientIdInput.trim()}
          >
            {isLoading ? '⏳ Loading...' : '📋 Load Patient'}
          </button>
        </div>

        {error && <div className="patient-context-error">{error}</div>}

        {/* Sample patients */}
        {samples.length > 0 && (
          <div className="patient-samples">
            <div className="samples-label">Sample patients:</div>
            <div className="samples-list">
              {samples.slice(0, 5).map((sample) => (
                <button
                  key={sample.id}
                  className="sample-btn"
                  onClick={() => handleSelectSample(sample)}
                  title={sample.id}
                >
                  {sample.name}
                  {sample.gender && <span className="sample-gender"> ({sample.gender.charAt(0).toUpperCase()})</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {loadingSamples && (
          <div className="patient-samples-loading">Loading sample patients...</div>
        )}

        {samplesMessage && !samples.length && (
          <div className="patient-samples-message">
            ℹ️ {samplesMessage}
          </div>
        )}

        {/* Known test IDs hint */}
        <div className="patient-known-ids">
          <span className="known-ids-label">Known Epic sandbox IDs:</span>
          <code onClick={() => setPatientIdInput('erXuFYUfucBZaryVksYEcMg3')}>erXuFYUfucBZaryVksYEcMg3</code>
          <code onClick={() => setPatientIdInput('eq081-VQEgP8drUUqCWzHfw3')}>eq081-VQEgP8drUUqCWzHfw3</code>
        </div>
      </div>
    </div>
  );
}

