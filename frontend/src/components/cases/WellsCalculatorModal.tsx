import { useState, useEffect, useRef } from 'react';
import { X, Check, CheckCircle, AlertTriangle, ClipboardCopy } from 'lucide-react';
import { colors, fontSize, fontWeight } from '../../styles/tokens';

const { black: BLACK, gray: GRAY, border: BORDER, inputBorder: INPUT_BORDER, green: GREEN, lightGreen: LT_GRN, red: RED, lightRed: LT_RED } = colors;

type FactorValue = boolean | null;

interface WellsFactors {
  dvt: FactorValue;
  altDx: FactorValue;
  hr: FactorValue;
  immobilization: FactorValue;
  priorVte: FactorValue;
  hemoptysis: FactorValue;
  malignancy: FactorValue;
}

const QUESTIONS: { key: keyof WellsFactors; points: number; label: string; mdmLabel: string }[] = [
  { key: 'hr',             points: 1.5, label: 'Heart rate >100',                                            mdmLabel: 'heart rate >100' },
  { key: 'immobilization', points: 1.5, label: 'Immobilization at least 3 days OR surgery in the previous 4 weeks', mdmLabel: 'recent immobilization or surgery' },
  { key: 'priorVte',       points: 1.5, label: 'Previous, objectively diagnosed PE or DVT',                  mdmLabel: 'prior objectively diagnosed PE or DVT' },
  { key: 'malignancy',     points: 1.0, label: 'Malignancy w/ treatment within 6 months or palliative',      mdmLabel: 'active malignancy' },
  { key: 'dvt',            points: 3.0, label: 'Clinical signs and symptoms of DVT',                         mdmLabel: 'clinical signs and symptoms of DVT' },
  { key: 'altDx',          points: 3.0, label: 'PE is #1 diagnosis OR equally likely',                       mdmLabel: 'PE as #1 diagnosis or equally likely' },
  { key: 'hemoptysis',     points: 1.0, label: 'Hemoptysis',                                                 mdmLabel: 'hemoptysis' },
];

// Pre-populated based on James Miller's data:
// HR=118 (>100) ✓, long-haul flight (immobilization) ✓, hasPriorVTE ✓, malignancy ✗
// DVT signs, alternative dx, hemoptysis → null (overlap with YEARS, left for clinician)
const DEFAULT_FACTORS: WellsFactors = {
  dvt:           null,
  altDx:         null,
  hr:            true,
  immobilization: true,
  priorVte:      true,
  hemoptysis:    null,
  malignancy:    false,
};

const PATIENT = {
  name: 'Miller, James · 68M',
  complaint: 'Sudden onset sharp chest pain & SOB',
};

interface WellsCalculatorModalProps {
  onClose: () => void;
}

