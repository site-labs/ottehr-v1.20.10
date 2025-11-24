import Oystehr from '@oystehr/sdk';
import { Appointment, DocumentReference, Encounter, Patient, Person, RelatedPerson } from 'fhir/r4b';
import { uploadPdfToZ3 } from './helpers';
import { Gender, WellnessRecord } from './types';

const WELLNESS_DEFAULTS = {
  loinc: '34133-9',
  displayTitle: 'Wellness Summary',
  categoryCode: 'survey' as const,
  categoryDisplay: 'Survey',
};

type DocMeta = {
  loinc?: string;
  displayTitle?: string;
  category?: string; // e.g., 'survey' | 'laboratory'
  date?: string; // ISO datetime
  title?: string; // attachment.title
};

export const getPatientData = (wellnessRecord: WellnessRecord, id?: string): Patient => {
  const emailTelecom = wellnessRecord.email
    ? {
        telecom: [
          {
            rank: 1,
            value: wellnessRecord.email,
            system: 'email' as const,
          },
        ],
      }
    : {};

  const phoneTelecom = wellnessRecord.phone
    ? {
        telecom: [
          {
            rank: 1,
            value: wellnessRecord.phone,
            system: 'phone' as const,
          },
        ],
      }
    : {};

  const patientId = id ? { id } : {};

  return {
    ...patientId,
    name: [
      {
        use: 'official',
        given: [wellnessRecord.first_name || ''],
        family: wellnessRecord.last_name,
      },
    ],
    active: true,
    gender: wellnessRecord.sex?.toLowerCase() as Gender | undefined,
    address: [
      {
        use: 'home',
        line: [wellnessRecord.address || '', wellnessRecord.address2 || ''].filter(Boolean),
        city: wellnessRecord.city,
        state: wellnessRecord.state,
        postalCode: wellnessRecord.zip?.toString(),
        country: 'USA',
      },
    ],
    contact: [
      {
        name: {
          use: 'usual',
          given: [wellnessRecord.first_name || ''],
          family: wellnessRecord.last_name,
        },
        ...emailTelecom,
        relationship: [
          {
            coding: [
              {
                code: 'BP',
                system: 'http://terminology.hl7.org/CodeSystem/v2-0131',
                display: 'Billing contact person',
              },
            ],
          },
        ],
      },
    ],
    ...phoneTelecom,
    birthDate: wellnessRecord.dob,
    extension: [
      {
        url: 'https://fhir.zapehr.com/r4/StructureDefinitions/form-user',
        valueString: 'Patient',
      },
      {
        url: 'https://fhir.zapehr.com/r4/StructureDefinitions/point-of-discovery',
        valueString: 'Friend/Family',
      },
    ],
    resourceType: 'Patient',
    maritalStatus: {
      coding: [
        {
          code: 'U',
          system: 'http://terminology.hl7.org/CodeSystem/v3-MaritalStatus',
          display: 'Unknown',
        },
      ],
    },
  };
};

export const getRelatedPersonData = (
  wellnessRecord: WellnessRecord,
  patientId: string,
  relatedPersonId?: string
): RelatedPerson => {
  const emailTelecom = wellnessRecord.email
    ? [
        {
          value: wellnessRecord.email,
          system: 'email' as const,
        },
      ]
    : [];

  const phoneTelecom = wellnessRecord.phone
    ? [
        {
          value: wellnessRecord.phone,
          system: 'phone' as const,
        },
        {
          value: wellnessRecord.phone,
          system: 'sms' as const,
        },
      ]
    : [];

  const id = relatedPersonId ? { id: relatedPersonId } : {};

  return {
    ...id,
    active: true,
    patient: {
      reference: `Patient/${patientId}`,
    },
    telecom: [...phoneTelecom, ...emailTelecom],
    relationship: [
      {
        coding: [
          {
            code: 'user-relatedperson',
            system: 'https://fhir.zapehr.com/r4/StructureDefinitions/relationship',
          },
        ],
      },
    ],
    resourceType: 'RelatedPerson',
  };
};

