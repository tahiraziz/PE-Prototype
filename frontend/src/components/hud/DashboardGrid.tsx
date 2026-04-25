/**
 * Dashboard Grid - Apple Health Inspired "Safe Mode" Layout
 * 
 * Clean, minimal design that ALWAYS works:
 * - Zone A (Left): Decision Card with Wells Score
 * - Zone B (Right): Safety Badges (Renal, Allergy, Meds)
 * - Zone C (Bottom): Context Strip with recent events
 * 
 * Uses Tailwind CSS with explicit fallbacks for robustness.
 */

import { useMemo } from 'react';
import { useDemoData } from '../../context/DemoContext';

// ===========================================================================
// Types
// ===========================================================================

interface DashboardGridProps {
  // Override demo data with live data if available
  liveData?: {
    patientName?: string;
    wellsScore?: number | null;
    wellsRisk?: 'low' | 'moderate' | 'high';
    percScore?: number | null;
    percNegative?: boolean;
    ddimer?: number | null;
    ddimerThreshold?: number;
    gfr?: number | null;
    creatinine?: number | null;
    allergies?: Array<{ substance: string }>;
    medGap?: { drug: string; daysGap: number } | null;
    recentEvents?: Array<{ title: string; time: string; type: string }>;
  };
  dataSource?: 'DEMO' | 'EPIC' | 'NONE';
  isLoading?: boolean;
}

// ===========================================================================
// Badge Components
// ===========================================================================

function RenalBadge({ gfr, creatinine }: { gfr: number | null; creatinine: number | null }) {
  const status = useMemo(() => {
    if (gfr === null && creatinine === null) {
      return { level: 'unknown', label: 'Renal Unknown', color: 'gray' };
    }
    if (gfr !== null) {
      if (gfr < 30) return { level: 'danger', label: 'Contrast Risk', color: 'red' };
      if (gfr < 60) return { level: 'caution', label: 'Caution', color: 'amber' };
      return { level: 'safe', label: 'Safe', color: 'emerald' };
    }
    if (creatinine !== null) {
      if (creatinine > 2.0) return { level: 'danger', label: 'Contrast Risk', color: 'red' };
      if (creatinine > 1.5) return { level: 'caution', label: 'Caution', color: 'amber' };
      return { level: 'safe', label: 'Safe', color: 'emerald' };
    }
    return { level: 'unknown', label: 'Unknown', color: 'gray' };
  }, [gfr, creatinine]);

  const colorClasses = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    gray: 'bg-slate-50 border-slate-200 text-slate-600',
  };

  const iconColors = {
    emerald: 'text-emerald-500',
    amber: 'text-amber-500',
    red: 'text-red-500',
    gray: 'text-slate-400',
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${colorClasses[status.color as keyof typeof colorClasses]}`}>
      <div className={`text-2xl ${iconColors[status.color as keyof typeof iconColors]}`}>
        {status.level === 'safe' && '✓'}
        {status.level === 'caution' && '⚠'}
        {status.level === 'danger' && '✕'}
        {status.level === 'unknown' && '?'}
      </div>
      <div>
        <div className="text-xs font-medium uppercase tracking-wide opacity-70">Renal</div>
        <div className="font-semibold">{status.label}</div>
        <div className="text-xs opacity-60">
          {gfr !== null ? `GFR ${gfr}` : creatinine !== null ? `Cr ${creatinine}` : 'No data'}
        </div>
      </div>
    </div>
  );
}

function AllergyBadge({ allergies }: { allergies: Array<{ substance: string }> }) {
  const contrastAllergy = useMemo(() => {
    const dangerous = ['contrast', 'iodine', 'iodinated'];
    return allergies.find(a => 
      dangerous.some(d => a.substance.toLowerCase().includes(d))
    );
  }, [allergies]);

  if (!contrastAllergy) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-red-50 border-red-200 text-red-800">
      <div className="text-2xl text-red-500">⚠</div>
      <div>
        <div className="text-xs font-medium uppercase tracking-wide opacity-70">Allergy</div>
        <div className="font-semibold">{contrastAllergy.substance}</div>
        <div className="text-xs opacity-60">Contrast risk</div>
      </div>
    </div>
  );
}

function MedGapBadge({ gap }: { gap: { drug: string; daysGap: number } | null }) {
  if (!gap || gap.daysGap <= 0) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-800">
        <div className="text-2xl text-emerald-500">🛡</div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide opacity-70">Anticoag</div>
          <div className="font-semibold">Protected</div>
          <div className="text-xs opacity-60">Coverage active</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-red-50 border-red-200 text-red-800">
      <div className="text-2xl text-red-500">⚠</div>
      <div>
        <div className="text-xs font-medium uppercase tracking-wide opacity-70">Anticoag</div>
        <div className="font-semibold">Gap: {gap.daysGap}d</div>
        <div className="text-xs opacity-60">{gap.drug}</div>
      </div>
    </div>
  );
}

// ===========================================================================
// Zone Components
// ===========================================================================

function DecisionCard({ 
  wellsScore, 
  wellsRisk, 
  percScore, 
  percNegative,
  ddimer,
  ddimerThreshold,
  age
}: { 
  wellsScore: number | null;
  wellsRisk: 'low' | 'moderate' | 'high';
  percScore: number | null;
  percNegative: boolean;
  ddimer: number | null;
  ddimerThreshold: number;
  age: number;
}) {
  const riskColors = {
    low: 'text-emerald-600',
    moderate: 'text-amber-600',
    high: 'text-red-600',
  };

  const riskBg = {
    low: 'bg-emerald-50',
    moderate: 'bg-amber-50',
    high: 'bg-red-50',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-full">
      {/* Wells Score - Large */}
      <div className="text-center mb-6">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
          Wells Score
        </div>
        <div className={`text-6xl font-bold ${riskColors[wellsRisk]}`}>
          {wellsScore !== null ? wellsScore.toFixed(1) : '--'}
        </div>
        <div className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold uppercase ${riskBg[wellsRisk]} ${riskColors[wellsRisk]}`}>
          {wellsRisk} risk
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100 my-4"></div>

      {/* PERC */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-slate-600">PERC Rule</span>
        <span className={`font-semibold ${percNegative ? 'text-emerald-600' : 'text-amber-600'}`}>
          {percNegative ? 'Negative' : `${percScore ?? 0} criteria`}
        </span>
      </div>

      {/* D-Dimer Bar */}
      {ddimer !== null && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>D-Dimer</span>
            <span>{ddimer.toFixed(2)} µg/mL</span>
          </div>
          <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`absolute left-0 top-0 h-full rounded-full transition-all ${
                ddimer > ddimerThreshold ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min((ddimer / ddimerThreshold) * 100, 100)}%` }}
            />
            {/* Threshold line */}
            <div 
              className="absolute top-0 w-0.5 h-full bg-slate-400"
              style={{ left: `${Math.min(100, 100)}%` }}
            />
          </div>
          <div className="text-xs text-slate-400 mt-1 text-right">
            Threshold: {ddimerThreshold.toFixed(2)} {age > 50 && '(age-adjusted)'}
          </div>
        </div>
      )}
    </div>
  );
}

