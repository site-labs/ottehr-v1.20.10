import Oystehr, { OystehrConfig } from '@oystehr/sdk';
import { APIGatewayProxyResult } from 'aws-lambda';
import { Appointment, DocumentReference, Encounter, Patient, Person, RelatedPerson } from 'fhir/r4b';
import { getSecret, SecretsKeys } from 'utils';
import { getAuth0Token, topLevelCatch, ZambdaInput } from '../../shared';
import {
  getAppointmentData,
  getDocumentReferenceData,
  getEncounterData,
  getPatientData,
  getPersonData,
  getRelatedPersonData,
  mergePersons,
} from './fhirDataHelpers';
import { isPdfFilesMatch, lookupRole } from './helpers';
import { ResultData, WellnessRecord } from './types';
import {
  createFhirResource,
  createLogRecord,
  findAppointmentByGlobalId,
  findPatientBySearchParams,
  findPersonByRelatedPersonId,
  findRelatedPersonByPatientId,
  findUserByPatientId,
  findUserBySearchParams,
  getAppointmentRelatedFhirEntities,
  getBedRequestErrorResponse,
  getIdFromProfile,
  getPatientIdFromAppointment,
  getSuccessResponse,
  getUserData,
  inviteUser,
  updateFhirResource,
  updateLastLogRecord,
  validateWellness,
} from './utils';

let m2mToken: string;

