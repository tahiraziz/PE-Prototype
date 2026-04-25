/**
 * YEARS PE Algorithm Calculator Modal
 * Uses design system tokens from src/styles/tokens.ts
 */

import { useState, useEffect, useRef } from 'react';
import { X, Check, CheckCircle, AlertTriangle, ClipboardCopy, Droplets } from 'lucide-react';
import { colors, fontSize, fontWeight } from '../styles/tokens';

const { black: BLACK, gray: GRAY, border: BORDER, inputBorder: INPUT_BORDER, green: GREEN, lightGreen: LT_GRN, red: RED, lightRed: LT_RED, lightBlue: LT_BLUE } = colors;

type FactorValue = true | false | null;

interface Factors {
  dvt: FactorValue;
  hemoptysis: FactorValue;
  peMostLikely: FactorValue;
}

const QUESTIONS = [
  { key: 'dvt' as keyof Factors, label: 'Clinical DVT?' },
  { key: 'hemoptysis' as keyof Factors, label: 'Hemoptysis?' },
  { key: 'peMostLikely' as keyof Factors, label: 'PE is most likely diagnosis?' },
];

const CASES = {
  case1: {
    patient: 'Barnes, Richard · 52M',
    complaint: 'Left calf cramping x 3 days, mild SOB today',
    dDimer: 760,
    defaultFactors: { dvt: false, hemoptysis: false, peMostLikely: false } as Factors,
  },
  case4: {
    patient: 'Johnson, Robert · 62M',
    complaint: 'Fever, productive cough, SOB',
    dDimer: 512,
    defaultFactors: { dvt: true, hemoptysis: true, peMostLikely: false } as Factors,
  },
};

interface YearsCalculatorModalProps {
  initialCase: 'case1' | 'case4';
  onClose: () => void;
  initialFactors?: Factors;
}

