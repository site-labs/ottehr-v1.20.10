import { Observation } from 'fhir/r4b';

export const getHeightObservationData = (
  encounterId: string,
  patientId: string,
  effectiveDate: string,
  value: number
): Observation => ({
  resourceType: 'Observation',
  status: 'final',
  encounter: { reference: `Encounter/${encounterId}` },
  category: [
    { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] },
  ],
  code: { coding: [{ system: 'http://loinc.org', code: '8302-2', display: 'Body height' }] },
  subject: { reference: `Patient/${patientId}` },
  effectiveDateTime: effectiveDate,
  valueQuantity: { value, unit: 'cm', system: 'http://unitsofmeasure.org', code: 'cm' },
});

export const getWeightObservationData = (
  encounterId: string,
  patientId: string,
  effectiveDate: string,
  value: number
): Observation => ({
  resourceType: 'Observation',
  status: 'final',
  encounter: { reference: `Encounter/${encounterId}` },
  category: [
    { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] },
  ],
  code: { coding: [{ system: 'http://loinc.org', code: '29463-7', display: 'Body weight' }] },
  subject: { reference: `Patient/${patientId}` },
  effectiveDateTime: effectiveDate,
  valueQuantity: { value, unit: 'kg', system: 'http://unitsofmeasure.org', code: 'kg' },
});

export const getBloodPressureObservationData = (
  encounterId: string,
  patientId: string,
  effectiveDate: string,
  systolicValue: number,
  diastolicValue: number
): Observation => ({
  resourceType: 'Observation',
  status: 'final',
  encounter: { reference: `Encounter/${encounterId}` },
  category: [
    { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] },
  ],
  code: { coding: [{ system: 'http://loinc.org', code: '85354-9', display: 'Blood pressure panel' }] },
  subject: { reference: `Patient/${patientId}` },
  effectiveDateTime: effectiveDate,
  component: [
    {
      code: { coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }] },
      valueQuantity: { value: systolicValue, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
    },
    {
      code: { coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' }] },
      valueQuantity: { value: diastolicValue, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
    },
  ],
});

export const getHeartRateObservationData = (
  encounterId: string,
  patientId: string,
  effectiveDate: string,
  value: number
): Observation => ({
  resourceType: 'Observation',
  status: 'final',
  encounter: { reference: `Encounter/${encounterId}` },
  category: [
    { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] },
  ],
  code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] },
  subject: { reference: `Patient/${patientId}` },
  effectiveDateTime: effectiveDate,
  valueQuantity: { value, unit: 'beats/minute', system: 'http://unitsofmeasure.org', code: 'beats/min' },
});

export const getTotalCholesterolObservationData = (
  encounterId: string,
  patientId: string,
  effectiveDate: string,
  value: number
): Observation => ({
  resourceType: 'Observation',
  status: 'final',
  encounter: { reference: `Encounter/${encounterId}` },
  category: [
    { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory' }] },
  ],
  code: { coding: [{ system: 'http://loinc.org', code: '2093-3', display: 'Cholesterol, Total' }] },
  subject: { reference: `Patient/${patientId}` },
  effectiveDateTime: effectiveDate,
  valueQuantity: { value, unit: 'mg/dL', system: 'http://unitsofmeasure.org', code: 'mg/dL' },
});

export const getHDLCholesterolObservationData = (
  encounterId: string,
  patientId: string,
  effectiveDate: string,
  value: number
): Observation => ({
  resourceType: 'Observation',
  status: 'final',
  encounter: { reference: `Encounter/${encounterId}` },
  category: [
    { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory' }] },
  ],
  code: { coding: [{ system: 'http://loinc.org', code: '2085-9', display: 'Cholesterol in HDL' }] },
  subject: { reference: `Patient/${patientId}` },
  effectiveDateTime: effectiveDate,
  valueQuantity: { value, unit: 'mg/dL', system: 'http://unitsofmeasure.org', code: 'mg/dL' },
});

export const getLDLCholesterolObservationData = (
  encounterId: string,
  patientId: string,
  effectiveDate: string,
  value: number
): Observation => ({
  resourceType: 'Observation',
  status: 'final',
  encounter: { reference: `Encounter/${encounterId}` },
  category: [
    { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory' }] },
  ],
  code: { coding: [{ system: 'http://loinc.org', code: '13457-7', display: 'Cholesterol in LDL' }] },
  subject: { reference: `Patient/${patientId}` },
  effectiveDateTime: effectiveDate,
  valueQuantity: { value, unit: 'mg/dL', system: 'http://unitsofmeasure.org', code: 'mg/dL' },
});

export const getTriglyceridesObservationData = (
  encounterId: string,
  patientId: string,
  effectiveDate: string,
  value: number
): Observation => ({
  resourceType: 'Observation',
  status: 'final',
  encounter: { reference: `Encounter/${encounterId}` },
  category: [
    { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory' }] },
  ],
  code: { coding: [{ system: 'http://loinc.org', code: '2571-8', display: 'Triglyceride' }] },
  subject: { reference: `Patient/${patientId}` },
  effectiveDateTime: effectiveDate,
  valueQuantity: { value, unit: 'mg/dL', system: 'http://unitsofmeasure.org', code: 'mg/dL' },
});

export const getBloodGlucoseObservationData = (
  encounterId: string,
  patientId: string,
  effectiveDate: string,
  value: number
): Observation => ({
  resourceType: 'Observation',
  status: 'final',
  encounter: { reference: `Encounter/${encounterId}` },
  category: [
    { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory' }] },
  ],
  code: { coding: [{ system: 'http://loinc.org', code: '2339-0', display: 'Glucose [Mass/volume] in Blood' }] },
  subject: { reference: `Patient/${patientId}` },
  effectiveDateTime: effectiveDate,
  valueQuantity: { value, unit: 'mg/dL', system: 'http://unitsofmeasure.org', code: 'mg/dL' },
});

export const getHbA1cObservationData = (
  encounterId: string,
  patientId: string,
  effectiveDate: string,
  value: number
): Observation => ({
  resourceType: 'Observation',
  status: 'final',
  encounter: { reference: `Encounter/${encounterId}` },
  category: [
    { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory' }] },
  ],
  code: {
    coding: [{ system: 'http://loinc.org', code: '4548-4', display: 'Hemoglobin A1c/Hemoglobin.total in Blood' }],
  },
  subject: { reference: `Patient/${patientId}` },
  effectiveDateTime: effectiveDate,
  valueQuantity: { value, unit: '%', system: 'http://unitsofmeasure.org', code: '%' },
});
