import { colors, fontSize } from '../../styles/tokens';

interface PatientBarProps {
  /** e.g. "Barnes, Richard" */
  name: string;
  /** e.g. "52M" or "34F" */
  ageSex: string;
  chiefComplaint: string;
}

/**
 * PatientBar
 * Displays patient identity and chief complaint as a flex row of labeled fields.
 * Padding and borders are the parent's responsibility.
 */
export default function PatientBar({ name, ageSex, chiefComplaint }: PatientBarProps) {
  const labelStyle: React.CSSProperties = {
    color: colors.gray,
    fontSize: fontSize.label,
    marginBottom: 2,
  };
  const valueStyle: React.CSSProperties = {
    color: colors.black,
    fontSize: fontSize.label,
  };

  return (
    <div style={{ display: 'flex', gap: 40 }}>
      <div>
        <div style={labelStyle}>Patient</div>
        <div style={valueStyle}>
          {name} · {ageSex}
        </div>
      </div>
      <div>
        <div style={labelStyle}>Chief Complaint</div>
        <div style={valueStyle}>{chiefComplaint}</div>
      </div>
    </div>
  );
}
