import Oystehr, { User, UserInviteParams, UserInviteResponse } from '@oystehr/sdk';
import { APIGatewayProxyResult } from 'aws-lambda';
import { Appointment, DocumentReference, Encounter, FhirResource, Patient, Person, RelatedPerson } from 'fhir/r4b';
import {
  getAppointmentByParams,
  getDocumentReferenceByEncounterId,
  getEncounterAndPatientByAppointmentId,
  getPatientByParams,
  getPersonAndRelatedPersonByPatientId,
  getPersonByRelatedPersonId,
  getPractitionerByName,
  getRelatedPersonByPatientId,
} from './fhirHelpers';
import {
  appendToCSV,
  isEmailValid,
  isLocationValid,
  isPhoneValid,
  isPractitionerValid,
  updateLastLineInCSV,
} from './helpers';
import { LogRecord, ResultData, ValidateWellnessResult, WellnessRecord } from './types';

type AppointmentRelatedEntities = {
  patient?: Patient;
  person?: Person;
  relatedPerson?: RelatedPerson;
  encounter?: Encounter;
  documentReference?: DocumentReference;
};

export const getBedRequestErrorResponse = (errorMessage: string): APIGatewayProxyResult => ({
  statusCode: 400,
  body: `Bad Request: ${errorMessage}`,
});

export const validateWellness = async (
  data: WellnessRecord,
  fhirClient: Oystehr['fhir']
): Promise<ValidateWellnessResult> => {
  const validationResult: ValidateWellnessResult = {
    isValid: true,
    isEmailValid: isEmailValid(data.email),
    isPhoneValid: isPhoneValid(data.phone),
    isLocationValid: isLocationValid(data.location_id),
    data: {
      location: data?.location_id || null,
      practitioner: null,
      errorMessage: '',
    },
  };

  if (!data) {
    validationResult.isValid = false;
    validationResult.data.errorMessage = 'Wellness record is not defined.';
    return validationResult;
  }
  console.log('---isEmailValid(data.email)', isEmailValid(data.email));
  console.log('---isPhoneValid(data.phone)', isPhoneValid(data.phone));
  console.log('---isLocationValid(data.location_id)', isLocationValid(data.location_id));
  if (!isEmailValid(data.email) && !isPhoneValid(data.phone)) {
    validationResult.isValid = false;
    validationResult.data.errorMessage += 'Neither phone nor email is valid.';
  }

  if (!isLocationValid(data.location_id)) {
    validationResult.isValid = false;
    validationResult.data.errorMessage += 'No location_id in wellness record.';
  }

  const [firstName, lastName] = data?.approved_by?.split(' ') || []; //TODO: not stable solution
  const practitioner = data.approved_by ? await getPractitionerByName(firstName, lastName, fhirClient) : null;

  if (!isPractitionerValid(practitioner?.id)) {
    validationResult.isValid = false;
    validationResult.data.errorMessage += 'No practitioner in system.';
  } else {
    validationResult.data.practitioner = practitioner?.id || null;
  }

  return validationResult;
};

export const findPatientBySearchParams = async (
  dob: string,
  zip: string,
  firstName: string,
  lastName: string,
  fhirClient: Oystehr['fhir']
): Promise<Patient | null> => {
  return await getPatientByParams(dob, zip, firstName, lastName, fhirClient);
};

export const findRelatedPersonByPatientId = async (
  patientId: string,
  fhirClient: Oystehr['fhir']
): Promise<RelatedPerson | null> => {
  return await getRelatedPersonByPatientId(patientId, fhirClient);
};

export const findPersonByRelatedPersonId = async (
  relatedPersonId: string,
  fhirClient: Oystehr['fhir']
): Promise<Person | null> => {
  return await getPersonByRelatedPersonId(relatedPersonId, fhirClient);
};

export const findUserBySearchParams = async (
  email: string,
  phone: string,
  userClient: Oystehr['user']
): Promise<User | null> => {
  const allUsers = await userClient.list();
  console.log('---allUsers', allUsers);
  console.log('---email for search', email);
  console.log('---phone for search', phone);
  const { id: userId } =
    allUsers.find((user) => email === user.name) || allUsers.find((user) => phone === user.name) || {};

  return userId ? await userClient.get({ id: userId }) : null;
};

export const inviteUser = async (
  userData: UserInviteParams,
  userClient: Oystehr['user']
): Promise<UserInviteResponse> => {
  const user = await userClient.invite(userData);

  return user;
};

