import { colors, fontSize, fontWeight } from '../../styles/tokens';

type ButtonVariant = 'primary' | 'blue';

interface ButtonProps {
  label: string;
  onClick?: () => void;
  /** Icon rendered before the label, e.g. <ClipboardCopy size={15} /> */
  icon?: React.ReactNode;
  /**
   * primary — black fill, white text (copy / confirm actions)
   * blue    — dark-blue border + text, light-blue fill (secondary / view actions)
   */
  variant?: ButtonVariant;
  disabled?: boolean;
}

const STYLES: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: colors.black,
    color: 'white',
    border: 'none',
  },
  blue: {
    backgroundColor: colors.lightBlue,
    color: colors.darkBlue,
    border: `1px solid ${colors.darkBlue}`,
  },
};

/**
 * Button
 * General-purpose action button in two variants:
 * - primary: black fill (copy MDM, confirm)
 * - blue: light-blue fill with dark-blue border (view D-Dimer, secondary actions)
 */
export default function Button({ label, onClick, icon, variant = 'primary', disabled = false }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 16px',
        height: 36,
        fontSize: fontSize.label,
        fontWeight: fontWeight.semibold,
        borderRadius: 4,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        ...STYLES[variant],
      }}
    >
      {icon && icon}
      {label}
    </button>
  );
}
