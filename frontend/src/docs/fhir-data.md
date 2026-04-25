# FHIR Field Reference — Luminur PE Dashboard (Screenshot 2)

**FHIR version:** R4 | **EHR target:** Epic | **Date:** March 2026

---

## Section 1: Vital Signs

All use `Observation` resource with `category=vital-signs`.

---

### Heart Rate (HR)
| Property | Value |
|---|---|
| **Display** | 102 bpm — TACHYCARDIA |
| **FHIR Resource** | `Observation` |
| **LOINC** | `8867-4` |
| **Value path** | `valueQuantity.value` |
| **Unit (UCUM)** | `/min` |
| **Prefetch query** | `Observation?patient={{context.patientId}}&code=http://loinc.org\|8867-4&category=vital-signs&_sort=-date&_count=1` |
| **TACHYCARDIA label** | Applied by CDS service: value > 100 |
| **Example JSON** | `"valueQuantity": { "value": 102, "unit": "beats/min", "system": "http://unitsofmeasure.org", "code": "/min" }` |
| **Notes** | Interpretation flag (`"H"`) may not always be populated in Epic — apply threshold in your service rather than relying on the flag. |

---

### Blood Pressure (BP)
| Property | Value |
|---|---|
| **Display** | 128/78 mmHg |
| **FHIR Resource** | `Observation` (panel with two components) |
| **LOINC — panel** | `85354-9` |
| **LOINC — systolic component** | `8480-6` |
| **LOINC — diastolic component** | `8462-4` |
| **Systolic value path** | `component[?(@.code.coding[0].code=='8480-6')].valueQuantity.value` |
| **Diastolic value path** | `component[?(@.code.coding[0].code=='8462-4')].valueQuantity.value` |
| **Unit (UCUM)** | `mm[Hg]` |
| **Prefetch query** | `Observation?patient={{context.patientId}}&code=http://loinc.org\|85354-9&category=vital-signs&_sort=-date&_count=1` |
| **Notes** | Always query by panel code `85354-9`. Systolic and diastolic are not independently searchable in Epic FHIR — both live inside the `component` array of the same resource. |

---

### SpO2
| Property | Value |
|---|---|
| **Display** | 93% [2L NC] — HYPOXIA |
| **FHIR Resource** | `Observation` |
| **LOINC** | `59408-5` (pulse oximetry) or `2708-6` (general) |
| **Value path** | `valueQuantity.value` |
| **Unit (UCUM)** | `%` |
| **Prefetch query** | `Observation?patient={{context.patientId}}&code=http://loinc.org\|59408-5,http://loinc.org\|2708-6&category=vital-signs&_sort=-date&_count=1` |
| **HYPOXIA label** | Applied by CDS service: value < 94% |
| **"2L NC" context** | ⚠️ Not reliably structured in FHIR R4. May appear in `note[0].text` or a `component` field depending on Epic version and flowsheet config. Cannot be guaranteed via prefetch. |
| **Notes** | Query both LOINC codes — Epic sites vary on which is used. |

---

### Respiratory Rate (RR)
| Property | Value |
|---|---|
| **Display** | 24 /min — TACHYPNEA |
| **FHIR Resource** | `Observation` |
| **LOINC** | `9279-1` |
| **Value path** | `valueQuantity.value` |
| **Unit (UCUM)** | `/min` |
| **Prefetch query** | `Observation?patient={{context.patientId}}&code=http://loinc.org\|9279-1&category=vital-signs&_sort=-date&_count=1` |
| **TACHYPNEA label** | Applied by CDS service: value > 20 |
| **Notes** | Reliable across Epic sites. |

---

### Temperature (TEMP)
| Property | Value |
|---|---|
| **Display** | 38.6°C — FEBRILE |
| **FHIR Resource** | `Observation` |
| **LOINC** | `8310-5` |
| **Value path** | `valueQuantity.value` |
| **Unit (UCUM)** | `Cel` |
| **Prefetch query** | `Observation?patient={{context.patientId}}&code=http://loinc.org\|8310-5&category=vital-signs&_sort=-date&_count=1` |
| **FEBRILE label** | Applied by CDS service: value > 38.0°C |
| **Notes** | Some Epic sites store in Fahrenheit (`[degF]`). Check `valueQuantity.unit` and convert if needed: °C = (°F − 32) × 5/9. |

---

## Section 2: Hemodynamic Stress (Calculated Values)

Neither MAP nor Shock Index are stored in Epic as discrete FHIR Observations in standard configurations. Both must be calculated by your CDS service from raw vital sign components.

---

