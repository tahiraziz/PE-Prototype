import { colors, fontSize, fontWeight } from '../../styles/tokens';

interface VitalSignProps {
  /** A Lucide icon element sized at 14, colored gray */
  icon: React.ReactNode;
  /** Short label shown above the value, e.g. "HR", "BP", "SPO2" */
  label: string;
  /** The numeric value string, e.g. "102", "120/80", "98%" */
  value: string;
  /** Unit shown below value, e.g. "bpm", "mmHg", "/min" */
  unit?: string;
  /** Additional line below value (before unit), e.g. "[RA]" for SPO2 */
  suffix?: string;
  /** When present, renders below unit in alert color, e.g. "TACHYCARDIA" */
  alertLabel?: string;
}

/**
 * VitalSign
 * Center-aligned vital display: icon + label row, large value, unit, optional alert label.
 * Numeric value always renders in black. Only the alert label below it renders in red.
 */
export default function VitalSign({ icon, label, value, unit, suffix, alertLabel }: VitalSignProps) {
  return (
    <div style={{ textAlign: 'center' }}>
      {/* Icon + label */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          marginBottom: 4,
        }}
      >
        {icon}
        <span style={{ color: colors.gray, fontSize: fontSize.label }}>{label}</span>
      </div>

      {/* Value — always black regardless of alert state */}
      <div
        style={{
          color: colors.black,
          fontSize: fontSize.display,
          fontWeight: fontWeight.regular,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>

      {/* Suffix line (e.g. [RA] for SPO2) */}
      {suffix && (
        <div style={{ color: colors.gray, fontSize: fontSize.label }}>{suffix}</div>
      )}

      {/* Unit */}
      {unit && (
        <div style={{ color: colors.gray, fontSize: fontSize.label }}>{unit}</div>
      )}

      {/* Alert label */}
      {alertLabel && (
        <div
          style={{
            color: colors.red,
            fontSize: fontSize.label,
            fontWeight: fontWeight.semibold,
            textTransform: 'uppercase',
            marginTop: 4,
          }}
        >
          {alertLabel}
        </div>
      )}
    </div>
  );
}
