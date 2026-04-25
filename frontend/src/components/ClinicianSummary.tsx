import { useMemo } from 'react';
import type { AssessmentResult } from '../types/assessment';
import DecisionCard from './DecisionCard';
import VitalsSnapshotRow from './VitalsSnapshotRow';
import PriorHistoryChips from './PriorHistoryChips';
import RiskScoreDropdowns from './RiskScoreDropdowns';

interface FrontpageData {
  data_source: 'EPIC' | 'DEMO';
  patient?: { id: string; name?: string; dob?: string; sex?: string };
  vitals_latest?: {
    hr: number | null;
    spo2: number | null;
    rr: number | null;
    sbp: number | null;
    timestamp: string | null;
  };
  labs_latest?: {
    ddimer: number | null;
    ddimer_units: string | null;
    timestamp: string | null;
  };
  history_flags?: {
    prior_pe: boolean;
    prior_dvt_vte: boolean;
    active_cancer: boolean;
    recent_surgery: boolean;
    immobilization: boolean;
    thrombophilia: boolean;
    pregnancy_estrogen: boolean;
    other?: string[];
  };
  history_checked?: string[];
  missingness?: {
    vitals_missing: boolean;
    ddimer_missing: boolean;
    history_missing: boolean;
    notes?: string[];
  };
}

interface ClinicianSummaryProps {
  result: AssessmentResult | null;
  frontpageData: FrontpageData | null;
  isLoading: boolean;
  isDemoMode: boolean;
}

/**
 * ClinicianSummary - Layer 1: Compact, critical information
 * Contains: Decision card, vitals snapshot, prior history, risk scores
 * Professional styling, no emojis
 */
export default function ClinicianSummary({
  result,
  frontpageData,
  isLoading,
  isDemoMode
}: ClinicianSummaryProps) {
  // Extract vitals from frontpage or result
  const vitalsLatest = useMemo(() => {
    if (frontpageData?.vitals_latest) {
      return frontpageData.vitals_latest;
    }
    // Fall back to result feature summary for demo mode
    if (result?.featureSummary) {
      const f = result.featureSummary;
      return {
        hr: typeof f.triage_hr === 'number' ? f.triage_hr : null,
        spo2: typeof f.triage_o2sat === 'number' ? f.triage_o2sat : null,
        rr: typeof f.triage_rr === 'number' ? f.triage_rr : null,
        sbp: typeof f.triage_sbp === 'number' ? f.triage_sbp : null,
        timestamp: null
      };
    }
    return null;
  }, [frontpageData, result]);

  // Extract D-Dimer
  const ddimerLatest = useMemo(() => {
    if (frontpageData?.labs_latest) {
      return frontpageData.labs_latest;
    }
    if (result?.featureSummary) {
      const ddimer = result.featureSummary.d_dimer;
      return {
        ddimer: typeof ddimer === 'number' ? ddimer : null,
        ddimer_units: 'μg/mL',
        timestamp: null
      };
    }
    return null;
  }, [frontpageData, result]);

  // Extract history flags from frontpage or result
  const historyFlags = useMemo(() => {
    if (frontpageData?.history_flags) {
      return frontpageData.history_flags;
    }
    if (result?.featureSummary) {
      const f = result.featureSummary;
      return {
        prior_pe: f.prior_pe_diagnosis === 1 || f.prior_pe_diagnosis === true,
        prior_dvt_vte: f.prior_dvt_diagnosis === 1 || f.prior_dvt_diagnosis === true || f.prior_pe_dvt === true,
        active_cancer: f.prior_cancer === 1 || f.active_cancer === true || f.active_malignancy === true,
        recent_surgery: f.recent_surgery === 1 || f.recent_surgery === true,
        immobilization: f.immobilization === 1 || f.immobilization === true,
        thrombophilia: f.thrombophilia === true,
        pregnancy_estrogen: f.estrogen_use === 1 || f.pregnancy === true,
        other: []
      };
    }
    return null;
  }, [frontpageData, result]);

  const historyChecked = frontpageData?.history_checked || [
    'Prior PE',
    'Prior DVT/VTE', 
    'Active cancer',
    'Recent surgery',
    'Immobilization',
    'Thrombophilia',
    'Pregnancy/estrogen'
  ];

  return (
    <div className="clinician-summary">
      {/* A) Primary Decision Card */}
      <DecisionCard result={result} isLoading={isLoading} />

      {/* B) Vitals Snapshot Row */}
      <VitalsSnapshotRow
        vitals={vitalsLatest}
        ddimer={ddimerLatest}
        dataSource={isDemoMode ? 'DEMO' : 'EPIC'}
      />

      {/* C) Prior History / Risk Factors */}
      <PriorHistoryChips
        historyFlags={historyFlags}
        historyChecked={historyChecked}
        isMissing={frontpageData?.missingness?.history_missing}
      />

      {/* D) Traditional Risk Score Dropdowns */}
      <RiskScoreDropdowns features={result?.featureSummary || null} />
    </div>
  );
}

