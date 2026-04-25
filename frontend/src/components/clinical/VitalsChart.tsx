import { useState, useMemo } from 'react';

interface VitalPoint {
  time: string;
  value: number;
}

interface VitalsChartProps {
  data: {
    hr: VitalPoint[];
    spo2: VitalPoint[];
    rr: VitalPoint[];
    sbp: VitalPoint[];
  };
}

type VitalType = 'hr' | 'spo2' | 'rr' | 'sbp';

const VITAL_CONFIG: Record<VitalType, { label: string; color: string; unit: string; range: [number, number] }> = {
  hr: { label: 'HR', color: '#ef4444', unit: 'bpm', range: [40, 160] },
  spo2: { label: 'SpO₂', color: '#3b82f6', unit: '%', range: [80, 100] },
  rr: { label: 'RR', color: '#22c55e', unit: '/min', range: [8, 40] },
  sbp: { label: 'SBP', color: '#8b5cf6', unit: 'mmHg', range: [60, 200] }
};

/**
 * Compact vitals trend chart using SVG.
 * Shows HR, SpO2, RR, SBP with toggle controls.
 */
export default function VitalsChart({ data }: VitalsChartProps) {
  const [visibleVitals, setVisibleVitals] = useState<Set<VitalType>>(
    new Set(['hr', 'spo2'])
  );

  const toggleVital = (vital: VitalType) => {
    const newSet = new Set(visibleVitals);
    if (newSet.has(vital)) {
      newSet.delete(vital);
    } else {
      newSet.add(vital);
    }
    setVisibleVitals(newSet);
  };

  // Chart dimensions
  const width = 280;
  const height = 120;
  const padding = { top: 10, right: 10, bottom: 20, left: 30 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Compute time range
  const timeRange = useMemo(() => {
    let minTime = Infinity;
    let maxTime = -Infinity;
    
    (Object.keys(data) as VitalType[]).forEach(vital => {
      data[vital]?.forEach(point => {
        const t = new Date(point.time).getTime();
        if (t < minTime) minTime = t;
        if (t > maxTime) maxTime = t;
      });
    });
    
    if (minTime === Infinity) {
      const now = Date.now();
      return { min: now - 24 * 60 * 60 * 1000, max: now };
    }
    
    return { min: minTime, max: maxTime };
  }, [data]);

  // Convert time to x coordinate
  const timeToX = (time: string) => {
    const t = new Date(time).getTime();
    const ratio = (t - timeRange.min) / (timeRange.max - timeRange.min);
    return padding.left + ratio * chartWidth;
  };

  // Convert value to y coordinate (normalized per vital)
  const valueToY = (value: number, vital: VitalType) => {
    const [min, max] = VITAL_CONFIG[vital].range;
    const ratio = (value - min) / (max - min);
    return padding.top + chartHeight - ratio * chartHeight;
  };

  // Generate path for a vital
  const getPath = (vital: VitalType): string => {
    const points = data[vital] || [];
    if (points.length === 0) return '';
    
    // Sort by time
    const sorted = [...points].sort((a, b) => 
      new Date(a.time).getTime() - new Date(b.time).getTime()
    );
    
    const pathParts = sorted.map((point, i) => {
      const x = timeToX(point.time);
      const y = valueToY(point.value, vital);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    
    return pathParts.join(' ');
  };

  // Get latest value for legend
  const getLatestValue = (vital: VitalType): string => {
    const points = data[vital] || [];
    if (points.length === 0) return '—';
    
    const sorted = [...points].sort((a, b) => 
      new Date(b.time).getTime() - new Date(a.time).getTime()
    );
    
    return `${sorted[0].value}`;
  };

  const hasData = Object.values(data).some(arr => arr && arr.length > 0);

  if (!hasData) {
    return (
      <div className="vitals-chart-empty">
        <span>No vitals data available</span>
      </div>
    );
  }

  return (
    <div className="vitals-chart">
      {/* Toggle controls */}
      <div className="vitals-toggles">
        {(Object.keys(VITAL_CONFIG) as VitalType[]).map(vital => {
          const config = VITAL_CONFIG[vital];
          const isActive = visibleVitals.has(vital);
          const latestValue = getLatestValue(vital);
          const hasVitalData = (data[vital]?.length || 0) > 0;
          
          return (
            <button
              key={vital}
              className={`vital-toggle ${isActive ? 'active' : ''} ${!hasVitalData ? 'no-data' : ''}`}
              onClick={() => hasVitalData && toggleVital(vital)}
              style={{ borderColor: isActive ? config.color : undefined }}
              disabled={!hasVitalData}
            >
              <span 
                className="vital-dot" 
                style={{ backgroundColor: isActive ? config.color : '#9ca3af' }}
              />
              <span className="vital-label">{config.label}</span>
              <span className="vital-value">{latestValue}</span>
            </button>
          );
        })}
      </div>

      {/* SVG Chart */}
      <svg width={width} height={height} className="vitals-svg">
        {/* Grid lines */}
        <line 
          x1={padding.left} y1={padding.top}
          x2={padding.left} y2={height - padding.bottom}
          stroke="#e5e7eb" strokeWidth="1"
        />
        <line 
          x1={padding.left} y1={height - padding.bottom}
          x2={width - padding.right} y2={height - padding.bottom}
          stroke="#e5e7eb" strokeWidth="1"
        />
        
        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75].map(ratio => (
          <line
            key={ratio}
            x1={padding.left}
            y1={padding.top + chartHeight * (1 - ratio)}
            x2={width - padding.right}
            y2={padding.top + chartHeight * (1 - ratio)}
            stroke="#f3f4f6"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        {/* Vital lines */}
        {(Object.keys(VITAL_CONFIG) as VitalType[]).map(vital => {
          if (!visibleVitals.has(vital)) return null;
          const path = getPath(vital);
          if (!path) return null;
          
          return (
            <path
              key={vital}
              d={path}
              fill="none"
              stroke={VITAL_CONFIG[vital].color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {/* Time labels */}
        <text 
          x={padding.left} 
          y={height - 4} 
          fontSize="10" 
          fill="#9ca3af"
        >
          {new Date(timeRange.min).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </text>
        <text 
          x={width - padding.right} 
          y={height - 4} 
          fontSize="10" 
          fill="#9ca3af"
          textAnchor="end"
        >
          {new Date(timeRange.max).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </text>
      </svg>
    </div>
  );
}

