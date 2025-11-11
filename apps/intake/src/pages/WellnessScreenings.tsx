import { Box, Button, Chip, Skeleton, Typography } from '@mui/material';
import { DocumentReference } from 'fhir/r4b';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useGetAppointments } from 'src/telemed/features/appointments';
import { CustomContainer } from 'src/telemed/features/common';
import { usePatientInfoStore } from 'src/telemed/features/patient-info';
import { useOystehrAPIClient } from 'src/telemed/utils';
import { formatVisitDate, TelemedAppointmentInformation } from 'utils';
import { intakeFlowPageRoute } from '../App';
import { otherColors } from '../IntakeThemeProvider';

interface ExtendedAppointmentInfo extends TelemedAppointmentInformation {
  documentReferences?: DocumentReference[];
}

// Helper functions for document metadata extraction
const getDocumentTitle = (doc: DocumentReference): string => {
  return (
    doc.content?.[0]?.attachment?.title || doc.type?.text || doc.type?.coding?.[0]?.display || 'Wellness Screening'
  );
};

const getDocumentCategory = (doc: DocumentReference): string | null => {
  return doc.category?.[0]?.text || null;
};

const getDocumentDate = (doc: DocumentReference): string => {
  return doc.date || doc.meta?.lastUpdated || '';
};

const getDocumentSortDate = (doc: DocumentReference): Date => {
  const dateStr = doc.date || doc.meta?.lastUpdated || '';
  return new Date(dateStr);
};

export const WellnessScreening = (): JSX.Element => {
  const apiClient = useOystehrAPIClient();
  const [isClientReady, setIsClientReady] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { patientInfo: currentPatientInfo } = usePatientInfoStore.getState();
  const patientFullName = currentPatientInfo ? `${currentPatientInfo.firstName} ${currentPatientInfo.lastName}` : '';
  const formattedPatientBirthDay = formatVisitDate(currentPatientInfo.dateOfBirth || '', 'birth');

  useEffect(() => {
    if (apiClient) {
      setIsClientReady(true);
    }
  }, [apiClient]);

  const { data: appointmentsData, isFetching } = useGetAppointments(
    apiClient,
    isClientReady && Boolean(currentPatientInfo?.id),
    currentPatientInfo?.id
  );

  const pastAppointments = appointmentsData?.appointments.filter(
    (appointment: ExtendedAppointmentInfo) =>
      appointment.telemedStatus === 'complete' ||
      appointment.telemedStatus === 'unsigned' ||
      appointment.telemedStatus === 'cancelled'
  );
  return (
    <CustomContainer
      title={patientFullName}
      subtext={t('general.dateOfBirth', { formattedPatientBirthDay })}
      description=""
      bgVariant={intakeFlowPageRoute.MyPatients.path}
      isFirstPage={true}
    >
      {isFetching && (
        <Skeleton
          sx={{
            borderRadius: 2,
            backgroundColor: otherColors.coachingVisit,
            p: 8,
          }}
        />
      )}
      {!isFetching && (
        <>
          <Typography variant="h2" color="primary.main">
            {t('pastVisits.documents')}
          </Typography>
          {(pastAppointments?.[0] as ExtendedAppointmentInfo)?.documentReferences?.length ? (
            (pastAppointments?.[0] as ExtendedAppointmentInfo).documentReferences
              ?.sort((a, b) => {
                // Sort by date (newest first)
                const dateA = getDocumentSortDate(a);
                const dateB = getDocumentSortDate(b);
                return dateB.getTime() - dateA.getTime();
              })
              ?.map((doc) => {
                const attachment = doc.content?.[0]?.attachment;
                let viewLink = '';

                if (attachment?.url) {
                  viewLink = attachment.url;
                } else if (attachment?.data) {
                  const blob = new Blob([Uint8Array.from(atob(attachment.data), (c) => c.charCodeAt(0))], {
                    type: attachment.contentType || 'application/pdf',
                  });
                  viewLink = URL.createObjectURL(blob);
                  // console.log('viewLink', viewLink);
                }

                const documentTitle = getDocumentTitle(doc);
                const documentCategory = getDocumentCategory(doc);
                const documentDate = getDocumentDate(doc);

                return (
                  <Box
                    key={doc.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRadius: 2,
                      px: 3,
                      py: 3,
                      my: 3,
                      backgroundColor: otherColors.lightPurple,
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" color={otherColors.purple}>
                          {documentTitle}
                        </Typography>
                        {documentCategory && (
                          <Chip
                            label={documentCategory}
                            size="small"
                            sx={{
                              backgroundColor: otherColors.white,
                              color: otherColors.purple,
                              fontSize: '0.75rem',
                              height: '20px',
                              '& .MuiChip-label': {
                                px: 1,
                              },
                            }}
                          />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {formatVisitDate(documentDate, 'visit') || t('general.na')}
                      </Typography>
                    </Box>
                    {viewLink && (
                      <Button
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          backgroundColor: viewLink ? otherColors.white : '#f5f5f5',
                          color: viewLink ? 'primary.main' : 'text.disabled',
                          border: '1px solid',
                          borderColor: viewLink ? otherColors.purple : '#e0e0e0',
                          borderRadius: '100px',
                          py: 1,
                          px: 2,
                          cursor: viewLink ? 'pointer' : 'not-allowed',
                          '&:hover': {
                            backgroundColor: viewLink ? otherColors.white : '#f5f5f5',
                          },
                        }}
                        onClick={async () => {
                          if (viewLink.startsWith('blob:')) {
                            window.open(viewLink, '_blank', 'noopener,noreferrer');
                          }
                          if (viewLink.startsWith('z3:') && apiClient) {
                            try {
                              const res = await apiClient.getZ3DownloadLink(viewLink);
                              window.open(res.signedUrl, '_blank', 'noopener,noreferrer');
                            } catch (err) {
                              console.error(err);
                            }
                          }
                        }}
                        disabled={!viewLink}
                      >
                        {viewLink ? t('pastVisits.viewPDF') : t('pastVisits.pdfNotAvailable')}
                      </Button>
                    )}
                  </Box>
                );
              })
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 2,
                px: 3,
                py: 3,
                my: 3,
                backgroundColor: otherColors.lightPurple,
              }}
            >
              <Typography variant="subtitle1" color={otherColors.purple}>
                {t('pastVisits.noDocuments')}
              </Typography>
            </Box>
          )}
        </>
      )}
      <Button
        sx={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: otherColors.white,
          color: 'primary.main',
          border: '1px solid',
          borderColor: otherColors.purple,
          borderRadius: '100px',
          py: 1,
          px: 2,
          mt: 2,
        }}
        onClick={() => {
          navigate(intakeFlowPageRoute.MyPatients.path);
        }}
      >
        {t('pastVisits.backToHome')}
      </Button>
    </CustomContainer>
  );
};

export default WellnessScreening;
