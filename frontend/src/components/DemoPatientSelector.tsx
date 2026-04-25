import { useState } from 'react';

interface DemoPatientSelectorProps {
  currentPatientId: string;
  onSelectPatient: (patientId: string) => void;
  isAuthenticated: boolean;
}

// Known Epic sandbox test patients with varying data richness
const DEMO_PATIENTS = [
  { 
    id: 'erXuFYUfucBZaryVksYEcMg3', 
    name: 'Camila Lopez', 
    description: 'Adult female, multiple conditions' 
  },
  { 
    id: 'eq081-VQEgP8drUUqCWzHfw3', 
    name: 'John Smith', 
    description: 'Adult male, vitals available' 
  },
  { 
    id: 'Tbt3KuCY0B5PSrJvCu2j-PlK.aiHsu2xUjUM8bWpetXoB', 
    name: 'Test Patient', 
    description: 'Standard test patient' 
  },
  { 
    id: 'eAB3mDIBBcyUKviyzrxsnAw3', 
    name: 'Emily Williams', 
    description: 'Adult female, ED encounter' 
  },
  { 
    id: 'egqBHVfQlt4Bw3XGXoxVxHg3', 
    name: 'Michael Johnson', 
    description: 'Adult male, lab results' 
  }
];

/**
 * Demo Patient Selector
 * Dropdown for selecting known sandbox test patients + manual entry
 */
export default function DemoPatientSelector({ 
  currentPatientId, 
  onSelectPatient,
  isAuthenticated 
}: DemoPatientSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [manualId, setManualId] = useState('');
  const [showManual, setShowManual] = useState(false);

  if (!isAuthenticated) {
    return null;
  }

  const handleSelectPreset = (id: string) => {
    onSelectPatient(id);
    setIsOpen(false);
  };

  const handleManualSubmit = () => {
    if (manualId.trim()) {
      onSelectPatient(manualId.trim());
      setIsOpen(false);
      setShowManual(false);
    }
  };

  const currentPatient = DEMO_PATIENTS.find(p => p.id === currentPatientId);

  return (
    <div className="demo-patient-selector">
      <button 
        className="selector-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="selector-label">
          Patient: {currentPatient ? currentPatient.name : 'Select'}
        </span>
        <span className="selector-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="selector-dropdown">
          <div className="dropdown-header">Demo Patients</div>
          
          {DEMO_PATIENTS.map(patient => (
            <button
              key={patient.id}
              className={`patient-option ${patient.id === currentPatientId ? 'selected' : ''}`}
              onClick={() => handleSelectPreset(patient.id)}
            >
              <span className="patient-name">{patient.name}</span>
              <span className="patient-desc">{patient.description}</span>
            </button>
          ))}

          <div className="dropdown-divider" />
          
          {showManual ? (
            <div className="manual-entry">
              <input
                type="text"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="Enter Patient ID"
                className="manual-input"
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              />
              <button className="manual-submit" onClick={handleManualSubmit}>
                Load
              </button>
            </div>
          ) : (
            <button 
              className="manual-toggle"
              onClick={() => setShowManual(true)}
            >
              + Enter Patient ID manually
            </button>
          )}
        </div>
      )}
    </div>
  );
}