export const index = async ({ body, secrets }: ZambdaInput): Promise<APIGatewayProxyResult> => {
  console.log('import-wellness');

  try {
    if (!m2mToken) {
      console.log('getting token', secrets);
      m2mToken = await getAuth0Token(secrets);
    } else {
      console.log('already have token');
    }

    const PROJECT_API = getSecret(SecretsKeys.PROJECT_API, secrets);
    const FHIR_API = getSecret(SecretsKeys.FHIR_API, secrets);
    const PROJECT_ID = getSecret(SecretsKeys.PROJECT_ID, secrets);
    const APP_CLIENT_UUID = getSecret(SecretsKeys.AUTH0_CLIENT_UUID, secrets);

    const CLIENT_CONFIG: OystehrConfig = {
      accessToken: m2mToken,
      projectId: PROJECT_ID,
      projectApiUrl: PROJECT_API,
      fhirApiUrl: FHIR_API,
    };
    const oystehr = new Oystehr(CLIENT_CONFIG);

    const fhirClient = oystehr.fhir;
    const userClient = oystehr.user;
    const z3Client = oystehr.z3;

    //R1: Receive wellness data
    const wellnessRecord: WellnessRecord = JSON.parse(body || '');

    // Build docMeta from wellnessRecord
    const docMeta = {
      loinc: wellnessRecord.loinc ?? wellnessRecord.ioinc ?? undefined,
      displayTitle: wellnessRecord.displayTitle ?? undefined,
      category: wellnessRecord.category ?? undefined,
      date:
        wellnessRecord.finalized_at ??
        wellnessRecord.test_date ??
        wellnessRecord.collection_date ??
        wellnessRecord.submitted_at ??
        wellnessRecord.created_at,
      title: wellnessRecord.doc_title ?? undefined,
    };

    const resultData: ResultData = {
      wellnessRecord: wellnessRecord,
      practitioner: null,
      location: null,
      existingUser: null,
      user: null,
      patient: null,
      relatedPerson: null,
      person: null,
      appointment: null,
      encounter: null,
      documentReference: null,
      inviteURL: null,
      patientRole: null,
      updatedResource: null,
      errorMessage: null,
    };

    const updateResultData = (data: Record<string, any>): void => {
      Object.keys(data).forEach((key) => (resultData[key] = data[key] !== undefined ? data[key] : null));
    };

    //R2: Log input data
    await createLogRecord(wellnessRecord, m2mToken, PROJECT_ID, PROJECT_API);

    // validate: email and phone, practitioner, location
    const {
      isValid,
      isEmailValid,
      isPhoneValid,
      data: validationData,
    } = await validateWellness(wellnessRecord, fhirClient);
    updateResultData(validationData);

    if (!isValid) {
      //D1: is valid phone or email, is valid location, is valid practitioner
      await updateLastLogRecord({ action: validationData.errorMessage || '' }, m2mToken, PROJECT_ID, PROJECT_API);
      //R3: return error 400
      return getBedRequestErrorResponse(resultData.errorMessage);
    }

    const patientRole = await lookupRole('Patient', m2mToken, PROJECT_ID, PROJECT_API);
    updateResultData({ patientRole: patientRole.id });

    const existingUser = await findUserBySearchParams(
      wellnessRecord.email || '',
      wellnessRecord.phone || '',
      userClient
    );
    updateResultData({ existingUser: existingUser?.id });
    const existingPatient = await findPatientBySearchParams(
      wellnessRecord.dob || '',
      wellnessRecord.zip?.toString() || '',
      wellnessRecord.first_name || '',
      wellnessRecord.last_name || '',
      fhirClient
    );
    const existingRelatedPerson = await findRelatedPersonByPatientId(existingPatient?.id || '', fhirClient);
    const existingPerson = await findPersonByRelatedPersonId(existingRelatedPerson?.id || '', fhirClient);
    //R5: search for duplicated appointment
    const existingAppointment = await findAppointmentByGlobalId(wellnessRecord.order_id || '', fhirClient);

    updateResultData({
      existingUser: existingUser?.id,
      patient: existingPatient?.id,
      relatedPerson: existingRelatedPerson?.id,
      person: existingPerson?.id,
      appointment: existingAppointment?.id,
    });

    if (existingPerson && (isEmailValid || isPhoneValid)) {
      // Add to existing person new email or phone
      const secondaryPerson = getPersonData(wellnessRecord, resultData.relatedPerson);
      const mergedPerson = mergePersons(existingPerson, secondaryPerson);

      const updatedPerson = await updateFhirResource<Person>(mergedPerson, fhirClient);
      updateResultData({ person: updatedPerson?.id });
    }

    if (existingAppointment) {
      //D2: (yes) appointment already exists

      if (existingUser) {
        //D3: (no) user with email from input data exists
        const patientIdFromAppointment = getPatientIdFromAppointment(existingAppointment);
        if (patientIdFromAppointment) {
          const updatedPatient = await updateFhirResource<Patient>(
            getPatientData(wellnessRecord, patientIdFromAppointment),
            fhirClient
          ); //R7: update patient
          console.log('---updatedPatient', updatedPatient);
        }
      } else if (!existingUser && isEmailValid) {
        //D3: (yes) user with email from input data does not exist
        const userData = await getUserData(wellnessRecord, patientRole.id, APP_CLIENT_UUID);
        const invitedUser = await inviteUser(userData, userClient); //R6: invite user
        const patientId = getIdFromProfile(invitedUser.profile);
        await updateFhirResource<Patient>(getPatientData(wellnessRecord, patientId), fhirClient); //R7: update patient
        updateResultData({
          user: invitedUser.id,
          inviteURL: invitedUser.invitationUrl,
          patient: patientId,
        });
        // console.log('---resultData', resultData);
      }

      const relatedFhirEntities = await getAppointmentRelatedFhirEntities(existingAppointment.id || '', fhirClient);
      const { patient, person, relatedPerson, encounter, documentReference } = relatedFhirEntities;

      const user = await findUserByPatientId(patient?.id || '', userClient);

      if (!existingUser && (existingPatient || patient)) {
        const updatedPatient = await updateFhirResource<Patient>(
          getPatientData(wellnessRecord, existingPatient?.id || patient?.id),
          fhirClient
        );
        console.log('---updatedPatient', updatedPatient);
      }

      updateResultData({
        existingUser: existingUser?.id || user?.id,
        patient: patient?.id,
        relatedPerson: relatedPerson?.id,
        person: person?.id,
        appointment: existingAppointment?.id,
        encounter: encounter?.id,
        documentReference: documentReference?.id,
      });
      // console.log('---resultData', resultData);

      if (relatedPerson?.id && patient?.id) {
        const updatedRelatedPerson = await updateFhirResource<RelatedPerson>(
          getRelatedPersonData(wellnessRecord, patient?.id, relatedPerson?.id),
          fhirClient
        ); //R8
        // console.log('---R8');
        console.log('---updatedRelatedPerson', updatedRelatedPerson);
      }
      if (relatedPerson?.id && person?.id) {
        const updatedPerson = await updateFhirResource<Person>(
          getPersonData(wellnessRecord, relatedPerson.id, person.id),
          fhirClient
        ); //R9
        console.log('---updatedPerson', updatedPerson);
      }
      if (existingAppointment.id && patient?.id && resultData.location) {
        await updateFhirResource<Appointment>(
          getAppointmentData(wellnessRecord, patient.id, resultData.location, existingAppointment.id),
          fhirClient
        ); //R10
        // console.log('---R10');
      }
      if (encounter?.id && patient?.id && existingAppointment?.id && resultData.location) {
        console.log('=== About to call getEncounterData ===');
        try {
          const encounterData = getEncounterData(
            wellnessRecord,
            patient?.id,
            existingAppointment?.id,
            resultData.location,
            encounter?.id
          );
          console.log('---getEncounterData completed successfully');
          await updateFhirResource<Encounter>(encounterData, fhirClient);
          console.log('---updateFhirResource completed successfully');
        } catch (error) {
          console.log('---getEncounterData or updateFhirResource FAILED with error:', error);
          throw error;
        }
        //R11
      }
      // console.log('---R11');
      console.log('=== About to call isPdfFilesMatch ===');
      const isFilesMatch = await isPdfFilesMatch(wellnessRecord, documentReference, z3Client);
      console.log('=== isPdfFilesMatch completed, result:', isFilesMatch);

      if (wellnessRecord.pdfContent) {
        // Always update DocumentReference metadata, regardless of PDF match

        const documentReferenceData = await getDocumentReferenceData(
          wellnessRecord.pdfContent,
          patient?.id || '',
          resultData.practitioner || '',
          encounter?.id || '',
          PROJECT_ID,
          wellnessRecord.order_id || '',
          z3Client,
          documentReference?.id || '',
          docMeta
        );

        if (!isFilesMatch) {
          const updateResult = await updateFhirResource<DocumentReference>(documentReferenceData, fhirClient); //R12
          console.log('---updateResult', updateResult);
        } else {
          // PDFs match - only update metadata, keep existing PDF content
          const metadataOnlyUpdate = {
            ...documentReferenceData,
            content: documentReference?.content
              ? documentReference.content.map((contentItem, index) => {
                  if (index === 0 && contentItem.attachment) {
                    // Update the title in the first content item's attachment
                    return {
                      ...contentItem,
                      attachment: {
                        ...contentItem.attachment,
                        title: documentReferenceData.content[0]?.attachment?.title || contentItem.attachment.title,
                      },
                    };
                  }
                  return contentItem;
                })
              : documentReferenceData.content, // Fallback to new content if no existing content
          };
          const updateResult = await updateFhirResource<DocumentReference>(metadataOnlyUpdate, fhirClient);
          console.log('---updateResult', updateResult);
        }
        // console.log('---R12');
        // console.log('---resultData', resultData);
      }
    } else {
      //D2: (no) appointment does not exist

      if (!existingUser && isEmailValid) {
        //D5: (no) user with email from input data exists
        const userData = await getUserData(wellnessRecord, patientRole.id, APP_CLIENT_UUID);
        const invitedUser = await inviteUser(userData, userClient); //R13: invite user

        const updatedPatient = await updateFhirResource<Patient>(
          getPatientData(wellnessRecord, getIdFromProfile(invitedUser.profile)),
          fhirClient
        ); //R14: update patient
        updateResultData({
          user: invitedUser.id,
          patient: existingPatient ? existingPatient.id : updatedPatient?.id,
          inviteURL: invitedUser.invitationUrl,
        });
      } else if (existingUser) {
        // D5: (yes) user with email from input data does not exist
        if (!existingPatient) {
          //D6: (no) patient does not exist
          const patient = await createFhirResource(getPatientData(wellnessRecord), fhirClient); //R15: create patient
          updateResultData({ user: existingUser.id, patient: patient?.id });
        } else {
          updateResultData({ user: existingUser.id, patient: existingPatient.id });
        }
      } else if (!existingUser && !isEmailValid && !existingPatient && isPhoneValid) {
        const patient = await createFhirResource(getPatientData(wellnessRecord), fhirClient);
        updateResultData({ patient: patient?.id });
      }

      if (!existingRelatedPerson) {
        let relatedPerson: RelatedPerson | null = null;
        if (resultData.patient) {
          relatedPerson = await createFhirResource<RelatedPerson>(
            getRelatedPersonData(wellnessRecord, resultData.patient),
            fhirClient
          ); // R17
        }
        updateResultData({ relatedPerson: relatedPerson?.id });
      }

      if (!existingPerson && resultData.relatedPerson) {
        let person: Person | null = null;
        person = await createFhirResource<Person>(getPersonData(wellnessRecord, resultData.relatedPerson), fhirClient); // R16
        updateResultData({ person: person?.id });
      }

      let appointment: Appointment | null = null;
      if (resultData.patient && resultData.location) {
        appointment = await createFhirResource<Appointment>(
          getAppointmentData(wellnessRecord, resultData.patient, resultData.location),
          fhirClient
        ); // R18
      }

      let encounter: Encounter | null = null;
      if (appointment?.id && resultData.patient && resultData.location) {
        encounter = await createFhirResource<Encounter>(
          getEncounterData(wellnessRecord, resultData.patient, appointment.id, resultData.location),
          fhirClient
        ); // R19
      }

      let documentReference: DocumentReference | null = null;
      if (
        wellnessRecord?.pdfContent &&
        encounter?.id &&
        resultData.patient &&
        resultData.practitioner &&
        wellnessRecord.order_id
      ) {
        const documentReferenceData = await getDocumentReferenceData(
          wellnessRecord.pdfContent,
          resultData.patient,
          resultData.practitioner,
          encounter.id,
          PROJECT_ID,
          wellnessRecord.order_id,
          z3Client,
          undefined, // documentReferenceId
          docMeta
        );
        documentReference = await createFhirResource(documentReferenceData, fhirClient); // R20
      }

      updateResultData({
        appointment: appointment?.id,
        encounter: encounter?.id,
        documentReference: documentReference?.id,
      });
    }
    const logRecord = await createLogRecord({ ...wellnessRecord, ...resultData }, m2mToken, PROJECT_ID, PROJECT_API); //R21: set output log record
    updateResultData({ updatedResource: logRecord });

    return getSuccessResponse(resultData); //R22: return result data
  } catch (error: any) {
    console.log('Top level catch block in import-wellness:');
    console.log(' Error:', error);
    console.log(' Error stringified:', JSON.stringify(error));
    await topLevelCatch('import-wellness', error, getSecret(SecretsKeys.ENVIRONMENT, secrets));
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal error' }),
    };
  }
};