export const getPersonData = (wellnessRecord: WellnessRecord, relatedPersonId: string, personId?: string): Person => {
  const emailTelecom = wellnessRecord.email
    ? [
        {
          system: 'email' as const,
          value: wellnessRecord.email,
        },
      ]
    : [];

  const phoneTelecom = wellnessRecord.phone
    ? [
        {
          system: 'phone' as const,
          value: '+1' + wellnessRecord.phone.replace(/\D/g, ''),
        },
      ]
    : [];

  const id = personId ? { id: personId } : {};

  return {
    ...id,
    resourceType: 'Person',
    telecom: [...phoneTelecom, ...emailTelecom],
    link: [
      {
        target: {
          type: 'RelatedPerson',
          reference: `RelatedPerson/${relatedPersonId}`,
        },
      },
    ],
  };
};

export const mergePersons = (mainPerson: Person, additionalPerson: Person): Person => {
  const mergedTelecom = [...(mainPerson.telecom || []), ...(additionalPerson.telecom || [])];

  // Remove duplicates by value
  const uniqueTelecom = mergedTelecom.filter(
    (item, index, self) =>
      item.value && self.findIndex((t) => t.value === item.value && t.system === item.system) === index
  );

  return {
    ...mainPerson,
    telecom: uniqueTelecom,
  };
};

export const getAppointmentData = (
  wellnessRecord: WellnessRecord,
  patientId: string,
  locationId: string,
  appointmentId?: string
): Appointment => {
  const id = appointmentId ? { id: appointmentId } : {};

  return {
    ...id,
    resourceType: 'Appointment',
    meta: {
      tag: [
        {
          code: 'OTTEHR-TM',
        },
      ],
    },
    identifier: [
      {
        value: wellnessRecord.order_id,
      },
    ],
    participant: [
      {
        actor: {
          reference: `Patient/${patientId}`,
        },
        status: 'accepted',
      },
      {
        actor: {
          reference: `Location/${locationId}`,
        },
        status: 'accepted',
      },
    ],
    start: new Date(wellnessRecord.test_date || '').toISOString().replace('Z', '-05:00'),
    end: new Date(new Date(wellnessRecord.test_date || '').getTime() + 15 * 60 * 1000)
      .toISOString()
      .replace('Z', '-05:00'),
    serviceType: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/service-type',
            code: 'in-person',
            display: 'in-person',
          },
        ],
        text: 'in-person',
      },
    ],
    appointmentType: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v2-0276',
          code: 'now',
          display: 'now',
        },
      ],
      text: 'now',
    },
    status: 'fulfilled',
    created: wellnessRecord.created_at,
    extension: [
      {
        url: 'https://fhir.zapehr.com/r4/StructureDefinitions/visit-history',
        extension: [
          {
            url: 'status',
            extension: [
              {
                url: 'status',
                valueString: 'pending',
              },
              {
                url: 'period',
                valuePeriod: {
                  start: wellnessRecord.test_date,
                },
              },
            ],
          },
        ],
      },
    ],
  };
};

export const getEncounterData = (
  wellnessRecord: WellnessRecord,
  patientId: string,
  appointmentId: string,
  locationId: string,
  encounterId?: string
): Encounter => {
  const id = encounterId ? { id: encounterId } : {};

  return {
    ...id,
    resourceType: 'Encounter',
    status: 'finished',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'FLD',
      display: 'field',
    },
    subject: {
      type: 'Patient',
      reference: `Patient/${patientId}`,
    },
    appointment: [
      {
        reference: `Appointment/${appointmentId}`,
      },
    ],
    period: {
      start: new Date(wellnessRecord.test_date || '').toISOString().replace('Z', '-05:00'),
    },
    location: [
      {
        location: {
          reference: `Location/${locationId}`,
        },
        status: 'completed',
        period: {
          start: new Date(wellnessRecord.test_date || '').toISOString().replace('Z', '-05:00'),
          end: new Date(new Date(wellnessRecord.test_date || '').getTime() + 15 * 60 * 1000)
            .toISOString()
            .replace('Z', '-05:00'),
        },
      },
    ],
    extension: [
      {
        url: 'https://extensions.fhir.zapehr.com/encounter-virtual-service-pre-release',
        extension: [
          {
            url: 'channelType',
            valueCoding: {
              system: 'https://fhir.zapehr.com/virtual-service-type',
              code: 'chime-video-meetings',
              display: 'Video Call',
            },
          },
        ],
      },
    ],
  };
};