### MAP (Mean Arterial Pressure)
| Property | Value |
|---|---|
| **Display** | 95 mmHg |
| **FHIR Resource** | ⚠️ Not stored — calculated |
| **Formula** | `(SBP + 2 × DBP) ÷ 3` |
| **Source fields** | SBP component `8480-6` + DBP component `8462-4` from BP panel `85354-9` |
| **Stored alternative** | LOINC `8478-0` — exists in some ICU flowsheet configs but not reliably available across sites |
| **Notes** | Always fall back to calculating from SBP/DBP. Do not rely on stored MAP being present. |

---

### Shock Index
| Property | Value |
|---|---|
| **Display** | 0.80 — > 0.7 Caution |
| **FHIR Resource** | ⚠️ Not stored — calculated |
| **Formula** | `HR ÷ SBP` |
| **Source fields** | HR from LOINC `8867-4`; SBP from BP panel component `8480-6` |
| **Caution threshold** | > 0.7 — label applied by CDS service |
| **Critical threshold** | > 1.0 |
| **Notes** | Retrieve HR and BP from the same or closest available timestamps. If timestamps differ, note the time delta in your card detail text. |

---

## Section 3: Previous Diagnoses Checklist

These fields represent PE risk criteria. Each criterion maps to a different FHIR resource type and query strategy. Your CDS service evaluates each query result and derives a boolean (criteria met) to render the checklist.

---

### Prior PE Diagnosis
| Property | Value |
|---|---|
| **Display** | Prior PE Diagnosis — 02/15/2023 (red flag) |
| **FHIR Resource** | `Condition` |
| **Code system** | ICD-10-CM or SNOMED CT |
| **ICD-10 code** | `I26.99` (other pulmonary embolism without acute cor pulmonale) or `I26.09` / `I26.90` depending on specificity |
| **SNOMED code** | `59282003` (Pulmonary embolism) |
| **Prefetch query** | `Condition?patient={{context.patientId}}&code=http://hl7.org/fhir/sid/icd-10-cm\|I26.99,http://snomed.info/sct\|59282003&clinical-status=active,resolved,inactive` |
| **Date path** | `onsetDateTime` or `recordedDate` |
| **Criterion derivation** | CDS service checks: does any result exist? → if yes, flag as red |
| **Notes** | Query both active and resolved/inactive conditions — a prior PE may be coded as resolved but is still clinically relevant. Include multiple ICD-10 PE codes as Epic sites vary in specificity. |

---

### Immobilization in the last 3 days
| Property | Value |
|---|---|
| **Display** | Immobilization in the last 3 days — 03/01/2026 · Fall due to broken hip (red flag) |
| **FHIR Resource** | `Condition` (fracture/injury) + `Procedure` (surgical immobilization) + `Encounter` (hospitalization) |
| **ICD-10 — hip fracture** | `S72.001A` (fracture of femoral neck) or `S72.90XA` (unspecified fracture of femur) |
| **SNOMED — immobilization** | `415510000` (Immobilization) |
| **Prefetch query — conditions** | `Condition?patient={{context.patientId}}&onset-date=ge{{today-3d}}&_sort=-onset-date&_count=20` |
| **Prefetch query — encounters** | `Encounter?patient={{context.patientId}}&date=ge{{today-3d}}&class=IMP,EMER&_sort=-date&_count=5` |
| **Criterion derivation** | CDS service checks: any immobilizing condition, surgery, or inpatient stay within last 3 days? Apply date filter on `onsetDateTime` |
| **Notes** | ⚠️ This is the hardest checklist criterion to reliably derive. "Immobilization" is not a single discrete code — it encompasses fracture states, prolonged bed rest, and paralysis. Your service needs to evaluate a broad set of relevant codes and apply clinical judgment logic. Consider also querying `Procedure` for recent surgeries (`Procedure?patient={{context.patientId}}&date=ge{{today-28d}}`). |

---

### No cancer in the last 6 months
| Property | Value |
|---|---|
| **Display** | No cancer in the last 6 months (negative criterion — not flagged) |
| **FHIR Resource** | `Condition` |
| **ICD-10 range** | `C00`–`C96` (malignant neoplasms) |
| **SNOMED** | `363346000` (Malignant neoplastic disease) |
| **Prefetch query** | `Condition?patient={{context.patientId}}&category=problem-list-item&clinical-status=active` |
| **Criterion derivation** | CDS service checks: any active malignancy code in C00–C96 range? If none found → display as "No cancer in last 6 months" |
| **Notes** | Also query `onset-date=ge{{today-180d}}` for recently resolved cancers. Active problem list is the most reliable source in Epic but may not capture all historical malignancies. |

---

### No surgeries in the last 4 weeks
| Property | Value |
|---|---|
| **Display** | No surgeries in the last 4 weeks (negative criterion) |
| **FHIR Resource** | `Procedure` |
| **SNOMED — surgical procedure** | `387713003` (Surgical procedure) |
| **Prefetch query** | `Procedure?patient={{context.patientId}}&date=ge{{today-28d}}&_sort=-date&_count=10` |
| **Criterion derivation** | CDS service checks: any Procedure with category = surgical within last 28 days? If none → negative criterion |
| **Notes** | Epic populates `Procedure` from OR documentation. Minor procedures (biopsies, line placements) may or may not be present depending on Epic build. Date filter uses `performed` element: `performedDateTime` or `performedPeriod.start`. |

