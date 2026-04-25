import { colors } from '../../styles/tokens';

type BadgeVariant = 'safe' | 'caution' | 'danger' | 'blue';

const VARIANT_STYLES: Record<BadgeVariant, { color: string; bg: string }> = {
  safe:    { color: colors.green,    bg: colors.lightGreen },
  caution: { color: colors.orange,   bg: colors.lightOrange },
  danger:  { color: colors.red,      bg: colors.lightRed },
  blue:    { color: colors.darkBlue, bg: colors.lightBlue },
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  /** Override text color (ignored when variant is set) */
  color?: string;
  /** Override background color (ignored when variant is set) */
  bg?: string;
}

/**
 * Badge
 * Small inline pill used for status labels (Safe, Caution, ALLERGY, etc.).
 * Prefer variant prop; use color + bg only for one-off custom states.
 */
export default function Badge({ label, variant, color, bg }: BadgeProps) {
  const resolved = variant ? VARIANT_STYLES[variant] : { color: color ?? colors.gray, bg: bg ?? 'transparent' };

  return (
    <span
      style={{
        color: resolved.color,
        backgroundColor: resolved.bg,
        fontSize: 12,
        fontWeight: 400,
        padding: '2px 8px',
        borderRadius: 4,
        display: 'inline-block',
        lineHeight: '1.5',
      }}
    >
      {label}
    </span>
  );
}