export const getDocumentReferenceData = async (
  pdfContent: string,
  patientId: string,
  practitionerId: string,
  encounterId: string,
  projectId: string,
  globalId: string,
  z3Client: Oystehr['z3'],
  documentReferenceId?: string,
  docMeta?: DocMeta // <--  optional param
): Promise<DocumentReference> => {
  let url: string;
  try {
    url = await uploadPdfToZ3(pdfContent, globalId, projectId, z3Client);
  } catch (error) {
    console.log('---uploadPdfToZ3 FAILED with error:', error);
    throw error;
  }

  const id = documentReferenceId ? { id: documentReferenceId } : {};

  // Robust defaults (fallback to Wellness)
  const defaultsApplied: string[] = [];

  let loinc = docMeta?.loinc;
  if (!loinc) {
    loinc = WELLNESS_DEFAULTS.loinc;
    defaultsApplied.push('loinc');
  }

  let display = docMeta?.displayTitle;
  if (!display) {
    display = WELLNESS_DEFAULTS.displayTitle;
    defaultsApplied.push('displayTitle');
  }

  let categoryCode = docMeta?.category?.toLowerCase();
  if (!categoryCode) {
    categoryCode = WELLNESS_DEFAULTS.categoryCode;
    defaultsApplied.push('category');
  }
  const categoryDisplay = categoryCode.charAt(0).toUpperCase() + categoryCode.slice(1);

  const dateISO = docMeta?.date;

  // Convert date to proper ISO 8601 instant format for FHIR DocumentReference
  let dateInstant: string | undefined;
  if (dateISO) {
    try {
      // If it's already a full datetime, use it; otherwise convert date to datetime
      const date = new Date(dateISO);
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date format: ${dateISO}, using current time`);
        dateInstant = new Date().toISOString();
      } else {
        // If it's just a date (no time), add a default time (midnight UTC)
        if (dateISO.length === 10) {
          // YYYY-MM-DD format
          dateInstant = date.toISOString();
        } else {
          dateInstant = date.toISOString();
        }
      }
    } catch (error) {
      console.warn(`Error parsing date ${dateISO}:`, error);
      dateInstant = new Date().toISOString();
    }
  }

  // DEBUG: Log title handling

  let title = docMeta?.title;

  if (!title) {
    title = dateISO
      ? `${display} — ${new Date(dateISO).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}`
      : display;
    defaultsApplied.push('title');
  }

  if (defaultsApplied.length) {
    console.warn(`DocumentReference meta missing (${defaultsApplied.join(', ')}); defaulted to Wellness.`);
  }

  return {
    resourceType: 'DocumentReference',
    ...id,
    status: 'current',
    type: {
      coding: [{ system: 'http://loinc.org', code: loinc, display }],
      text: display,
    },
    category: [
      {
        coding: [
          {
            system: 'https://fhir.zapehr.com/r4/StructureDefinitions/document-category',
            code: categoryCode,
            display: categoryDisplay,
          },
        ],
        text: categoryDisplay,
      },
    ],
    ...(dateInstant ? { date: dateInstant } : {}),
    subject: { reference: `Patient/${patientId}` },
    author: [{ reference: `Practitioner/${practitionerId}` }],
    context: {
      encounter: [{ reference: `Encounter/${encounterId}` }],
    },
    content: [
      {
        attachment: {
          contentType: 'application/pdf',
          url,
          title,
        },
      },
    ],
    // Optional: record defaults usage for QA
    ...(defaultsApplied.length
      ? {
          extension: [
            {
              url: 'https://fhir.zapehr.com/r4/StructureDefinitions/defaulted-docmeta',
              valueString: defaultsApplied.join(','),
            },
          ],
        }
      : {}),
  };
};
