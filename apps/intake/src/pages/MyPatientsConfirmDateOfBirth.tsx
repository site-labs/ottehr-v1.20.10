import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { generatePath, useNavigate } from 'react-router-dom';
import { intakeFlowPageRoute } from 'src/App';
import { PageContainer } from 'src/components';
import { usePatientInfoStore } from 'src/telemed/features/patient-info';
import ConfirmDateOfBirthForm from '../components/ConfirmDateOfBirthForm';

const MyPatientsConfirmDateOfBirth = (): JSX.Element => {
  const { patientInfo: currentPatientInfo } = usePatientInfoStore.getState();
  const unconfirmedDateOfBirth = '';
  const { t } = useTranslation();
  const patientInfo = {
    dobYear: currentPatientInfo?.dateOfBirth?.split('-')[0],
    dobMonth: currentPatientInfo?.dateOfBirth?.split('-')[1],
    dobDay: currentPatientInfo?.dateOfBirth?.split('-')[2],
    ...currentPatientInfo,
  };
  const navigate = useNavigate();
  const patientID = currentPatientInfo?.id || '';

  const handleContinueAnywaySubmit = (): void => {
    console.log('Continuing anyway despite unconfirmed DOB');
  };

  return (
    <PageContainer
      title={`${t('paperwork.confirmPatient.confirm')} ${
        patientInfo?.firstName ? `${patientInfo?.firstName}'s` : t('paperwork.confirmPatient.unknownPatient')
      } ${t('paperwork.confirmPatient.dob')}`}
    >
      <ConfirmDateOfBirthForm
        patientInfo={patientInfo}
        defaultValue={unconfirmedDateOfBirth}
        required={true}
        onConfirmedSubmit={async () => {
          // in case the user initially set the wrong birthday, but then clicked 'back' and fixed it
          const destination = generatePath(intakeFlowPageRoute.WellnessScreenings.path, {
            patientId: patientID,
          });
          navigate(destination);
        }}
        onUnconfirmedSubmit={(unconfirmedDateOfBirth: string) => {
          // setUnconfirmedDateOfBirth(unconfirmedDateOfBirth);
          console.log('DOB not confirmed ', unconfirmedDateOfBirth);
        }}
        wrongDateOfBirthModal={{
          buttonText: t('confirmDob.notConfirmed.continue'),
          message: <Typography marginTop={2}>{t('confirmDob.notConfirmed.body3')}</Typography>,
          onSubmit: handleContinueAnywaySubmit,
        }}
      />
    </PageContainer>
  );
};

export default MyPatientsConfirmDateOfBirth;