function ContextStrip({ events }: { events: Array<{ title: string; time: string; type: string }> }) {
  if (events.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-center text-slate-500">
        No PE-relevant history found
      </div>
    );
  }

  const typeIcons: Record<string, string> = {
    imaging: '📷',
    diagnosis: '🩺',
    procedure: '🔪',
    medication: '💊',
    default: '📋',
  };

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
        Clinical Context
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {events.slice(0, 3).map((event, idx) => (
          <div 
            key={idx}
            className="flex-shrink-0 bg-white rounded-lg border border-slate-200 px-4 py-3 min-w-[180px]"
          >
            <div className="flex items-center gap-2 mb-1">
              <span>{typeIcons[event.type] || typeIcons.default}</span>
              <span className="text-xs text-slate-500">{event.time}</span>
            </div>
            <div className="text-sm font-medium text-slate-800">{event.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===========================================================================
// Main Component
// ===========================================================================

export default function DashboardGrid({ 
  liveData, 
  dataSource = 'DEMO',
  isLoading = false 
}: DashboardGridProps) {
  // Get demo data as fallback
  const { patient: demoPatient, isDemoMode } = useDemoData();

  // Merge live data with demo fallback
  const displayData = useMemo(() => {
    const demo = demoPatient;
    const live = liveData || {};

    // Calculate D-Dimer threshold
    const age = demo.demographics.age;
    const ddimerThreshold = age > 50 ? age * 0.01 : 0.5;

    // Calculate med gap
    let medGap: { drug: string; daysGap: number } | null = null;
    if (demo.medications.lastDispense) {
      const dispenseDate = new Date(demo.medications.lastDispense.date);
      const daysSince = Math.floor((Date.now() - dispenseDate.getTime()) / (1000 * 60 * 60 * 24));
      const gapDays = daysSince - demo.medications.lastDispense.daysSupply;
      if (gapDays > 0) {
        medGap = { drug: demo.medications.lastDispense.drug, daysGap: gapDays };
      }
    }

    // Format events from prior imaging
    const events = demo.priorImaging.map(img => ({
      title: `${img.modality} - ${img.result || 'Pending'}`,
      time: formatRelativeTime(img.date),
      type: 'imaging',
    }));

    // Add DVT if present
    if (demo.clinicalHistory.priorDVT?.diagnosed && demo.clinicalHistory.priorDVT.date) {
      events.push({
        title: 'DVT Diagnosed',
        time: formatRelativeTime(demo.clinicalHistory.priorDVT.date),
        type: 'diagnosis',
      });
    }

    return {
      patientName: live.patientName || demo.name,
      wellsScore: live.wellsScore ?? demo.scores.wellsScore,
      wellsRisk: live.wellsRisk || demo.scores.wellsRisk,
      percScore: live.percScore ?? demo.scores.percScore,
      percNegative: live.percNegative ?? demo.scores.percNegative,
      ddimer: live.ddimer ?? demo.labs.ddimer,
      ddimerThreshold: live.ddimerThreshold || ddimerThreshold,
      age: demo.demographics.age,
      gfr: live.gfr ?? demo.labs.gfr,
      creatinine: live.creatinine ?? demo.labs.creatinine,
      allergies: live.allergies || demo.allergies,
      medGap: live.medGap !== undefined ? live.medGap : medGap,
      recentEvents: live.recentEvents || events,
    };
  }, [demoPatient, liveData]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="grid grid-cols-12 gap-6 p-6 bg-slate-50 min-h-screen">
        <div className="col-span-12 md:col-span-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-64 animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-1/2 mx-auto mb-4"></div>
            <div className="h-16 bg-slate-200 rounded w-3/4 mx-auto"></div>
          </div>
        </div>
        <div className="col-span-12 md:col-span-8">
          <div className="flex flex-wrap gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 w-40 bg-white rounded-xl border border-slate-200 animate-pulse"></div>
            ))}
          </div>
        </div>
        <div className="col-span-12">
          <div className="h-24 bg-slate-100 rounded-xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${
            dataSource === 'EPIC' ? 'bg-emerald-500' : 
            dataSource === 'DEMO' ? 'bg-amber-500' : 'bg-slate-400'
          }`}></div>
          <span className="text-sm font-medium text-slate-600">
            {dataSource === 'EPIC' ? 'LIVE' : dataSource === 'DEMO' ? 'DEMO' : 'OFFLINE'}
          </span>
        </div>
        <div className="text-sm font-medium text-slate-800">
          {displayData.patientName}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6 p-6">
        {/* Zone A: Decision Card (Left - 4 columns) */}
        <div className="col-span-12 md:col-span-4">
          <DecisionCard
            wellsScore={displayData.wellsScore}
            wellsRisk={displayData.wellsRisk}
            percScore={displayData.percScore}
            percNegative={displayData.percNegative}
            ddimer={displayData.ddimer}
            ddimerThreshold={displayData.ddimerThreshold}
            age={displayData.age}
          />
        </div>

        {/* Zone B: Safety Badges (Right - 8 columns) */}
        <div className="col-span-12 md:col-span-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-full">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">
              Safety Signals
            </div>
            <div className="flex flex-wrap gap-4">
              <RenalBadge gfr={displayData.gfr} creatinine={displayData.creatinine} />
              <AllergyBadge allergies={displayData.allergies} />
              <MedGapBadge gap={displayData.medGap} />
            </div>
          </div>
        </div>

        {/* Zone C: Context Strip (Bottom - Full Width) */}
        <div className="col-span-12">
          <ContextStrip events={displayData.recentEvents} />
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Utility
// ===========================================================================

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
}

// ===========================================================================
// Export helper for transforming feature data
// ===========================================================================

export interface FeatureSummary {
  age?: number | null;
  wells_score?: number | null;
  perc_score?: number | null;
  perc_negative?: number | null;
  d_dimer?: number | null;
  creatinine?: number | null;
  gfr?: number | null;
  [key: string]: unknown;
}

export function transformFeaturesToGridData(
  features: FeatureSummary | null,
  extendedData?: {
    allergies?: Array<{ substance: string }>;
    priorImaging?: Array<{ date: string; modality: string; result?: string }>;
    medications?: {
      lastDispense?: {
        drug?: string;
        date?: string;
        daysSupply?: number;
      };
    };
  }
): DashboardGridProps['liveData'] {
  if (!features) return undefined;

  return {
    wellsScore: features.wells_score ?? null,
    percScore: features.perc_score ?? null,
    percNegative: features.perc_negative === 1,
    ddimer: features.d_dimer ?? null,
    gfr: features.gfr ?? null,
    creatinine: features.creatinine ?? null,
    allergies: extendedData?.allergies,
  };
}
