import { useState } from 'react';
import { TEACHING_CASES } from '../../data/demoData';
import { colors, fontSize, fontWeight } from '../../styles/tokens';
import CDSCard from './CDSCard';
import EHRPatientBanner from './EHRPatientBanner';
import YearsCalculatorModal from '../YearsCalculatorModal';

const patient = TEACHING_CASES[11]; // Barnes, Richard

// D-Dimer in ng/mL (data is in µg/mL, multiply by 1000)
const ddimerNgMl = Math.round((patient.ddimer?.value ?? 0) * 1000);

const EHR_TABS = ['Summary', 'Chart Review', 'Orders', 'Results', 'Notes', 'Imaging'];

const LABS = [
  { name: 'Troponin I', value: `${patient.troponin} ng/mL`, flag: '', elevated: false },
  { name: 'Creatinine', value: `${patient.creatinine} mg/dL`, flag: '', elevated: false },
  { name: 'eGFR', value: `${patient.egfr} mL/min`, flag: '', elevated: false },
  { name: 'WBC', value: '8.2 K/µL', flag: '', elevated: false },
  { name: 'Hgb', value: '14.1 g/dL', flag: '', elevated: false },
];

const VITALS = [
  { label: 'HR', value: `${patient.vitals.hr}`, unit: 'bpm' },
  { label: 'BP', value: `${patient.vitals.sbp}/${patient.vitals.dbp}`, unit: 'mmHg' },
  { label: 'SpO₂', value: `${patient.vitals.spo2}%`, unit: patient.vitals.o2Device },
  { label: 'RR', value: `${patient.vitals.rr}`, unit: '/min' },
  { label: 'Temp', value: `${patient.vitals.temp}°C`, unit: '' },
];

export default function Case2Screen() {
  const [showYears, setShowYears] = useState(false);

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
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Emergency Department · Bay 7</span>
      </div>

      {/* Patient Banner */}
      <EHRPatientBanner
        name={patient.name}
        age={patient.age}
        gender={patient.gender}
        mrn={patient.mrn}
        chiefComplaint={patient.chiefComplaint}
        room="ED Bay 7"
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
              fontWeight: tab === 'Summary' ? 600 : 400,
              color: tab === 'Summary' ? '#1B3A5C' : '#64748B',
              backgroundColor: tab === 'Summary' ? 'white' : 'transparent',
              border: 'none',
              borderBottom: tab === 'Summary' ? '2px solid #1B3A5C' : '2px solid transparent',
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
          title="D-Dimer is 760 ng/mL. YEARS can rule out PE if no criteria are present. Use the linked YEARS calculator to check for PE rule out and get MDM."
          linkLabel="Calculate YEARS and get MDM"
          onLinkClick={() => setShowYears(true)}
        />

        {/* Vitals */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
        }}>
          <div style={{
            padding: '10px 16px',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            borderRadius: '8px 8px 0 0',
          }}>
            <span style={{ fontSize: fontSize.heading, fontWeight: fontWeight.semibold, color: colors.black }}>
              Current Vitals
            </span>
          </div>
          <div style={{ display: 'flex', padding: '12px 16px', gap: 24, flexWrap: 'wrap' }}>
            {VITALS.map((v, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 12, color: colors.gray }}>{v.label}</span>
                <span style={{ fontSize: 20, fontWeight: fontWeight.semibold, color: colors.black }}>{v.value}</span>
                <span style={{ fontSize: 12, color: colors.gray }}>{v.unit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Labs */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
        }}>
          <div style={{
            padding: '10px 16px',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            borderRadius: '8px 8px 0 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: fontSize.heading, fontWeight: fontWeight.semibold, color: colors.black }}>
              Lab Results
            </span>
            <span style={{ fontSize: fontSize.label, color: colors.gray }}>Today 16:00</span>
          </div>
          {LABS.map((lab, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                borderBottom: i < LABS.length - 1 ? '1px solid #F1F5F9' : 'none',
              }}
            >
              <span style={{ fontSize: fontSize.body, color: colors.black }}>{lab.name}</span>
              <span style={{ fontSize: fontSize.body, color: colors.black }}>{lab.value}</span>
            </div>
          ))}
        </div>

        {/* Active Problems */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
        }}>
          <div style={{
            padding: '10px 16px',
            borderRadius: '8px 8px 0 0',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
          }}>
            <span style={{ fontSize: fontSize.heading, fontWeight: fontWeight.semibold, color: colors.black }}>
              Active Problems
            </span>
          </div>
          {patient.activeProblems.map((prob, i) => (
            <div
              key={i}
              style={{
                padding: '9px 16px',
                borderBottom: i < patient.activeProblems.length - 1 ? '1px solid #F1F5F9' : 'none',
                fontSize: fontSize.body,
                color: colors.black,
              }}
            >
              {prob}
            </div>
          ))}
        </div>
      </div>

      {/* YEARS Modal */}
      {showYears && (
        <YearsCalculatorModal
          initialCase="case1"
          initialFactors={{ dvt: null, hemoptysis: null, peMostLikely: null }}
          onClose={() => setShowYears(false)}
        />
      )}
    </div>
  );
}