---

### No prior Thrombophilia
| Property | Value |
|---|---|
| **Display** | No prior Thrombophilia (negative criterion) |
| **FHIR Resource** | `Condition` |
| **ICD-10 codes** | `D68.59` (other primary thrombophilia), `D68.51` (activated protein C resistance), `D68.52` (prothrombin gene mutation), `D68.61` (antiphospholipid syndrome) |
| **SNOMED** | `234467004` (Thrombophilia) |
| **Prefetch query** | `Condition?patient={{context.patientId}}&code=http://hl7.org/fhir/sid/icd-10-cm\|D68.59,http://hl7.org/fhir/sid/icd-10-cm\|D68.51,http://hl7.org/fhir/sid/icd-10-cm\|D68.52&clinical-status=active,inactive,resolved` |
| **Criterion derivation** | CDS service checks: any thrombophilia condition found? If none → negative criterion |
| **Notes** | Include resolved/inactive status — thrombophilia is a lifetime diagnosis even when not listed as active. |

---

### Not currently pregnant
| Property | Value |
|---|---|
| **Display** | Not currently pregnant (negative criterion) |
| **FHIR Resource** | `Condition` or `Observation` |
| **ICD-10 — pregnancy** | `Z34.xx` (supervision of normal pregnancy) range |
| **SNOMED** | `77386006` (Pregnancy) |
| **LOINC — pregnancy test** | `2106-3` (pregnancy status) |
| **Prefetch query — condition** | `Condition?patient={{context.patientId}}&code=http://snomed.info/sct\|77386006&clinical-status=active` |
| **Prefetch query — observation** | `Observation?patient={{context.patientId}}&code=http://loinc.org\|2106-3&_sort=-date&_count=1` |
| **Criterion derivation** | CDS service checks: active pregnancy condition OR positive pregnancy test Observation? If neither → not currently pregnant |
| **Notes** | ⚠️ Pregnancy status in Epic is often documented in OB-specific flowsheets that may not surface via standard FHIR Observation queries. This criterion has lower reliability than others — consider flagging "unknown" rather than "not pregnant" if no data is found. Also check patient `gender` — if male, skip query entirely. |

---

### Not currently on estrogen
| Property | Value |
|---|---|
| **Display** | Not currently on estrogen (negative criterion) |
| **FHIR Resource** | `MedicationRequest` |
| **RxNorm — estrogen class** | Estradiol: `4083`; Conjugated estrogens: `3410`; Ethinyl estradiol: `4099` |
| **NDF-RT drug class** | `C0175693` (Estrogens) |
| **Prefetch query** | `MedicationRequest?patient={{context.patientId}}&status=active&_count=50` |
| **Criterion derivation** | CDS service filters active MedicationRequests for any medication in the estrogen drug class using RxNorm codes or text matching. If none found → not on estrogen |
| **Notes** | Covers oral contraceptives containing ethinyl estradiol, HRT patches, and vaginal estrogen. Text-based matching is a useful fallback given variability in RxNorm coding across Epic sites. |

---

## Section 4: Anticoagulants

---

### Warfarin
| Property | Value |
|---|---|
| **Display** | Warfarin — 5mg 2x/day (green dot = active) |
| **FHIR Resource** | `MedicationRequest` |
| **RxNorm code** | `11289` (warfarin) |
| **Medication name path** | `medicationCodeableConcept.text` or `medicationCodeableConcept.coding[0].display` |
| **Dose path** | `dosageInstruction[0].doseAndRate[0].doseQuantity.value` |
| **Frequency path** | `dosageInstruction[0].timing.repeat.frequency` + `periodUnit` |
| **Status path** | `status` — value `"active"` maps to green dot |
| **Prefetch query** | `MedicationRequest?patient={{context.patientId}}&status=active&code=http://www.nlm.nih.gov/research/umls/rxnorm\|11289&_count=5` |
| **Notes** | This section is specifically anticoagulants — filter the broader MedicationRequest result set by drug class. Key anticoagulant RxNorm codes: Warfarin `11289`, Apixaban `1364430`, Rivaroxaban `1114195`, Heparin `5224`, Enoxaparin `67108`. A green dot indicates `status: active`; no dot or grey would indicate discontinued. |

---

## Section 5: Prior CTPAs

---

