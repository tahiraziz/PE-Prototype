import { colors, fontSize, fontWeight } from '../../styles/tokens';

interface SectionHeaderProps {
  /** A Lucide icon element, e.g. <Heart size={16} color={colors.gray} /> */
  icon: React.ReactNode;
  label: string;
}

/**
 * SectionHeader
 * Floating section title — sits inside the section's 24px padding, no background or border of its own.
 * Icon + label inline. Label is all-caps, 14px regular black with letter-spacing.
 * Parent is responsible for marginBottom: 24px before first item.
 */
export default function SectionHeader({ icon, label }: SectionHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {icon}
      <span
        style={{
          color: colors.gray,
          fontSize: 14,
          fontWeight: fontWeight.regular,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    </div>
  );
}
