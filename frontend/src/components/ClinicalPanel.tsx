import { useState, useEffect } from 'react';
import EssentialsTab from './clinical/EssentialsTab';
import MedsCoagsTab from './clinical/MedsCoagsTab';
import PriorWorkupTab from './clinical/PriorWorkupTab';

interface ClinicalPanelProps {
  patientId: string | null;
  isAuthenticated: boolean;
}

type TabId = 'essentials' | 'meds' | 'workup';

/**
 * Clinical Panel - History & Risk modules for PE decision support.
 * 
 * Shows three tabs:
 * - Essentials: Anticoag status, PE mimic diagnoses, vitals chart
 * - Meds & Coags: Detailed medication list, INR trend
 * - Prior Workup: D-Dimer trend, imaging studies
 */
export default function ClinicalPanel({ patientId, isAuthenticated }: ClinicalPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('essentials');
  const [summary, setSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load summary on patient selection
  useEffect(() => {
    if (patientId && isAuthenticated) {
      loadSummary();
    } else {
      setSummary(null);
    }
  }, [patientId, isAuthenticated]);

  const loadSummary = async () => {
    if (!patientId) return;
    
    setLoadingSummary(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/clinical/summary?patient_id=${patientId}`, {
        credentials: 'include'
      });
      
      if (response.status === 401) {
        setError('Not authenticated');
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load clinical summary:', err);
      setError('Failed to load clinical data');
    } finally {
      setLoadingSummary(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="clinical-panel clinical-panel-empty">
        <div className="clinical-panel-header">
          <span className="clinical-icon">📋</span>
          <span className="clinical-title">History & Risk</span>
        </div>
        <div className="clinical-empty-state">
          Connect to Epic to view clinical data
        </div>
      </div>
    );
  }

  if (!patientId) {
    return (
      <div className="clinical-panel clinical-panel-empty">
        <div className="clinical-panel-header">
          <span className="clinical-icon">📋</span>
          <span className="clinical-title">History & Risk</span>
        </div>
        <div className="clinical-empty-state">
          Select a patient to view clinical data
        </div>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'essentials', label: 'Essentials', icon: '⚡' },
    { id: 'meds', label: 'Meds & Coags', icon: '💊' },
    { id: 'workup', label: 'Prior Workup', icon: '🔬' }
  ];

  return (
    <div className="clinical-panel">
      <div className="clinical-panel-header">
        <span className="clinical-icon">📋</span>
        <span className="clinical-title">History & Risk</span>
        {loadingSummary && <span className="clinical-loading">Loading...</span>}
      </div>

      {/* Tab navigation */}
      <div className="clinical-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`clinical-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="clinical-error">
          ⚠️ {error}
          <button onClick={loadSummary}>Retry</button>
        </div>
      )}

      {/* Tab content */}
      <div className="clinical-tab-content">
        {activeTab === 'essentials' && (
          <EssentialsTab
            patientId={patientId}
            summary={summary}
            loading={loadingSummary}
          />
        )}
        {activeTab === 'meds' && (
          <MedsCoagsTab patientId={patientId} />
        )}
        {activeTab === 'workup' && (
          <PriorWorkupTab patientId={patientId} />
        )}
      </div>
    </div>
  );
}

