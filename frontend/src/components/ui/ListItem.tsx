import { colors, fontSize, fontWeight } from '../../styles/tokens';

interface ListItemProps {
  label: string;
  /** Secondary line shown below the label in gray */
  detail?: string | null;
  /**
   * Alert state controls dot and label color:
   * - "active"   → red dot + red label (medium weight) + gray detail indented
   * - "inactive" → no dot + black label (regular weight) + no detail rendered
   * - undefined  → no dot + black label + gray detail below (default)
   */
  alertState?: 'active' | 'inactive';
  /** Optional badge rendered inline after the label text */
  badge?: React.ReactNode;
}

/**
 * ListItem
 * Flexible list row covering three usage patterns:
 *
 * 1. Default — label + detail subtext (e.g. anticoagulant name + dose,
 *    prior CTPA date + summary, CTPA safety item + badge)
 * 2. Alert dot — active/inactive checklist rows (Previous Diagnoses pattern)
 * 3. Badge — label with an inline colored badge (CTPA Safety Barriers pattern)
 *
 * Patterns can be combined: an active alert row can also carry a badge.
 */
export default function ListItem({ label, detail, alertState, badge }: ListItemProps) {
  const isActive   = alertState === 'active';
  const isInactive = alertState === 'inactive';
  const hasDot     = isActive;

  const labelColor  = isActive ? colors.red : isInactive ? colors.gray : colors.black;
  const labelWeight = isActive ? fontWeight.medium : fontWeight.regular;

  // Detail is suppressed in inactive state to keep the list clean
  const showDetail  = !isInactive && detail;
  // Indent detail to clear the dot slot when in active state
  const detailLeft  = hasDot ? 18 : 0;

  return (
    <div>
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Dot slot — always reserves width when alertState is set, keeps alignment */}
        {alertState !== undefined && (
          <div style={{ flexShrink: 0, width: 10 }}>
            {isActive && (
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: colors.red,
                }}
              />
            )}
          </div>
        )}

        {/* Label text */}
        <span
          style={{
            color: labelColor,
            fontSize: fontSize.label,
            fontWeight: labelWeight,
          }}
        >
          {label}
        </span>

        {/* Inline badge */}
        {badge && badge}
      </div>

      {/* Detail / subtext */}
      {showDetail && (
        <div
          style={{
            color: colors.gray,
            fontSize: fontSize.label,
            marginLeft: detailLeft,
            marginTop: 2,
          }}
        >
          {detail}
        </div>
      )}
    </div>
  );
}
