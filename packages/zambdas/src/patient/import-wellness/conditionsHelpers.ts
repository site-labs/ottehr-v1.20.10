import { Condition } from 'fhir/r4b';

export const getDiabetesConditionData = (
  patientId: string,
  encounterId: string,
  onsetDate: string,
  recordDate: string
): Condition => ({
  resourceType: 'Condition',
  clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] },
  verificationStatus: {
    coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }],
  },
  code: {
    coding: [
      {
        system: 'http://hl7.org/fhir/sid/icd-10',
        code: 'E11.9',
        display: 'Type 2 diabetes mellitus without complications',
      },
    ],
    text: 'Diabetes mellitus type 2',
  },
  subject: { reference: `Patient/${patientId}` },
  encounter: { reference: `Encounter/${encounterId}` },
  onsetDateTime: onsetDate,
  recordedDate: recordDate,
});

export const getHypertensionConditionData = (
  patientId: string,
  encounterId: string,
  onsetDate: string,
  recordDate: string
): Condition => ({
  resourceType: 'Condition',
  clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] },
  verificationStatus: {
    coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }],
  },
  code: {
    coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: 'I10', display: 'Essential (primary) hypertension' }],
    text: 'Hypertension',
  },
  subject: { reference: `Patient/${patientId}` },
  encounter: { reference: `Encounter/${encounterId}` },
  onsetDateTime: onsetDate,
  recordedDate: recordDate,
});

export const getHypercholesterolemiaConditionData = (
  patientId: string,
  encounterId: string,
  onsetDate: string,
  recordDate: string
): Condition => ({
  resourceType: 'Condition',
  clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] },
  verificationStatus: {
    coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }],
  },
  code: {
    coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: 'E78.0', display: 'Pure hypercholesterolemia' }],
    text: 'Hypercholesterolemia',
  },
  subject: { reference: `Patient/${patientId}` },
  encounter: { reference: `Encounter/${encounterId}` },
  onsetDateTime: onsetDate,
  recordedDate: recordDate,
});

export const getCOPDConditionData = (
  patientId: string,
  encounterId: string,
  onsetDate: string,
  recordDate: string
): Condition => ({
  resourceType: 'Condition',
  clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] },
  verificationStatus: {
    coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }],
  },
  code: {
    coding: [
      {
        system: 'http://hl7.org/fhir/sid/icd-10',
        code: 'J44.9',
        display: 'Chronic obstructive pulmonary disease, unspecified',
      },
    ],
    text: 'Chronic Obstructive Pulmonary Disease',
  },
  subject: { reference: `Patient/${patientId}` },
  encounter: { reference: `Encounter/${encounterId}` },
  onsetDateTime: onsetDate,
  recordedDate: recordDate,
});
