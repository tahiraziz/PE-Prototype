import { useState, useCallback } from 'react';
import { safeFetch } from '../utils/safeFetch';
import { isValidPatientId } from '../utils/patientId';

interface SupportingDataAccordionProps {
  patientId: string | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
}

interface AccordionSection {
  id: string;
  label: string;
  content: React.ReactNode;
}

/**
 * SupportingDataAccordion - Layer 2: Optional drilldown data
 * Single accordion with expandable sections for:
 * - Vitals trend
 * - D-Dimer trend  
 * - Prior imaging
 * - Medications/coags
 * - Diagnoses
 * 
 * Lazy-loads data on expand. Professional styling.
 */
export default function SupportingDataAccordion({
  patientId,
  isAuthenticated,
  isDemoMode
}: SupportingDataAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [sectionData, setSectionData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const loadSectionData = useCallback(async (sectionId: string) => {
    if (isDemoMode) {
      // Demo mode: no API calls, show placeholder
      setSectionData(prev => ({ ...prev, [sectionId]: { demo: true, message: 'Demo data' } }));
      return;
    }

    if (!isAuthenticated || !isValidPatientId(patientId)) {
      setErrors(prev => ({ ...prev, [sectionId]: 'No patient selected' }));
      return;
    }

    setLoading(prev => ({ ...prev, [sectionId]: true }));
    setErrors(prev => ({ ...prev, [sectionId]: null }));

    let endpoint = '';
    switch (sectionId) {
      case 'vitals':
        endpoint = `/api/clinical/vitals?patient_id=${encodeURIComponent(patientId!)}&hours=24`;
        break;
      case 'ddimer':
        endpoint = `/api/clinical/ddimer?patient_id=${encodeURIComponent(patientId!)}&days=30`;
        break;
      case 'imaging':
        endpoint = `/api/clinical/imaging?patient_id=${encodeURIComponent(patientId!)}&years=2`;
        break;
      case 'meds':
        endpoint = `/api/clinical/anticoagulation?patient_id=${encodeURIComponent(patientId!)}`;
        break;
      case 'diagnoses':
        endpoint = `/api/clinical/diagnoses?patient_id=${encodeURIComponent(patientId!)}&years=3`;
        break;
      default:
        return;
    }

    const { data, error } = await safeFetch<unknown>(endpoint);
    
    setLoading(prev => ({ ...prev, [sectionId]: false }));
    
    if (error) {
      setErrors(prev => ({ ...prev, [sectionId]: error }));
    } else {
      setSectionData(prev => ({ ...prev, [sectionId]: data }));
    }
  }, [patientId, isAuthenticated, isDemoMode]);

  const toggleSection = (sectionId: string) => {
    if (expandedSection === sectionId) {
      setExpandedSection(null);
    } else {
      setExpandedSection(sectionId);
      // Load data if not already loaded
      if (!sectionData[sectionId] && !loading[sectionId]) {
        loadSectionData(sectionId);
      }
    }
  };

  const renderSectionContent = (sectionId: string) => {
    if (loading[sectionId]) {
      return <div className="section-loading">Loading...</div>;
    }
    
    if (errors[sectionId]) {
      return <div className="section-error">{errors[sectionId]}</div>;
    }
    
    const data = sectionData[sectionId] as Record<string, unknown> | undefined;
    
    if (!data) {
      return <div className="section-empty">No data loaded</div>;
    }

    // Demo mode placeholder
    if (isDemoMode) {
      return <div className="section-demo">Demo mode - full data not available</div>;
    }

    // Render based on section type
    switch (sectionId) {
      case 'vitals':
        return renderVitalsSection(data);
      case 'ddimer':
        return renderDdimerSection(data);
      case 'imaging':
        return renderImagingSection(data);
      case 'meds':
        return renderMedsSection(data);
      case 'diagnoses':
        return renderDiagnosesSection(data);
      default:
        return <div className="section-empty">Unknown section</div>;
    }
  };

  const sections: { id: string; label: string }[] = [
    { id: 'vitals', label: 'Vitals Trend' },
    { id: 'ddimer', label: 'D-Dimer Trend' },
    { id: 'imaging', label: 'Prior Imaging' },
    { id: 'meds', label: 'Medications / Anticoagulation' },
    { id: 'diagnoses', label: 'Diagnoses' }
  ];

  return (
    <div className="supporting-data-accordion">
      <button 
        className={`accordion-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="toggle-label">View supporting data</span>
        <span className="toggle-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>
      
      {isOpen && (
        <div className="accordion-content">
          {sections.map(section => (
            <div key={section.id} className="accordion-section">
              <button
                className={`section-header ${expandedSection === section.id ? 'expanded' : ''}`}
                onClick={() => toggleSection(section.id)}
                aria-expanded={expandedSection === section.id}
              >
                <span className="section-name">{section.label}</span>
                <span className="section-arrow">{expandedSection === section.id ? '−' : '+'}</span>
              </button>
              
              {expandedSection === section.id && (
                <div className="section-body">
                  {renderSectionContent(section.id)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Section renderers

function renderVitalsSection(data: Record<string, unknown>) {
  const series = data.series as Record<string, unknown[]> | undefined;
  if (!series) {
    return <div className="section-empty">No vitals data available</div>;
  }
  
  const hr = (series.hr || []).length;
  const spo2 = (series.spo2 || []).length;
  const rr = (series.rr || []).length;
  const sbp = (series.sbp || []).length;
  
  return (
    <div className="vitals-summary">
      <div className="summary-text">
        Data points: HR ({hr}), SpO₂ ({spo2}), RR ({rr}), SBP ({sbp})
      </div>
      {hr === 0 && spo2 === 0 && rr === 0 && sbp === 0 && (
        <div className="no-data-note">No vitals recorded in timeframe</div>
      )}
    </div>
  );
}

function renderDdimerSection(data: Record<string, unknown>) {
  const series = data.series as unknown[] | undefined;
  if (!series || series.length === 0) {
    return <div className="section-empty">No D-Dimer results found</div>;
  }
  
  return (
    <div className="ddimer-summary">
      <div className="summary-text">{series.length} D-Dimer result(s) in last 30 days</div>
      <div className="ddimer-list">
        {(series as Array<{ value: number; time: string; unit?: string }>).slice(0, 5).map((item, i) => (
          <div key={i} className="ddimer-item">
            <span className="value">{item.value?.toFixed(2) || '—'} {item.unit || 'μg/mL'}</span>
            <span className="date">{item.time ? new Date(item.time).toLocaleDateString() : '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderImagingSection(data: Record<string, unknown>) {
  const studies = data.studies as unknown[] | undefined;
  if (!studies || studies.length === 0) {
    return <div className="section-empty">No relevant imaging found (CTPA, V/Q)</div>;
  }
  
  return (
    <div className="imaging-list">
      {(studies as Array<{ type: string; date: string; impression?: string }>).map((study, i) => (
        <div key={i} className="imaging-item">
          <div className="imaging-header">
            <span className="type">{study.type}</span>
            <span className="date">{study.date ? new Date(study.date).toLocaleDateString() : '—'}</span>
          </div>
          {study.impression && (
            <div className="impression">{study.impression}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function renderMedsSection(data: Record<string, unknown>) {
  const status = data.status as string | undefined;
  const meds = data.active_meds as unknown[] | undefined;
  
  return (
    <div className="meds-summary">
      <div className="anticoag-status">
        Anticoagulation: <span className={`status-${status || 'unknown'}`}>{status || 'Unknown'}</span>
      </div>
      {meds && meds.length > 0 ? (
        <div className="meds-list">
          {(meds as Array<{ name: string; dose?: string }>).map((med, i) => (
            <div key={i} className="med-item">
              {med.name} {med.dose && <span className="dose">({med.dose})</span>}
            </div>
          ))}
        </div>
      ) : (
        <div className="no-data-note">No anticoagulant medications found</div>
      )}
    </div>
  );
}

function renderDiagnosesSection(data: Record<string, unknown>) {
  const diagnoses = data.diagnoses as unknown[] | undefined;
  if (!diagnoses || diagnoses.length === 0) {
    return <div className="section-empty">No relevant diagnoses found</div>;
  }
  
  return (
    <div className="diagnoses-list">
      {(diagnoses as Array<{ display: string; date?: string }>).slice(0, 10).map((dx, i) => (
        <div key={i} className="diagnosis-item">
          <span className="name">{dx.display}</span>
          {dx.date && <span className="date">{new Date(dx.date).toLocaleDateString()}</span>}
        </div>
      ))}
    </div>
  );
}

