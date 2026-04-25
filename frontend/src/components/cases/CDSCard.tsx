import { colors, fontSize, fontWeight } from '../../styles/tokens';

interface CDSCardProps {
  title: string;
  detail?: string;
  suggestion?: string;
  linkLabel: string;
  onLinkClick?: () => void;
}

export default function CDSCard({ title, detail, suggestion, linkLabel, onLinkClick }: CDSCardProps) {
  return (
    <div style={{
      backgroundColor: 'white',
      border: `1px solid ${colors.border}`,
      borderLeft: `4px solid ${colors.darkBlue}`,
      borderRadius: 8,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      maxWidth: 600,
    }}>
      {/* Badge + Title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          flexShrink: 0,
          marginTop: 2,
          width: 18,
          height: 18,
          borderRadius: '50%',
          backgroundColor: colors.darkBlue,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
        }}>i</div>
        <p style={{
          fontSize: fontSize.body,
          fontWeight: fontWeight.medium,
          color: colors.black,
          lineHeight: 1.55,
          margin: 0,
        }}>{title}</p>
      </div>

      {/* Detail text */}
      {detail && (
        <p style={{
          fontSize: fontSize.label,
          color: colors.gray,
          lineHeight: 1.6,
          margin: 0,
          paddingLeft: 28,
        }}>{detail}</p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, paddingLeft: 28 }}>
        {suggestion && (
          <button style={{
            backgroundColor: colors.darkBlue,
            color: 'white',
            border: 'none',
            borderRadius: 6,
            padding: '6px 14px',
            fontSize: fontSize.label,
            fontWeight: fontWeight.medium,
            cursor: 'pointer',
          }}>
            {suggestion}
          </button>
        )}
        <button
          onClick={onLinkClick}
          style={{
            background: 'none',
            border: 'none',
            color: colors.darkBlue,
            fontSize: fontSize.label,
            fontWeight: fontWeight.medium,
            cursor: 'pointer',
            textDecoration: 'underline',
            padding: 0,
          }}
        >
          {linkLabel}
        </button>
      </div>
    </div>
  );
}
