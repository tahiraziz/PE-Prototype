import { Check, X } from 'lucide-react';
import { colors, fontSize, fontWeight } from '../../styles/tokens';

interface YesNoToggleProps {
  /** Current selection: true = Yes, false = No, null = unselected */
  value: boolean | null;
  onChange: (value: boolean) => void;
}

const SELECTED_COLOR  = colors.darkBlue;
const SELECTED_BG     = colors.lightBlue;
const UNSELECTED_COLOR = colors.gray;

/**
 * YesNoToggle
 * A paired Yes / No button used in clinical calculators (YEARS, Wells).
 * Yes is the left button (rounded-l), No is the right (rounded-r).
 * Selected state: blue border + blue text (medium) + light-blue background + checkmark/X icon.
 * Unselected state: gray border + gray text (regular) + white background.
 */
export default function YesNoToggle({ value, onChange }: YesNoToggleProps) {
  const buttonBase: React.CSSProperties = {
    flex: 1,
    height: 52,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    fontSize: fontSize.body,
    cursor: 'pointer',
    background: 'none',
    transition: 'background-color 0.1s, color 0.1s',
  };

  const yesSelected = value === true;
  const noSelected  = value === false;

  return (
    <div style={{ display: 'flex', width: '100%' }}>
      {/* Yes */}
      <button
        onClick={() => onChange(true)}
        style={{
          ...buttonBase,
          borderRadius: '4px 0 0 4px',
          fontWeight: yesSelected ? fontWeight.medium : fontWeight.regular,
          borderTop:    `1px solid ${yesSelected ? SELECTED_COLOR : colors.inputBorder}`,
          borderLeft:   `1px solid ${yesSelected ? SELECTED_COLOR : colors.inputBorder}`,
          borderBottom: `1px solid ${yesSelected ? SELECTED_COLOR : colors.inputBorder}`,
          borderRight:  yesSelected ? `1px solid ${SELECTED_COLOR}` : 'none',
          backgroundColor: yesSelected ? SELECTED_BG : 'white',
          color: yesSelected ? SELECTED_COLOR : UNSELECTED_COLOR,
        }}
      >
        {yesSelected && <Check size={14} />}
        Yes
      </button>

      {/* No */}
      <button
        onClick={() => onChange(false)}
        style={{
          ...buttonBase,
          borderRadius: '0 4px 4px 0',
          fontWeight: noSelected ? fontWeight.medium : fontWeight.regular,
          borderTop:    `1px solid ${noSelected ? SELECTED_COLOR : colors.inputBorder}`,
          borderRight:  `1px solid ${noSelected ? SELECTED_COLOR : colors.inputBorder}`,
          borderBottom: `1px solid ${noSelected ? SELECTED_COLOR : colors.inputBorder}`,
          borderLeft:   yesSelected ? 'none' : `1px solid ${noSelected ? SELECTED_COLOR : colors.inputBorder}`,
          backgroundColor: noSelected ? SELECTED_BG : 'white',
          color: noSelected ? SELECTED_COLOR : UNSELECTED_COLOR,
        }}
      >
        {noSelected && <X size={14} />}
        No
      </button>
    </div>
  );
}
