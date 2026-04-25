import { colors } from '../../styles/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * Card
 * Section container used in the dashboard card layout.
 * Specs: border 1px solid colors.border · borderRadius 8px · overflow hidden · white background.
 * Cards are arranged with gap: 4px between them.
 */
export default function Card({ children, style }: CardProps) {
  return (
    <div
      style={{
        backgroundColor: '#fff',
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