export default function YearsCalculatorModal({ initialCase, onClose, initialFactors }: YearsCalculatorModalProps) {
  const [factors, setFactors] = useState<Factors>(initialFactors ?? CASES[initialCase].defaultFactors);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const caseData = CASES[initialCase];
  const { dDimer } = caseData;

  const allAnswered = Object.values(factors).filter((v) => v !== null).length === 3;
  const yearsScore = Object.values(factors).filter((v) => v === true).length;
  const threshold = yearsScore === 0 ? 1000 : 500;
  const result = allAnswered ? (dDimer < threshold ? 'rule-out' : 'no-rule-out') : null;

  // Smooth scroll to result when all questions answered
  useEffect(() => {
    if (allAnswered && resultRef.current) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
    }
  }, [allAnswered]);

  const setFactor = (key: keyof Factors, value: boolean) => {
    setFactors((prev) => ({ ...prev, [key]: value }));
  };

  // Build grammatically correct factor list for subtext sentences
  const patientLabels: string[] = [];
  if (factors.dvt === true) patientLabels.push('signs of clinical DVT');
  if (factors.hemoptysis === true) patientLabels.push('hemoptysis');
  if (factors.peMostLikely === true) patientLabels.push('PE as the most likely diagnosis');

  const patientFactorText =
    patientLabels.length === 1
      ? patientLabels[0]
      : patientLabels.length === 2
      ? `${patientLabels[0]} and ${patientLabels[1]}`
      : `${patientLabels[0]}, ${patientLabels[1]}, and ${patientLabels[2]}`;

  const subtext = !allAnswered ? '' :
    result === 'rule-out'
      ? yearsScore === 0
        ? `D-Dimer ${dDimer} ng/mL is below the YEARS threshold of ${threshold} with no YEARS clinical factors present. PE is ruled out with a 0.43% VTE risk at 3-month follow-up.`
        : `D-Dimer ${dDimer} ng/mL is below the YEARS threshold of ${threshold} when ≥ 1 clinical factors are present. Patient had ${patientFactorText}. PE is ruled out with a 0.43% VTE risk at 3-month follow-up.`
      : yearsScore === 0
      ? `D-Dimer ${dDimer} ng/mL exceeds the YEARS threshold of ${threshold} with no YEARS clinical factors present. CTPA is recommended.`
      : `D-Dimer ${dDimer} ng/mL exceeds the YEARS threshold of ${threshold} when ≥ 1 clinical factors are present. Patient had ${patientFactorText}. CTPA is recommended.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(subtext).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // D-Dimer bar calculations
  const maxValue = Math.max(dDimer, threshold) * 1.35;
  const dDimerPct = (dDimer / maxValue) * 100;
  const thresholdPct = (threshold / maxValue) * 100;
  const exceeds = dDimer >= threshold;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-[630px] max-h-[90vh] overflow-y-auto"
        style={{ fontFamily: "'IBM Plex Sans', sans-serif", border: `1px solid ${BORDER}` }}
      >
        {/* Controls bar */}
        <div
          className="px-6 py-3 flex items-center justify-end sticky top-0 z-10"
          style={{ backgroundColor: 'white', borderBottom: `1px solid ${BORDER}` }}
        >
          <button
            onClick={onClose}
            className="transition-colors"
            style={{ color: GRAY, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Main content */}
        <div className="px-8 pt-6 pb-10">
          {/* Patient header */}
          <div className="flex gap-10 mb-6">
            <div>
              <p style={{ fontSize: fontSize.label, color: GRAY, marginBottom: 2 }}>Patient</p>
              <p style={{ fontSize: fontSize.label, color: BLACK }}>{caseData.patient}</p>
            </div>
            <div>
              <p style={{ fontSize: fontSize.label, color: GRAY, marginBottom: 2 }}>Chief Complaint</p>
              <p style={{ fontSize: fontSize.label, color: BLACK }}>{caseData.complaint}</p>
            </div>
          </div>

          {/* D-Dimer badge */}
          <div className="mb-6">
            <div
              className="inline-flex items-center gap-2 rounded px-3 py-1.5"
              style={{ backgroundColor: '#eff6ff' }}
            >
              <Droplets size={15} style={{ color: GRAY }} />
              <span style={{ fontSize: fontSize.body, fontWeight: fontWeight.medium, color: BLACK }}>
                D-Dimer: {dDimer} NG/ML
              </span>
            </div>
          </div>

          {/* Title */}
          <div className="mb-7">
            <p style={{ fontSize: fontSize.title, fontWeight: fontWeight.semibold, color: BLACK, lineHeight: 1.3, marginBottom: 8 }}>
              YEARS can rule out PE if no additional factors are present. Select factors to see
              YEARS results and MDM.
            </p>
            <p style={{ fontSize: fontSize.label, color: GRAY }}>
              MDM will be generated based on chart data and YEARS.
            </p>
          </div>

          {/* Questions */}
          <div className="w-full max-w-[480px]">
            <div className="flex flex-col gap-6">
              {QUESTIONS.map((q) => (
                <div key={q.key}>
                  <p style={{ fontSize: fontSize.body, fontWeight: fontWeight.medium, color: BLACK, marginBottom: 12 }}>{q.label}</p>
                  <div className="flex w-full">
                    {/* Yes button */}
                    <button
                      onClick={() => setFactor(q.key, true)}
                      className="flex-1 h-[52px] transition-colors flex items-center justify-center gap-1.5 rounded-l"
                      style={{
                        fontSize: fontSize.body,
                        fontWeight: factors[q.key] === true ? fontWeight.medium : fontWeight.regular,
                        borderTop: `1px solid ${factors[q.key] === true ? '#375292' : INPUT_BORDER}`,
                        borderLeft: `1px solid ${factors[q.key] === true ? '#375292' : INPUT_BORDER}`,
                        borderBottom: `1px solid ${factors[q.key] === true ? '#375292' : INPUT_BORDER}`,
                        borderRight: factors[q.key] === true ? '1px solid #375292' : 'none',
                        backgroundColor: factors[q.key] === true ? '#eff6ff' : 'white',
                        color: factors[q.key] === true ? '#375292' : GRAY,
                        cursor: 'pointer',
                      }}
                    >
                      {factors[q.key] === true && <Check size={14} />}
                      Yes
                    </button>
                    {/* No button */}
                    <button
                      onClick={() => setFactor(q.key, false)}
                      className="flex-1 h-[52px] transition-colors flex items-center justify-center gap-1.5 rounded-r"
                      style={{
                        fontSize: fontSize.body,
                        fontWeight: factors[q.key] === false ? fontWeight.medium : fontWeight.regular,
                        borderTop: `1px solid ${factors[q.key] === false ? '#375292' : INPUT_BORDER}`,
                        borderRight: `1px solid ${factors[q.key] === false ? '#375292' : INPUT_BORDER}`,
                        borderBottom: `1px solid ${factors[q.key] === false ? '#375292' : INPUT_BORDER}`,
                        borderLeft: factors[q.key] === true ? 'none' : `1px solid ${factors[q.key] === false ? '#375292' : INPUT_BORDER}`,
                        backgroundColor: factors[q.key] === false ? '#eff6ff' : 'white',
                        color: factors[q.key] === false ? '#375292' : GRAY,
                        cursor: 'pointer',
                      }}
                    >
                      {factors[q.key] === false && <X size={14} />}
                      No
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Result card — above bar chart */}
          {allAnswered && (
            <div ref={resultRef} className="pt-8 pb-2">
              <div
                className="rounded-lg p-5"
                style={{
                  backgroundColor: result === 'rule-out' ? LT_GRN : LT_RED,
                  border: `1px solid ${result === 'rule-out' ? 'rgba(22,101,52,0.25)' : 'rgba(153,27,27,0.2)'}`,
                }}
              >
                <div className="flex items-start gap-2 mb-3">
                  <span style={{ color: result === 'rule-out' ? GREEN : RED, marginTop: 2, flexShrink: 0 }}>
                    {result === 'rule-out' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                  </span>
                  <p style={{ fontSize: fontSize.body, fontWeight: fontWeight.semibold, color: result === 'rule-out' ? GREEN : RED }}>
                    {result === 'rule-out' ? 'PE can be ruled out.' : 'PE cannot be ruled out. CTPA is recommended.'}
                  </p>
                </div>
                <p style={{ fontSize: fontSize.label, color: BLACK, marginBottom: 20, lineHeight: 1.6 }}>
                  {subtext}
                </p>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 h-9 rounded transition-colors"
                  style={{
                    backgroundColor: BLACK,
                    color: 'white',
                    fontSize: fontSize.label,
                    fontWeight: fontWeight.semibold,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <ClipboardCopy size={15} />
                  {copied ? 'Copied!' : 'Copy MDM'}
                </button>
              </div>
            </div>
          )}

          {/* D-Dimer bar — below result card */}
          {allAnswered && (
            <div className="w-full max-w-[480px] mt-8">
              {/* Threshold label above bar */}
              <div className="relative h-9 mb-4">
                <div
                  className="absolute text-center"
                  style={{ left: `${thresholdPct}%`, transform: 'translateX(-50%)', bottom: 0 }}
                >
                  <p style={{ fontSize: fontSize.label, color: GRAY, whiteSpace: 'nowrap' }}>YEARS Threshold</p>
                  <p style={{ fontSize: fontSize.label, fontWeight: fontWeight.semibold, color: GRAY }}>{threshold}</p>
                </div>
              </div>

              {/* Bar track */}
              <div className="relative h-[10px] w-full overflow-visible">
                {/* Safe zone: 0 → threshold */}
                <div
                  className="absolute left-0 top-0 h-full rounded-l-full"
                  style={{ width: `${thresholdPct}%`, backgroundColor: BORDER }}
                />
                {/* Beyond zone: threshold → max */}
                <div
                  className="absolute top-0 h-full rounded-r-full"
                  style={{ left: `${thresholdPct}%`, width: `${100 - thresholdPct}%`, backgroundColor: BORDER }}
                />
                {/* D-Dimer fill */}
                <div
                  className="absolute left-0 top-0 h-full rounded-l-full z-[2]"
                  style={{
                    width: `${dDimerPct}%`,
                    backgroundColor: exceeds ? RED : GREEN,
                    transition: 'width 0.5s ease, background-color 0.4s ease',
                  }}
                />
                {/* Threshold tick */}
                <div
                  className="absolute top-[-5px] h-5 w-px z-[4]"
                  style={{ left: `${thresholdPct}%`, transform: 'translateX(-50%)', backgroundColor: GRAY }}
                />
                {/* D-Dimer tick */}
                <div
                  className="absolute top-[-5px] h-5 w-px z-[5]"
                  style={{
                    left: `${dDimerPct}%`,
                    transform: 'translateX(-50%)',
                    backgroundColor: exceeds ? RED : GREEN,
                  }}
                />
              </div>

              {/* D-Dimer label below bar */}
              <div className="relative h-9 mt-4">
                <div
                  className="absolute text-center"
                  style={{ left: `${dDimerPct}%`, transform: 'translateX(-50%)' }}
                >
                  <p style={{ fontSize: fontSize.label, fontWeight: fontWeight.semibold, color: exceeds ? RED : GREEN }}>
                    {dDimer}
                  </p>
                  <p style={{ fontSize: fontSize.label, color: exceeds ? RED : GREEN, whiteSpace: 'nowrap' }}>
                    D-Dimer Result
                  </p>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-4">
                <p style={{ fontSize: fontSize.label, color: GRAY }}>
                  Threshold = 500 when &ge; 1 clinical factors present
                </p>
                <p style={{ fontSize: fontSize.label, color: GRAY }}>
                  Threshold = 1000 when 0 clinical factors present
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
