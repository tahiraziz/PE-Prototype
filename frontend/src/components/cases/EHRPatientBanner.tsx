interface EHRPatientBannerProps {
  name: string;
  age: number;
  gender: string;
  mrn: string;
  chiefComplaint: string;
  allergies?: string;
  room?: string;
}

export default function EHRPatientBanner({
  name, age, gender, mrn, chiefComplaint, allergies, room,
}: EHRPatientBannerProps) {
  return (
    <div style={{
      backgroundColor: '#1B3A5C',
      color: 'white',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      flexWrap: 'wrap',
    }}>
      {/* Name */}
      <span style={{ fontSize: 15, fontWeight: 600, marginRight: 20 }}>{name}</span>

      {/* Demographic chips */}
      {[
        `${age}y ${gender}`,
        `MRN: ${mrn}`,
        ...(room ? [`Room: ${room}`] : []),
        `CC: ${chiefComplaint}`,
      ].map((item, i) => (
        <span key={i} style={{
          fontSize: 13,
          opacity: 0.82,
          marginRight: 20,
          paddingRight: 20,
          borderRight: '1px solid rgba(255,255,255,0.25)',
          lineHeight: 1,
        }}>
          {item}
        </span>
      ))}

      {/* Allergy pill */}
      {allergies && (
        <span style={{
          fontSize: 12,
          backgroundColor: '#DC2626',
          padding: '2px 8px',
          borderRadius: 4,
          fontWeight: 600,
        }}>
          NKDA
        </span>
      )}
    </div>
  );
}
