/**
 * Context Strip Component - Zone C: Clinical "Gestalt" Builders
 * 
 * Displays contextual clinical data to support decision-making:
 * - Shock Index: HR/SBP with risk stratification
 * - Vitals Trends: Sparkline or arrows indicating O2 trajectory
 * - Recent Imaging: Last 2 imaging reports with relative times
 */

import React, { useMemo } from 'react';
import { calculateShockIndex, formatRelativeTime } from '../utils/clinicalLogic';
import type { VitalSigns, ShockIndexResult } from '../utils/clinicalLogic';
import './ContextStrip.css';

// ===========================================================================
// Types
// ===========================================================================

interface ContextStripProps {
  vitals: VitalSigns | null;
  vitalsTrend?: VitalsTrend | null;
  recentImaging?: ImagingItem[];
  isLoading?: boolean;
}

interface VitalsTrend {
  spo2Trend: 'rising' | 'stable' | 'falling' | 'unknown';
  hrTrend: 'rising' | 'stable' | 'falling' | 'unknown';
  lastValues?: {
    spo2?: number[];
    hr?: number[];
  };
}

interface ImagingItem {
  type: string;
  date: string;
  relativeTime?: string;
  conclusion?: string;
}

// ===========================================================================
// Sub-Components
// ===========================================================================

function ShockIndexCard({ vitals }: { vitals: VitalSigns | null }) {
  const shockIndex = useMemo(() => {
    if (!vitals) return null;
    return calculateShockIndex(vitals);
  }, [vitals]);

  if (!shockIndex) {
    return (
      <div className="context-card shock-index unknown">
        <div className="card-header">
          <span className="card-icon">💓</span>
          <span className="card-title">Shock Index</span>
        </div>
        <div className="card-value">--</div>
        <div className="card-subtitle">HR/SBP unavailable</div>
      </div>
    );
  }

  const riskClass = shockIndex.risk === 'normal' ? 'normal' :
                    shockIndex.risk === 'elevated' ? 'elevated' : 'high';

  return (
    <div className={`context-card shock-index ${riskClass}`}>
      <div className="card-header">
        <span className="card-icon">💓</span>
        <span className="card-title">Shock Index</span>
      </div>
      <div className="card-value">{shockIndex.value.toFixed(2)}</div>
      <div className="card-subtitle">
        {vitals?.hr}/{vitals?.sbp}
        <span className={`risk-badge risk-${riskClass}`}>
          {shockIndex.risk === 'normal' ? 'Normal' :
           shockIndex.risk === 'elevated' ? 'Elevated' : 'High Risk'}
        </span>
      </div>
    </div>
  );
}

function VitalsTrendCard({ trend, vitals }: { trend: VitalsTrend | null; vitals: VitalSigns | null }) {
  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'rising': return '↑';
      case 'falling': return '↓';
      case 'stable': return '→';
      default: return '?';
    }
  };

  const getTrendClass = (direction: string, vital: 'spo2' | 'hr') => {
    if (direction === 'unknown') return 'unknown';
    if (vital === 'spo2') {
      // For SpO2, falling is bad
      return direction === 'falling' ? 'warning' : direction === 'rising' ? 'good' : 'stable';
    } else {
      // For HR, rising might be concerning
      return direction === 'rising' ? 'warning' : direction === 'stable' ? 'stable' : 'good';
    }
  };

  if (!trend) {
    return (
      <div className="context-card vitals-trend unknown">
        <div className="card-header">
          <span className="card-icon">📈</span>
          <span className="card-title">Trends</span>
        </div>
        <div className="trend-row">
          <span className="trend-label">SpO₂</span>
          <span className="trend-value">{vitals?.spo2 ?? '--'}%</span>
          <span className="trend-arrow unknown">--</span>
        </div>
        <div className="trend-row">
          <span className="trend-label">HR</span>
          <span className="trend-value">{vitals?.hr ?? '--'}</span>
          <span className="trend-arrow unknown">--</span>
        </div>
      </div>
    );
  }

  return (
    <div className="context-card vitals-trend">
      <div className="card-header">
        <span className="card-icon">📈</span>
        <span className="card-title">Trends</span>
      </div>
      <div className={`trend-row ${getTrendClass(trend.spo2Trend, 'spo2')}`}>
        <span className="trend-label">SpO₂</span>
        <span className="trend-value">{vitals?.spo2 ?? '--'}%</span>
        <span className={`trend-arrow ${trend.spo2Trend}`}>
          {getTrendIcon(trend.spo2Trend)}
        </span>
        {trend.spo2Trend === 'falling' && (
          <span className="trend-warning">Dropping</span>
        )}
      </div>
      <div className={`trend-row ${getTrendClass(trend.hrTrend, 'hr')}`}>
        <span className="trend-label">HR</span>
        <span className="trend-value">{vitals?.hr ?? '--'}</span>
        <span className={`trend-arrow ${trend.hrTrend}`}>
          {getTrendIcon(trend.hrTrend)}
        </span>
      </div>
      
      {/* Mini Sparkline (if data available) */}
      {trend.lastValues?.spo2 && trend.lastValues.spo2.length > 2 && (
        <div className="mini-sparkline">
          <MiniSparkline values={trend.lastValues.spo2} color="#10b981" />
        </div>
      )}
    </div>
  );
}

