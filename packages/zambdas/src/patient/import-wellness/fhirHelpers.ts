import Oystehr, { Bundle } from '@oystehr/sdk';
import {
  Appointment,
  DocumentReference,
  Encounter,
  FhirResource,
  Patient,
  Person,
  Practitioner,
  RelatedPerson,
  Resource,
} from 'fhir/r4b';

export const getPractitionerByName = async (
  firstName: string,
  lastName: string,
  fhirClient: Oystehr['fhir']
): Promise<Practitioner> => {
  const resources: Bundle<FhirResource> = await fhirClient.search({
    resourceType: 'Practitioner',
    params: [
      {
        name: 'family',
        value: lastName,
      },
      {
        name: 'given',
        value: firstName,
      },
    ],
  });

  return resources?.unbundle()?.[0] as Practitioner;
};

export const getPatientByParams = async (
  dob: string,
  zip: string,
  firstName: string,
  lastName: string,
  fhirClient: Oystehr['fhir']
): Promise<Patient | null> => {
  const resources: Bundle<FhirResource> = await fhirClient.search({
    resourceType: 'Patient',
    params: [
      {
        name: 'birthdate',
        value: dob,
      },
      {
        name: 'address-postalcode',
        value: zip,
      },
      {
        name: 'family',
        value: lastName,
      },
      {
        name: 'given',
        value: firstName,
      },
    ],
  });

  return (resources?.unbundle()?.[0] as Patient) || null;
};

export const getRelatedPersonByPatientId = async (
  patientId: string,
  fhirClient: Oystehr['fhir']
): Promise<RelatedPerson | null> => {
  const resources: Bundle<FhirResource> = await fhirClient.search({
    resourceType: 'RelatedPerson',
    params: [
      {
        name: 'patient',
        value: `Patient/${patientId}`,
      },
    ],
  });

  return (resources?.unbundle()?.[0] as RelatedPerson) || null;
};

export const getPersonByRelatedPersonId = async (
  relatedPersonId: string,
  fhirClient: Oystehr['fhir']
): Promise<Person | null> => {
  const resources: Bundle<FhirResource> = await fhirClient.search({
    resourceType: 'Person',
    params: [
      {
        name: 'link',
        value: `RelatedPerson/${relatedPersonId}`,
      },
    ],
  });

  return (resources?.unbundle()?.[0] as Person) || null;
};

export const getAppointmentByParams = async (identifier: string, fhirClient: Oystehr['fhir']): Promise<Appointment> => {
  const resources: Bundle<FhirResource> = await fhirClient.search({
    resourceType: 'Appointment',
    params: [
      {
        name: 'identifier',
        value: identifier,
      },
    ],
  });

  return resources?.unbundle()?.[0] as Appointment;
};

export const getEncounterAndPatientByAppointmentId = async (
  appointmentId: string,
  fhirClient: Oystehr['fhir']
): Promise<{ encounter: Encounter; patient: Patient }> => {
  const resources: Bundle<FhirResource> = await fhirClient.search({
    resourceType: 'Encounter',
    params: [
      {
        name: 'appointment',
        value: `Appointment/${appointmentId}`,
      },
      {
        name: '_include',
        value: 'Encounter:subject',
      },
    ],
  });
  console.log('---getEncounterAndPatientByAppointmentId resources', resources);

  const patient: Patient | undefined = resources.unbundle().find((item: Resource) => {
    return item.resourceType === 'Patient';
  }) as Patient;

  const encounter: Encounter | undefined = resources.unbundle().find((item: Resource) => {
    return item.resourceType === 'Encounter';
  }) as Encounter;

  return { encounter, patient };
};

export const getPersonAndRelatedPersonByPatientId = async (
  patientId: string,
  fhirClient: Oystehr['fhir']
): Promise<{ person: Person; relatedPerson: RelatedPerson }> => {
  const resources: Bundle<FhirResource> = await fhirClient.search({
    resourceType: 'RelatedPerson',
    params: [
      {
        name: 'patient',
        value: `Patient/${patientId}`,
      },
      {
        name: '_revinclude:iterate',
        value: 'Person:link',
      },
    ],
  });
  console.log('---getPersonAndRelatedPersonByPatientId resources', resources);

  const relatedPerson: RelatedPerson | undefined = resources.unbundle().find((item: Resource) => {
    return item.resourceType === 'RelatedPerson';
  }) as RelatedPerson;

  const person: Person | undefined = resources.unbundle().find((item: Resource) => {
    return item.resourceType === 'Person';
  }) as Person;

  return { person, relatedPerson };
};

export const getDocumentReferenceByEncounterId = async (
  encounterId: string,
  fhirClient: Oystehr['fhir']
): Promise<DocumentReference[]> => {
  const resources: Bundle<FhirResource> = await fhirClient.search({
    resourceType: 'DocumentReference',
    params: [
      {
        name: 'encounter',
        value: `Encounter/${encounterId}`,
      },
    ],
  });
  return resources.unbundle() as DocumentReference[];
};
