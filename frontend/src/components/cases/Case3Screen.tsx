import { useState } from 'react';
import { TEACHING_CASES } from '../../data/demoData';
import { colors, fontSize, fontWeight } from '../../styles/tokens';
import CDSCard from './CDSCard';
import EHRPatientBanner from './EHRPatientBanner';
import DashboardLayout from '../DashboardLayout';

const patient = TEACHING_CASES[0]; // Johnson, Robert
const CASE_INDEX = 0;

const EHR_TABS = ['Summary', 'Chart Review', 'Orders', 'Results', 'Notes', 'Imaging'];

const VITALS = [
  { label: 'HR', value: `${patient.vitals.hr}`, unit: 'bpm', alert: patient.vitals.hr > 100 },
  { label: 'BP', value: `${patient.vitals.sbp}/${patient.vitals.dbp}`, unit: 'mmHg', alert: patient.vitals.sbp < 90 },
  { label: 'SpO₂', value: `${patient.vitals.spo2}%`, unit: patient.vitals.o2Device, alert: patient.vitals.spo2 < 95 },
  { label: 'RR', value: `${patient.vitals.rr}`, unit: '/min', alert: patient.vitals.rr > 20 },
  { label: 'Temp', value: `${patient.vitals.temp}°C`, unit: '', alert: patient.vitals.temp > 38 },
];

export default function Case3Screen() {
  const [modalOpen, setModalOpen] = useState(false);

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
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Emergency Department · Bay 2</span>
      </div>

      {/* Patient Banner */}
      <EHRPatientBanner
        name={patient.name}
        age={patient.age}
        gender={patient.gender}
        mrn={patient.mrn}
        chiefComplaint={patient.chiefComplaint}
        room="ED Bay 2"
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
          title={`Patient is ESI 1 with CC of ${patient.chiefComplaint}. If PE is in your differential, use linked PE workup for consolidated patient data.`}
          detail="PE workup consolidates relevant patient chart data such as previous diagnoses, hemodynamic stress, and patient CTPA safety risks."
          linkLabel="Open PE workup"
          onLinkClick={() => setModalOpen(true)}
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
                <span style={{
                  fontSize: 20,
                  fontWeight: fontWeight.semibold,
                  color: colors.black,
                }}>
                  {v.value}
                </span>
                <span style={{ fontSize: 12, color: colors.gray }}>{v.unit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Active Problems + History */}
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{
            flex: 1,
            backgroundColor: 'white',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 16px',
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

          <div style={{
            flex: 1,
            backgroundColor: 'white',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 16px',
              backgroundColor: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
            }}>
              <span style={{ fontSize: fontSize.heading, fontWeight: fontWeight.semibold, color: colors.black }}>
                Relevant History
              </span>
            </div>
            {patient.relevantHistory.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: '9px 16px',
                  borderBottom: i < patient.relevantHistory.length - 1 ? '1px solid #F1F5F9' : 'none',
                  fontSize: fontSize.label,
                  color: colors.black,
                  lineHeight: 1.5,
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Medications */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 16px',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
          }}>
            <span style={{ fontSize: fontSize.heading, fontWeight: fontWeight.semibold, color: colors.black }}>
              Medications
            </span>
          </div>
          {patient.medications.map((med, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '9px 16px',
                borderBottom: i < patient.medications.length - 1 ? '1px solid #F1F5F9' : 'none',
              }}
            >
              <span style={{ fontSize: fontSize.body, color: colors.black }}>{med.name}</span>
              <span style={{ fontSize: fontSize.label, color: colors.gray }}>{med.dose}</span>
            </div>
          ))}
        </div>
      </div>

      {/* PE Workup Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: 12,
            width: '100%',
            maxWidth: 1040,
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Modal header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              borderBottom: '1px solid #E2E8F0',
              flexShrink: 0,
            }}>
              <div>
                <span style={{ fontSize: 16, fontWeight: 600, color: colors.black }}>PE Workup</span>
                <span style={{ fontSize: 14, color: colors.gray, marginLeft: 12 }}>
                  {patient.name} · {patient.age}y {patient.gender}
                </span>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: colors.gray,
                  fontSize: 20,
                  lineHeight: 1,
                  padding: '4px 8px',
                }}
              >
                ×
              </button>
            </div>

            {/* Dashboard content */}
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
              <DashboardLayout caseIndex={CASE_INDEX} hideDDimer={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
