import { useState, useEffect } from 'react';

interface PriorWorkupTabProps {
  patientId: string;
}

interface DdimerPoint {
  time: string;
  value: number;
  unit: string;
}

interface ImagingStudy {
  date: string;
  type: string;
  title: string;
  snippet: string;
  full_text: string;
}

/**
 * Prior Workup Tab - Historical PE workup data.
 * 
 * Shows:
 * - D-Dimer trend (last 30 days)
 * - Previous PE-relevant imaging (CTPA, V/Q)
 */
export default function PriorWorkupTab({ patientId }: PriorWorkupTabProps) {
  const [ddimer, setDdimer] = useState<DdimerPoint[]>([]);
  const [imaging, setImaging] = useState<ImagingStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStudy, setExpandedStudy] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [patientId]);

  const loadData = async () => {
    setLoading(true);
    
    try {
      // Load D-Dimer and imaging in parallel
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
      console.error('Failed to load prior workup:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="prior-workup-tab">
        <div className="skeleton-loader">
          <div className="skeleton skeleton-chart"></div>
          <div className="skeleton skeleton-list"></div>
        </div>
      </div>
    );
  }

  // Latest D-Dimer
  const lastDdimer = ddimer.length > 0 ? ddimer[0] : null;

  return (
    <div className="prior-workup-tab">
      {/* D-Dimer Section */}
      <div className="ddimer-section">
        <div className="section-label">D-Dimer (Last 30 Days)</div>
        
        {lastDdimer ? (
          <div className="ddimer-content">
            <div className="ddimer-latest">
              <span className="ddimer-value">{lastDdimer.value.toFixed(2)}</span>
              <span className="ddimer-unit">{lastDdimer.unit || 'μg/mL'}</span>
              <span className="ddimer-date">
                {new Date(lastDdimer.time).toLocaleDateString()}
              </span>
            </div>
            
            {ddimer.length > 1 && (
              <div className="ddimer-trend">
                <svg width="200" height="50" className="ddimer-chart">
                  {/* Simple sparkline */}
                  {ddimer.slice(0, 10).reverse().map((point, i, arr) => {
                    if (i === 0) return null;
                    const maxVal = Math.max(...arr.map(p => p.value));
                    const minVal = Math.min(...arr.map(p => p.value));
                    const range = maxVal - minVal || 1;
                    
                    const x1 = ((i - 1) / (arr.length - 1)) * 190 + 5;
                    const y1 = 45 - ((arr[i - 1].value - minVal) / range) * 40;
                    const x2 = (i / (arr.length - 1)) * 190 + 5;
                    const y2 = 45 - ((point.value - minVal) / range) * 40;
                    
                    return (
                      <line
                        key={i}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#f59e0b"
                        strokeWidth="2"
                      />
                    );
                  })}
                </svg>
              </div>
            )}
          </div>
        ) : (
          <div className="no-data">No D-Dimer results found in last 30 days</div>
        )}
      </div>

      {/* Imaging Section */}
      <div className="imaging-section">
        <div className="section-label">PE-Relevant Imaging (Last 5 Years)</div>
        
        {imaging.length > 0 ? (
          <div className="imaging-list">
            {imaging.map((study, index) => (
              <div key={index} className="imaging-item">
                <div 
                  className="imaging-header"
                  onClick={() => setExpandedStudy(expandedStudy === index ? null : index)}
                >
                  <span className={`imaging-type type-${study.type.toLowerCase().replace(/\s/g, '-')}`}>
                    {study.type}
                  </span>
                  <span className="imaging-date">{study.date}</span>
                  <span className="imaging-expand">
                    {expandedStudy === index ? '▼' : '▶'}
                  </span>
                </div>
                
                <div className="imaging-title">{study.title}</div>
                
                {expandedStudy === index ? (
                  <div className="imaging-full-text">
                    {study.full_text || study.snippet || 'No report text available'}
                  </div>
                ) : (
                  <div className="imaging-snippet">
                    {study.snippet || 'No summary available'}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data">
            No PE-relevant imaging found (CTPA, CTA Chest, V/Q)
          </div>
        )}
      </div>
    </div>
  );
}