### Prior CTPA Result
| Property | Value |
|---|---|
| **Display** | Feb 15, 2024 — Negative / "No pulmonary embolism. Mild atelectasis at lung bases." |
| **FHIR Resource** | `DiagnosticReport` |
| **LOINC — CTPA** | `24627-2` (CT chest) or `36643-5` (XR chest, also used for CT in some configs) |
| **Category LOINC** | `LP29684-5` (Radiology) |
| **Date path** | `effectiveDateTime` |
| **Status path** | `status` — value `"final"` |
| **Conclusion path** | `conclusion` — free text radiologist impression ("No pulmonary embolism...") |
| **Negative/Positive derivation** | CDS service applies keyword logic to `conclusion` text: presence of "no pulmonary embolism" or "negative for PE" → Negative label. Alternatively check `conclusionCode` if structured. |
| **Prefetch query** | `DiagnosticReport?patient={{context.patientId}}&code=http://loinc.org\|24627-2&category=LP29684-5&_sort=-date&_count=5` |
| **Notes** | ⚠️ The "Negative" label is derived from free-text NLP on the `conclusion` field — there is no standardized structured PE result code in FHIR R4 that Epic reliably populates. Your service must parse the conclusion string. Also query `ImagingStudy` as a fallback: `ImagingStudy?patient={{context.patientId}}&modality=CT&_sort=-started&_count=5`. |

---

## Section 6: CTPA Safety Barriers

---

### eGFR
| Property | Value |
|---|---|
| **Display** | eGFR 78 — Safe / "Mildly decreased function" |
| **FHIR Resource** | `Observation` |
| **LOINC codes** | `77147-7` (CKD-EPI, preferred) or `33914-3` (MDRD) |
| **Value path** | `valueQuantity.value` |
| **Unit (UCUM)** | `mL/min/{1.73_m2}` |
| **Prefetch query** | `Observation?patient={{context.patientId}}&code=http://loinc.org\|77147-7,http://loinc.org\|33914-3&_sort=-date&_count=1` |
| **Safe/Unsafe threshold** | Safe: ≥ 30; Caution: 15–29; Unsafe: < 15 — applied by CDS service |
| **"Mildly decreased" label** | CDS service maps value to CKD stage: 60–89 = mildly decreased (Stage G2) |
| **Notes** | Query both LOINC codes — Epic sites vary. eGFR is calculated and stored as a lab result, not a vital sign. Check `effectiveDateTime` — use result within last 90 days for contrast safety determination. |

---

### Contrast Allergy
| Property | Value |
|---|---|
| **Display** | Contrast Allergy — None / "No known allergy" |
| **FHIR Resource** | `AllergyIntolerance` |
| **Substance codes — iodinated contrast** | RxNorm `75892` (iohexol), `76093` (ioversol); or SNOMED `385268001` (iodinated contrast media) |
| **Status path** | `clinicalStatus.coding[0].code` — value `"active"` |
| **Substance path** | `code.coding[0].code` + `code.text` |
| **Prefetch query** | `AllergyIntolerance?patient={{context.patientId}}&clinical-status=active` |
| **None derivation** | CDS service filters results for contrast-related substances. If none match → display "None" |
| **Notes** | ⚠️ Contrast allergy coding is inconsistent across Epic sites — some use RxNorm, some use local codes, some use free text in `code.text`. Text matching on "contrast," "iodine," or "dye" in `code.text` is a reliable fallback. Also check `reaction[0].manifestation` for severity (mild/moderate/severe) to differentiate allergy vs. sensitivity. |

---

### Total Radiation Exposure
| Property | Value |
|---|---|
| **Display** | 120 mSv in the last 4 weeks — Unsafe |
| **FHIR Resource** | `ImagingStudy` (primary) + `DiagnosticReport` (secondary) |
| **Dose element path** | `ImagingStudy.series[0].instance[0]` — DICOM RDSR may be referenced |
| **Dose DICOM tag** | `(0040,A124)` CT Dose Series; or `ImagingStudy.extension` for dose SR reference |
| **Prefetch query** | `ImagingStudy?patient={{context.patientId}}&started=ge{{today-28d}}&modality=CT,XA,NM&_sort=-started&_count=20` |
| **Unsafe threshold** | > 100 mSv in 4 weeks — applied by CDS service |
| **Notes** | ⚠️ **This is the most unreliable field in the entire dashboard.** Radiation dose data is not consistently structured in Epic's FHIR R4 implementation. Dose values live in DICOM Radiation Dose Structured Reports (RDSR) which are separate from the ImagingStudy resource and not reliably surfaced via FHIR. Most Epic sites do not expose cumulative dose via FHIR. Realistic options: (1) use a dedicated dose tracking system (Radimetrics, DoseWatch) with its own API, (2) use Epic's Clarity/Caboodle tables for retrospective dose data, (3) estimate dose from procedure type (CT chest ≈ 7 mSv, CT abdomen ≈ 8 mSv) and count imaging studies as a proxy. Flag as "data unavailable" if dose cannot be retrieved. |
