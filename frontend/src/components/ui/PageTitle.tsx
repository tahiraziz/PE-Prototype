import { colors, fontSize, fontWeight } from '../../styles/tokens';

interface PageTitleProps {
  title: string;
  subtitle?: string;
}

/**
 * PageTitle
 * Section or modal heading with an optional supporting subtitle.
 * Title: 20px semibold black. Subtitle: 14px gray.
 */
export default function PageTitle({ title, subtitle }: PageTitleProps) {
  return (
    <div>
      <p
        style={{
          fontSize: fontSize.title,
          fontWeight: fontWeight.semibold,
          color: colors.black,
          lineHeight: 1.3,
          marginBottom: subtitle ? 8 : 0,
        }}
      >
        {title}
      </p>
      {subtitle && (
        <p
          style={{
            fontSize: fontSize.label,
            color: colors.gray,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
