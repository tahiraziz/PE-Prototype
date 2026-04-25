import { CheckCircle, AlertTriangle } from 'lucide-react';
import { colors, fontSize, fontWeight } from '../../styles/tokens';

interface AlertCardAction {
  label: string;
  onClick: () => void;
}

interface AlertCardProps {
  /** "success" = green rule-out card · "danger" = red cannot-rule-out card */
  variant: 'success' | 'danger';
  title: string;
  body?: string;
  /** Optional primary action button rendered inside the card */
  action?: AlertCardAction;
}

/**
 * AlertCard
 * Colored result card used to surface rule-out / cannot-rule-out outcomes.
 * Success: green background, CheckCircle icon, green title.
 * Danger: red background, AlertTriangle icon, red title.
 */
export default function AlertCard({ variant, title, body, action }: AlertCardProps) {
  const isSuccess = variant === 'success';
  const textColor = isSuccess ? colors.green : colors.red;
  const bgColor   = isSuccess ? colors.lightGreen : colors.lightRed;
  const border    = isSuccess ? 'rgba(22,101,52,0.25)' : 'rgba(153,27,27,0.2)';
  const Icon      = isSuccess ? CheckCircle : AlertTriangle;

  return (
    <div
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${border}`,
        borderRadius: 8,
        padding: 20,
      }}
    >
      {/* Icon + title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: body ? 12 : 0 }}>
        <span style={{ color: textColor, marginTop: 2, flexShrink: 0 }}>
          <Icon size={18} />
        </span>
        <p
          style={{
            fontSize: fontSize.body,
            fontWeight: fontWeight.semibold,
            color: textColor,
          }}
        >
          {title}
        </p>
      </div>

      {/* Body text */}
      {body && (
        <p
          style={{
            fontSize: fontSize.label,
            color: colors.black,
            lineHeight: 1.6,
            marginBottom: action ? 20 : 0,
          }}
        >
          {body}
        </p>
      )}

      {/* Action button */}
      {action && (
        <button
          onClick={action.onClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 16px',
            height: 36,
            backgroundColor: colors.black,
            color: 'white',
            fontSize: fontSize.label,
            fontWeight: fontWeight.semibold,
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