function MiniSparkline({ values, color = '#3b82f6' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;

  const width = 60;
  const height = 20;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="sparkline-svg">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RecentImagingCard({ imaging }: { imaging: ImagingItem[] }) {
  if (!imaging || imaging.length === 0) {
    return (
      <div className="context-card recent-imaging empty">
        <div className="card-header">
          <span className="card-icon">🔬</span>
          <span className="card-title">Recent Imaging</span>
        </div>
        <div className="no-imaging">No recent PE imaging</div>
      </div>
    );
  }

  return (
    <div className="context-card recent-imaging">
      <div className="card-header">
        <span className="card-icon">🔬</span>
        <span className="card-title">Recent Imaging</span>
      </div>
      <div className="imaging-list">
        {imaging.slice(0, 2).map((img, i) => (
          <div key={i} className="imaging-item">
            <span className={`imaging-type type-${img.type.toLowerCase().replace(/[\s/]+/g, '-')}`}>
              {img.type}
            </span>
            <span className="imaging-time">
              {img.relativeTime || formatRelativeTime(img.date)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===========================================================================
// Main Component
// ===========================================================================

export default function ContextStrip({
  vitals,
  vitalsTrend,
  recentImaging = [],
  isLoading = false,
}: ContextStripProps) {
  if (isLoading) {
    return (
      <div className="context-strip loading">
        <div className="strip-skeleton">
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="context-strip">
      <div className="strip-cards">
        <ShockIndexCard vitals={vitals} />
        <VitalsTrendCard trend={vitalsTrend ?? null} vitals={vitals} />
        <RecentImagingCard imaging={recentImaging} />
      </div>
    </div>
  );
}

// ===========================================================================
// Utility: Calculate trend from time series
// ===========================================================================

export function calculateVitalsTrend(
  spo2Series: Array<{ value: number; time: string }> = [],
  hrSeries: Array<{ value: number; time: string }> = []
): VitalsTrend {
  const getTrend = (values: number[]): 'rising' | 'falling' | 'stable' | 'unknown' => {
    if (values.length < 2) return 'unknown';
    
    const recent = values.slice(-3);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const diff = last - first;
    
    // Use threshold of 2% change to determine trend
    if (Math.abs(diff) < (first * 0.02)) return 'stable';
    return diff > 0 ? 'rising' : 'falling';
  };

  const spo2Values = spo2Series.map(s => s.value);
  const hrValues = hrSeries.map(s => s.value);

  return {
    spo2Trend: getTrend(spo2Values),
    hrTrend: getTrend(hrValues),
    lastValues: {
      spo2: spo2Values.slice(-5),
      hr: hrValues.slice(-5),
    },
  };
}
