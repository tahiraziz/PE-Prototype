import { useState } from 'react';
import { TEACHING_CASES } from '../../data/demoData';
import { colors, fontSize, fontWeight } from '../../styles/tokens';
import CDSCard from './CDSCard';
import EHRPatientBanner from './EHRPatientBanner';
import WellsCalculatorModal from './WellsCalculatorModal';

const patient = TEACHING_CASES[10]; // Miller, James

const EHR_TABS = ['Summary', 'Chart Review', 'Orders', 'Results', 'Notes', 'Imaging'];

export default function Case1Screen() {
  const [showWells, setShowWells] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#F1F5F9' }}>
      {/* EHR System Header */}
      <div style={{
        backgroundColor: '#0F2D4A',
        padding: '6px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        <span style={{ color: 'white', fontSize: 13, fontWeight: 600, opacity: 0.9 }}>MediChart EHR</span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>|</span>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Emergency Department · Bay 4</span>
      </div>

      {/* Patient Banner */}
      <EHRPatientBanner
        name={patient.name}
        age={patient.age}
        gender={patient.gender}
        mrn={patient.mrn}
        chiefComplaint={patient.chiefComplaint}
        room="ED Bay 4"
        allergies="NKDA"
      />

      {/* Nav Tabs */}
      <div style={{
        backgroundColor: '#E2E8F0',
        display: 'flex',
        gap: 0,
        borderBottom: '1px solid #CBD5E1',
      }}>
        {EHR_TABS.map(tab => (
          <button
            key={tab}
            style={{
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: tab === 'Orders' ? 600 : 400,
              color: tab === 'Orders' ? '#1B3A5C' : '#64748B',
              backgroundColor: tab === 'Orders' ? 'white' : 'transparent',
              border: 'none',
              borderBottom: tab === 'Orders' ? '2px solid #1B3A5C' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto' }}>
        {/* CDS Card — top of content */}
        <CDSCard
          title="Guidelines are to order D-Dimer unless patient is high risk for PE. Use linked Wells calculator (4/7 criteria pre-filled) for PE risk level."
          suggestion="Order D-Dimer"
          linkLabel="Finish calculating Wells and get MDM"
          onLinkClick={() => setShowWells(true)}
        />

        {/* CTPA Order */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: fontSize.heading, fontWeight: fontWeight.semibold, color: colors.black }}>
              Orders
            </span>
            <span style={{ fontSize: fontSize.label, color: colors.gray }}>
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · 22:05
            </span>
          </div>

          {/* CTPA order row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: fontSize.body, fontWeight: fontWeight.medium, color: colors.black }}>
                CT Pulmonary Angiography (CTPA)
              </span>
              <span style={{ fontSize: fontSize.label, color: colors.gray }}>
                Ordered by Dr. Anush Rizvi · Priority: Stat · Indication: Suspected PE
              </span>
            </div>
            <span style={{
              fontSize: 12,
              fontWeight: fontWeight.medium,
              backgroundColor: '#F8FAFC',
              color: colors.gray,
              border: `1px solid ${colors.border}`,
              padding: '3px 10px',
              borderRadius: 4,
              flexShrink: 0,
            }}>
              Draft
            </span>
          </div>
        </div>
      </div>

      {showWells && <WellsCalculatorModal onClose={() => setShowWells(false)} />}
    </div>
  );
}
