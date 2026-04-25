import { useState } from 'react';
import { colors, fontSize, fontWeight } from '../../styles/tokens';
import Case1Screen from './Case1Screen';
import Case2Screen from './Case2Screen';
import Case3Screen from './Case3Screen';

const CASES = [
  {
    label: 'Case 1',
    subtitle: 'Miller, James',
    intro: "Imagine you're ordering a CTPA for a patient. EHR screen is just illustrative and isn't functional except for our PE topic.",
    component: <Case1Screen />,
  },
  {
    label: 'Case 2',
    subtitle: 'Barnes, Richard',
    intro: "Imagine you've ordered a D-Dimer and are checking the patient chart for the result.",
    component: <Case2Screen />,
  },
  {
    label: 'Case 3',
    subtitle: 'Johnson, Robert',
    intro: "Imagine you're opening up a patient chart to review before you see them.",
    component: <Case3Screen />,
  },
];

export default function CasesView() {
  const [selected, setSelected] = useState(0);
  const [started, setStarted] = useState(false);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Left Nav */}
      <div style={{
        width: 196,
        flexShrink: 0,
        backgroundColor: 'white',
        borderRight: `1px solid ${colors.border}`,
        padding: '16px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}>
        <p style={{
          fontSize: 11,
          fontWeight: fontWeight.semibold,
          color: colors.gray,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          padding: '0 16px 8px',
        }}>
          Patient Cases
        </p>

        {CASES.map((c, i) => (
          <button
            key={i}
            onClick={() => { setSelected(i); setStarted(false); }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 2,
              padding: '10px 16px',
              background: selected === i ? colors.lightBlue : 'transparent',
              border: 'none',
              borderLeft: `3px solid ${selected === i ? colors.darkBlue : 'transparent'}`,
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
              transition: 'background 0.15s',
            }}
          >
            <span style={{
              fontSize: fontSize.label,
              fontWeight: selected === i ? fontWeight.semibold : fontWeight.regular,
              color: selected === i ? colors.darkBlue : colors.black,
            }}>
              {c.label}
            </span>
            <span style={{
              fontSize: 12,
              color: selected === i ? colors.darkBlue : colors.gray,
              opacity: selected === i ? 0.8 : 1,
            }}>
              {c.subtitle}
            </span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {!started ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            backgroundColor: '#F1F5F9',
          }}>
            <div style={{
              backgroundColor: 'white',
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: '40px 48px',
              maxWidth: 520,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: fontWeight.semibold, color: colors.gray, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {CASES[selected].label}
                </span>
                <p style={{ fontSize: 18, fontWeight: fontWeight.semibold, color: colors.black, lineHeight: 1.5, margin: 0 }}>
                  {CASES[selected].intro}
                </p>
              </div>
              <button
                onClick={() => setStarted(true)}
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: colors.darkBlue,
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 24px',
                  fontSize: fontSize.label,
                  fontWeight: fontWeight.semibold,
                  cursor: 'pointer',
                }}
              >
                Start
              </button>
            </div>
          </div>
        ) : (
          CASES[selected].component
        )}
      </div>
    </div>
  );
}