export default function WellsCalculatorModal({ onClose }: WellsCalculatorModalProps) {
  const [factors, setFactors] = useState<WellsFactors>(DEFAULT_FACTORS);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const allAnswered = Object.values(factors).every(v => v !== null);
  const score = QUESTIONS.reduce((total, q) => total + (factors[q.key] === true ? q.points : 0), 0);
  const result = allAnswered ? (score >= 5 ? 'likely' : 'unlikely') : null;

  // Smooth scroll to result when all questions answered
  useEffect(() => {
    if (allAnswered && resultRef.current) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
    }
  }, [allAnswered]);

  const setFactor = (key: keyof WellsFactors, value: boolean) => {
    setFactors(prev => ({ ...prev, [key]: value }));
  };

  // Build MDM text
  const positiveLabels = QUESTIONS.filter(q => factors[q.key] === true).map(q => q.mdmLabel);

  const factorText =
    positiveLabels.length === 0 ? 'no positive clinical factors'
    : positiveLabels.length === 1 ? positiveLabels[0]
    : positiveLabels.length === 2 ? `${positiveLabels[0]} and ${positiveLabels[1]}`
    : positiveLabels.slice(0, -1).join(', ') + ', and ' + positiveLabels.at(-1);

  const subtext = !allAnswered ? '' :
    result === 'likely'
      ? `PE is likely due to Wells score being >4. Wells ${score.toFixed(1)}. With ${factorText}. CTPA is recommended.`
      : positiveLabels.length > 0
        ? `PE is unlikely based on Wells score being <5. Wells ${score.toFixed(1)}. With ${factorText}. D-Dimer testing is recommended.`
        : `PE is unlikely based on Wells score being <5. Wells ${score.toFixed(1)}. No positive clinical factors. D-Dimer testing is recommended.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(subtext).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-[630px] max-h-[90vh] overflow-y-auto"
        style={{ border: `1px solid ${BORDER}` }}
      >
        {/* Controls bar */}
        <div
          className="px-6 py-3 flex items-center justify-end sticky top-0 z-10"
          style={{ backgroundColor: 'white', borderBottom: `1px solid ${BORDER}` }}
        >
          <button
            onClick={onClose}
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
              <p style={{ fontSize: fontSize.label, color: BLACK }}>{PATIENT.name}</p>
            </div>
            <div>
              <p style={{ fontSize: fontSize.label, color: GRAY, marginBottom: 2 }}>Chief Complaint</p>
              <p style={{ fontSize: fontSize.label, color: BLACK }}>{PATIENT.complaint}</p>
            </div>
          </div>

          {/* Title */}
          <div className="mb-7">
            <p style={{ fontSize: fontSize.title, fontWeight: fontWeight.semibold, color: BLACK, lineHeight: 1.3, marginBottom: 8 }}>
              Input remaining criteria to see PE likelihood and get MDM
            </p>
          </div>

          {/* Questions */}
          <div className="w-full max-w-[480px]">
            <div className="flex flex-col gap-6">
              {QUESTIONS.map((q) => (
                <div key={q.key}>
                  <p style={{ fontSize: fontSize.body, fontWeight: fontWeight.medium, color: BLACK, margin: 0, marginBottom: 12, lineHeight: 1.5 }}>
                    {q.label}
                    {DEFAULT_FACTORS[q.key] !== null && (
                      <span style={{
                        display: 'inline',
                        fontSize: 11,
                        color: colors.darkBlue,
                        backgroundColor: colors.lightBlue,
                        padding: '1px 6px',
                        borderRadius: 3,
                        fontWeight: fontWeight.medium,
                        marginLeft: 6,
                        verticalAlign: 'middle',
                      }}>
                        from chart
                      </span>
                    )}
                  </p>
                  <div className="flex w-full">
                    {/* Yes */}
                    <button
                      onClick={() => setFactor(q.key, true)}
                      className="flex-1 h-[52px] transition-colors flex items-center justify-center gap-1.5 rounded-l"
                      style={{
                        fontSize: fontSize.body,
                        fontWeight: factors[q.key] === true ? fontWeight.medium : fontWeight.regular,
                        borderTop: `1px solid ${factors[q.key] === true ? colors.darkBlue : INPUT_BORDER}`,
                        borderLeft: `1px solid ${factors[q.key] === true ? colors.darkBlue : INPUT_BORDER}`,
                        borderBottom: `1px solid ${factors[q.key] === true ? colors.darkBlue : INPUT_BORDER}`,
                        borderRight: factors[q.key] === true ? `1px solid ${colors.darkBlue}` : 'none',
                        backgroundColor: factors[q.key] === true ? colors.lightBlue : 'white',
                        color: factors[q.key] === true ? colors.darkBlue : GRAY,
                        cursor: 'pointer',
                      }}
                    >
                      {factors[q.key] === true && <Check size={14} />}
                      Yes
                    </button>
                    {/* No */}
                    <button
                      onClick={() => setFactor(q.key, false)}
                      className="flex-1 h-[52px] transition-colors flex items-center justify-center gap-1.5 rounded-r"
                      style={{
                        fontSize: fontSize.body,
                        fontWeight: factors[q.key] === false ? fontWeight.medium : fontWeight.regular,
                        borderTop: `1px solid ${factors[q.key] === false ? colors.darkBlue : INPUT_BORDER}`,
                        borderRight: `1px solid ${factors[q.key] === false ? colors.darkBlue : INPUT_BORDER}`,
                        borderBottom: `1px solid ${factors[q.key] === false ? colors.darkBlue : INPUT_BORDER}`,
                        borderLeft: factors[q.key] === true ? 'none' : `1px solid ${factors[q.key] === false ? colors.darkBlue : INPUT_BORDER}`,
                        backgroundColor: factors[q.key] === false ? colors.lightBlue : 'white',
                        color: factors[q.key] === false ? colors.darkBlue : GRAY,
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

          {/* Result card */}
          {allAnswered && (
            <div ref={resultRef} className="pt-8">
              <div
                className="rounded-lg p-5"
                style={{
                  backgroundColor: result === 'likely' ? LT_RED : LT_GRN,
                  border: `1px solid ${result === 'likely' ? 'rgba(153,27,27,0.2)' : 'rgba(22,101,52,0.25)'}`,
                }}
              >
                <div className="flex items-start gap-2 mb-3">
                  <span style={{ color: result === 'likely' ? RED : GREEN, marginTop: 2, flexShrink: 0 }}>
                    {result === 'likely' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
                  </span>
                  <p style={{ fontSize: fontSize.body, fontWeight: fontWeight.semibold, color: result === 'likely' ? RED : GREEN }}>
                    {result === 'likely'
                      ? `PE is likely. CTPA is recommended. Wells score ${score.toFixed(1)}`
                      : `PE is unlikely. D-Dimer testing is recommended. Wells score ${score.toFixed(1)}`}
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
        </div>
      </div>
    </div>
  );
}