export const findUserByPatientId = async (patientId: string, userClient: Oystehr['user']): Promise<User | null> => {
  const allUsers = await userClient.list();
  console.log('---allUsers', allUsers);
  console.log('---patientId for search', patientId);

  const { id: userId } = allUsers.find((user) => user.profile === `Patient/${patientId}`) || {};

  return userId ? await userClient.get({ id: userId }) : null;
};

export const getUserData = async (
  wellnessRecord: WellnessRecord,
  roleId: string,
  appClientId: string
): Promise<UserInviteParams> => {
  // Create user data with the role ID
  const userAddData: UserInviteParams = {
    resource: { resourceType: 'Patient' },
    username: wellnessRecord.email || wellnessRecord.phone || '',
    email: wellnessRecord.email || null,
    phoneNumber: wellnessRecord.phone || '',
    roles: [roleId],
    accessPolicy: undefined,
    applicationId: appClientId,
  };

  return userAddData;
};

export const getIdFromProfile = (profile: string): string => {
  return profile?.split('/')?.[1] || '';
};

export const getPatientIdFromAppointment = (appointment: Appointment): string | null =>
  appointment?.participant?.length > 0
    ? appointment.participant
        .find((p) => p?.actor?.reference?.startsWith('Patient/'))
        ?.actor?.reference?.split('/')?.[1] || ''
    : null;

export const findAppointmentByGlobalId = async (
  globalId: string,
  fhirClient: Oystehr['fhir']
): Promise<Appointment | null> => {
  return (await getAppointmentByParams(globalId, fhirClient)) || null;
};

export const getAppointmentRelatedFhirEntities = async (
  appointmentId: string,
  fhirClient: Oystehr['fhir']
): Promise<AppointmentRelatedEntities> => {
  const { encounter, patient } = await getEncounterAndPatientByAppointmentId(appointmentId, fhirClient);

  const { person = undefined, relatedPerson = undefined } = patient?.id
    ? await getPersonAndRelatedPersonByPatientId(patient.id, fhirClient)
    : {};

  const documentReferences = encounter?.id ? await getDocumentReferenceByEncounterId(encounter.id, fhirClient) : [];
  const sortedDocumentReferences = documentReferences.sort((a, b) => {
    return new Date(b?.meta?.lastUpdated || 0).getTime() - new Date(a?.meta?.lastUpdated || 0).getTime();
  });

  return {
    patient,
    person,
    relatedPerson,
    encounter,
    documentReference: sortedDocumentReferences?.[0] || null,
  };
};

export const updateFhirResource = async <T extends FhirResource>(
  resource: T,
  fhirClient: Oystehr['fhir']
): Promise<T | null> => {
  console.log('--- DEBUG: updateFhirResource called with resource.id:', resource.id);
  console.log('--- DEBUG: updateFhirResource resource.id type:', typeof resource.id);
  console.log('--- DEBUG: updateFhirResource resource.id truthiness:', !!resource.id);
  console.log('--- DEBUG: updateFhirResource resource.resourceType:', resource.resourceType);

  if (resource.id) {
    console.log('--- DEBUG: updateFhirResource calling fhirClient.updateResource with id:', resource.id);
    const result = await fhirClient.update(resource);
    console.log('--- DEBUG: updateFhirResource fhirClient.updateResource result:', result?.id);
    return result as T;
  } else {
    console.log('--- DEBUG: updateFhirResource returning null because no resource.id');
    return null;
  }
};

export const createFhirResource = async <T extends FhirResource>(
  resource: T,
  fhirClient: Oystehr['fhir']
): Promise<T | null> => {
  return (await fhirClient.create(resource)) as T;
};

export const createLogRecord = async (
  wellnessRecord: WellnessRecord & ResultData,
  token: string,
  projectId: string,
  projectApi: string
): Promise<void> => {
  await appendToCSV(wellnessRecord, token, projectId, projectApi);
};

export const updateLastLogRecord = async (
  data: Partial<LogRecord>,
  token: string,
  projectId: string,
  projectApi: string
): Promise<void> => {
  await updateLastLineInCSV(data, token, projectId, projectApi);
};

export const getSuccessResponse = (data: any): APIGatewayProxyResult => {
  // Check if we're running locally by looking for the ENVIRONMENT variable
  const isLocal = process.env.ENVIRONMENT === 'local';

  if (isLocal) {
    // Wrap response in output object to match production format
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 200,
        output: data,
      }),
    };
  }

  // Production format (direct data)
  return {
    statusCode: 200,
    body: JSON.stringify(data),
  };
};
