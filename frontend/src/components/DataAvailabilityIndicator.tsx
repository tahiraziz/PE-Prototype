import { useEffect, useState } from 'react';

interface DataAvailabilityIndicatorProps {
  patientId: string | null;
  isAuthenticated: boolean;
}

interface AvailabilityData {
  availability: 'complete' | 'partial' | 'sparse' | 'unknown';
  present: {
    vitals: boolean;
    ddimer: boolean;
    imaging: boolean;
    meds: boolean;
    conditions: boolean;
  };
  missing: string[];
}

/**
 * Data Availability Indicator
 * Shows data completeness status for the current patient
 */
export default function DataAvailabilityIndicator({ 
  patientId, 
  isAuthenticated 
}: DataAvailabilityIndicatorProps) {
  const [data, setData] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (patientId && isAuthenticated) {
      loadAvailability();
    } else {
      setData(null);
    }
  }, [patientId, isAuthenticated]);

  const loadAvailability = async () => {
    if (!patientId) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `/api/clinical/data-availability?patient_id=${patientId}`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (err) {
      console.error('Failed to load data availability:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || !patientId || loading) {
    return null;
  }

  if (!data) return null;

  const getStatusClass = () => {
    switch (data.availability) {
      case 'complete': return 'status-complete';
      case 'partial': return 'status-partial';
      case 'sparse': return 'status-sparse';
      default: return 'status-unknown';
    }
  };

  const getStatusLabel = () => {
    switch (data.availability) {
      case 'complete': return 'Data Complete';
      case 'partial': return 'Partial Data';
      case 'sparse': return 'Limited Data';
      default: return 'Unknown';
    }
  };

  const getStatusIcon = () => {
    switch (data.availability) {
      case 'complete': return '●';
      case 'partial': return '◐';
      case 'sparse': return '○';
      default: return '?';
    }
  };

  return (
    <div className={`data-availability ${getStatusClass()}`}>
      <span className="availability-icon">{getStatusIcon()}</span>
      <span className="availability-label">{getStatusLabel()}</span>
      {data.missing.length > 0 && (
        <span className="availability-missing" title={data.missing.join(', ')}>
          Missing: {data.missing.slice(0, 2).join(', ')}
          {data.missing.length > 2 && ` +${data.missing.length - 2}`}
        </span>
      )}
    </div>
  );
}

