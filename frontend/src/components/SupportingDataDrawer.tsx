import { useState, useEffect } from 'react';
import VitalsChart from './clinical/VitalsChart';

interface SupportingDataDrawerProps {
  patientId: string | null;
  isAuthenticated: boolean;
}

type AccordionId = 'vitals' | 'meds' | 'workup';

/**
 * Supporting Data Drawer - Layer 3 component
 * Collapsed drawer with accordions for detailed data
 */
export default function SupportingDataDrawer({ patientId, isAuthenticated }: SupportingDataDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedAccordion, setExpandedAccordion] = useState<AccordionId | null>(null);
  
  // Lazy-loaded data
  const [vitals, setVitals] = useState<any>(null);
  const [anticoag, setAnticoag] = useState<any>(null);
  const [inr, setInr] = useState<any[]>([]);
  const [ddimer, setDdimer] = useState<any[]>([]);
  const [imaging, setImaging] = useState<any[]>([]);
  
  const [loading, setLoading] = useState<Record<AccordionId, boolean>>({
    vitals: false,
    meds: false,
    workup: false
  });

  // Lazy load data when accordion is expanded
  useEffect(() => {
    if (!patientId || !isAuthenticated || !expandedAccordion) return;
    
    if (expandedAccordion === 'vitals' && !vitals) {
      loadVitals();
    } else if (expandedAccordion === 'meds' && !anticoag) {
      loadMeds();
    } else if (expandedAccordion === 'workup' && ddimer.length === 0 && imaging.length === 0) {
      loadWorkup();
    }
  }, [expandedAccordion, patientId, isAuthenticated]);

  const loadVitals = async () => {
    if (!patientId) return;
    setLoading(prev => ({ ...prev, vitals: true }));
    try {
      const res = await fetch(`/api/clinical/vitals?patient_id=${patientId}&hours=24`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setVitals(data.series);
      }
    } catch (err) {
      console.error('Failed to load vitals:', err);
    } finally {
      setLoading(prev => ({ ...prev, vitals: false }));
    }
  };

  const loadMeds = async () => {
    if (!patientId) return;
    setLoading(prev => ({ ...prev, meds: true }));
    try {
      const [anticoagRes, inrRes] = await Promise.all([
        fetch(`/api/clinical/anticoagulation?patient_id=${patientId}`, { credentials: 'include' }),
        fetch(`/api/clinical/inr?patient_id=${patientId}&days=30`, { credentials: 'include' })
      ]);
      
      if (anticoagRes.ok) {
        setAnticoag(await anticoagRes.json());
      }
      if (inrRes.ok) {
        const data = await inrRes.json();
        setInr(data.series || []);
      }
    } catch (err) {
      console.error('Failed to load meds:', err);
    } finally {
      setLoading(prev => ({ ...prev, meds: false }));
    }
  };

  const loadWorkup = async () => {
    if (!patientId) return;
    setLoading(prev => ({ ...prev, workup: true }));
    try {
      const [ddimerRes, imagingRes] = await Promise.all([
        fetch(`/api/clinical/ddimer?patient_id=${patientId}&days=30`, { credentials: 'include' }),
        fetch(`/api/clinical/imaging?patient_id=${patientId}&years=5&type=all`, { credentials: 'include' })
      ]);
      
      if (ddimerRes.ok) {
        const data = await ddimerRes.json();
        setDdimer(data.series || []);
      }
      if (imagingRes.ok) {
        const data = await imagingRes.json();
        setImaging(data.studies || []);
      }
    } catch (err) {
      console.error('Failed to load workup:', err);
    } finally {
      setLoading(prev => ({ ...prev, workup: false }));
    }
  };

  const toggleAccordion = (id: AccordionId) => {
    setExpandedAccordion(expandedAccordion === id ? null : id);
  };

  if (!isAuthenticated || !patientId) {
    return null;
  }

  return (
    <div className="supporting-drawer">
      <button 
        className={`drawer-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="drawer-icon">{isOpen ? '▼' : '▶'}</span>
        <span className="drawer-title">View supporting data</span>
      </button>

      {isOpen && (
        <div className="drawer-content">
          {/* Vitals Trends Accordion */}
          <div className="accordion">
            <button 
              className={`accordion-header ${expandedAccordion === 'vitals' ? 'active' : ''}`}
              onClick={() => toggleAccordion('vitals')}
            >
              <span className="accordion-icon">{expandedAccordion === 'vitals' ? '−' : '+'}</span>
              <span>Vitals Trends</span>
            </button>
            {expandedAccordion === 'vitals' && (
              <div className="accordion-body">
                {loading.vitals ? (
                  <div className="loading-skeleton">Loading vitals...</div>
                ) : vitals ? (
                  <VitalsChart data={vitals} />
                ) : (
                  <div className="no-data">No vitals data available</div>
                )}
              </div>
            )}
          </div>

          {/* Medications & Coagulation Accordion */}
          <div className="accordion">
            <button 
              className={`accordion-header ${expandedAccordion === 'meds' ? 'active' : ''}`}
              onClick={() => toggleAccordion('meds')}
            >
              <span className="accordion-icon">{expandedAccordion === 'meds' ? '−' : '+'}</span>
              <span>Medications & Coagulation</span>
            </button>
            {expandedAccordion === 'meds' && (
              <div className="accordion-body">
                {loading.meds ? (
                  <div className="loading-skeleton">Loading medications...</div>
                ) : (
                  <div className="meds-content">
                    {/* Anticoag Status */}
                    <div className="meds-status-row">
                      <span className="status-label">Anticoagulation:</span>
                      <span className={`status-value status-${anticoag?.status || 'unknown'}`}>
                        {anticoag?.status === 'on_anticoagulant' ? 'On Anticoagulant' :
                         anticoag?.status === 'none' ? 'None' : 'Unknown'}
                      </span>
                    </div>
                    
                    {/* Active Meds */}
                    {anticoag?.medications?.filter((m: any) => m.status === 'active').length > 0 && (
                      <div className="active-meds">
                        <div className="meds-label">Active:</div>
                        {anticoag.medications
                          .filter((m: any) => m.status === 'active')
                          .map((m: any, i: number) => (
                            <span key={i} className={`med-chip type-${m.type.toLowerCase()}`}>
                              {m.name}
                            </span>
                          ))}
                      </div>
                    )}
                    
                    {/* INR Chart (if on warfarin) */}
                    {anticoag?.has_warfarin && (
                      <div className="inr-section">
                        <div className="section-title">INR (Last 30 Days)</div>
                        {inr.length > 0 ? (
                          <div className="inr-display">
                            <div className="inr-latest">
                              <span className="inr-value">{inr[0].value.toFixed(1)}</span>
                              <span className="inr-date">
                                {new Date(inr[0].time).toLocaleDateString()}
                              </span>
                            </div>
                            {inr.length > 1 && (
                              <svg width="150" height="40" className="inr-sparkline">
                                {inr.slice(0, 10).reverse().map((point, i, arr) => {
                                  if (i === 0) return null;
                                  const x1 = ((i - 1) / (arr.length - 1)) * 140 + 5;
                                  const y1 = 35 - ((arr[i - 1].value - 1) / 4) * 30;
                                  const x2 = (i / (arr.length - 1)) * 140 + 5;
                                  const y2 = 35 - ((point.value - 1) / 4) * 30;
                                  return (
                                    <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                                      stroke="#8b5cf6" strokeWidth="2" />
                                  );
                                })}
                              </svg>
                            )}
                          </div>
                        ) : (
                          <div className="no-data">No INR data</div>
                        )}
                      </div>
                    )}
                    
                    {!anticoag?.medications?.length && (
                      <div className="no-data">No anticoagulant medications found</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Prior PE Workup Accordion */}
          <div className="accordion">
            <button 
              className={`accordion-header ${expandedAccordion === 'workup' ? 'active' : ''}`}
              onClick={() => toggleAccordion('workup')}
            >
              <span className="accordion-icon">{expandedAccordion === 'workup' ? '−' : '+'}</span>
              <span>Prior PE Workup</span>
            </button>
            {expandedAccordion === 'workup' && (
              <div className="accordion-body">
                {loading.workup ? (
                  <div className="loading-skeleton">Loading workup data...</div>
                ) : (
                  <div className="workup-content">
                    {/* D-Dimer History */}
                    <div className="ddimer-section">
                      <div className="section-title">D-Dimer (Last 30 Days)</div>
                      {ddimer.length > 0 ? (
                        <div className="ddimer-list">
                          {ddimer.slice(0, 5).map((d, i) => (
                            <div key={i} className={`ddimer-item ${d.value > 0.5 ? 'elevated' : ''}`}>
                              <span className="ddimer-value">{d.value.toFixed(2)}</span>
                              <span className="ddimer-unit">{d.unit}</span>
                              <span className="ddimer-date">
                                {new Date(d.time).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="no-data">No D-Dimer results</div>
                      )}
                    </div>
                    
                    {/* Imaging */}
                    <div className="imaging-section">
                      <div className="section-title">PE-Related Imaging</div>
                      {imaging.length > 0 ? (
                        <div className="imaging-list">
                          {imaging.map((study, i) => (
                            <div key={i} className="imaging-item-compact">
                              <span className={`imaging-type type-${study.type.toLowerCase().replace(/\s/g, '-')}`}>
                                {study.type}
                              </span>
                              <span className="imaging-date">{study.date}</span>
                              <span className="imaging-snippet">{study.snippet || study.title}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="no-data">No PE-related imaging found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

