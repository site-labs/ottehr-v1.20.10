import CloseIcon from '@mui/icons-material/Close';
import VideoCameraFrontOutlinedIcon from '@mui/icons-material/VideoCameraFrontOutlined';
import { Box, Button, Skeleton, Typography } from '@mui/material';
import { pastVisits } from '@theme/icons';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PROJECT_NAME_SHORT } from 'utils';
import { intakeFlowPageRoute } from '../App';
import HomepageOption from '../components/HomepageOption';
import { dataTestIds } from '../helpers/data-test-ids';
import { otherColors } from '../IntakeThemeProvider';
import { CancelVisitDialog } from '../telemed/components';
import {
  findActiveAppointment,
  useAppointmentsData,
  useAppointmentStore,
  useGetAppointments,
} from '../telemed/features/appointments';
import { CustomContainer } from '../telemed/features/common';
import { useOystehrAPIClient } from '../telemed/utils';

const Homepage = (): JSX.Element => {
  const apiClient = useOystehrAPIClient();
  const navigate = useNavigate();
  const [isCancelVisitDialogOpen, setCancelVisitDialogOpen] = useState<boolean>(false);
  const { isAppointmentsFetching, refetchAppointments, appointments } = useAppointmentsData();
  const activeAppointment = useMemo(() => findActiveAppointment(appointments), [appointments]);
  const isAppointmentStatusProposed = activeAppointment?.appointmentStatus === 'proposed';
  const appointmentID = activeAppointment?.id || '';
  const { refetch } = useGetAppointments(apiClient, Boolean(apiClient));

  useEffect(() => {
    if (apiClient) {
      // TODO research option invalidate cache on the place to rid of useEffects with manually refetching
      void refetch();
    }
  }, [refetch, apiClient]);

  const handleReturnToCall = (): void => {
    navigate(`${intakeFlowPageRoute.WaitingRoom.path}?appointment_id=${appointmentID}`);
  };

  // todo: investigate how to move this functionality
  const handleContinueRequest = (): void => {
    useAppointmentStore.setState({ appointmentDate: activeAppointment?.start, appointmentID });
    // was telemedSelectPatient
    navigate(`${intakeFlowPageRoute.ChoosePatient.path}?flow=continueVisitRequest`, {
      state: { patientId: activeAppointment?.patient?.id },
    });
  };

  const handlePastVisits = (): void => {
    // was telemedSelectPatient
    navigate(intakeFlowPageRoute.MyPatients.path);
  };

  return (
    <CustomContainer title={`Welcome to ${PROJECT_NAME_SHORT}`} description="" isFirstPage={true}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {isAppointmentsFetching ? (
          <Skeleton
            variant="rounded"
            height={115}
            sx={{
              borderRadius: 2,
              backgroundColor: otherColors.coachingVisit,
            }}
          />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {activeAppointment && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
                <HomepageOption
                  title={isAppointmentStatusProposed ? 'Continue Virtual Visit Request' : 'Return to Call'}
                  icon={<VideoCameraFrontOutlinedIcon />}
                  handleClick={isAppointmentStatusProposed ? handleContinueRequest : handleReturnToCall}
                  subSlot={
                    isAppointmentStatusProposed ? undefined : (
                      <Typography
                        variant="overline"
                        sx={{
                          display: 'flex',
                          justifyContent: 'center',
                          backgroundColor: '#FFD271',
                          color: '#A67100',
                          borderRadius: 1,
                          px: 1,
                        }}
                      >
                        Active call
                      </Typography>
                    )
                  }
                />
                {isAppointmentStatusProposed && (
                  <Button onClick={() => setCancelVisitDialogOpen(true)} startIcon={<CloseIcon />}>
                    Cancel this request
                  </Button>
                )}
              </Box>
            )}

            {/*{!isAppointmentStatusReady && (*/}
            {/*  <HomepageOption title="Request a Virtual Visit" icon={requestVisit} handleClick={handleRequestVisit} />*/}
            {/*)}*/}

            {/* <HomepageOption
              title="Schedule a Virtual Visit"
              icon={<VideoCameraFrontOutlinedIcon />}
              handleClick={handleScheduleVirtual}
              dataTestId={dataTestIds.scheduleVirtualVisitButton}
            />
            <HomepageOption
              title="Schedule an In-Person Visit"
              icon={<LocalHospitalOutlinedIcon />}
              handleClick={handleInPerson}
              dataTestId={dataTestIds.scheduleInPersonVisitButton}
            />
            <HomepageOption
              title="Virtual Visit Check-In"
              icon={<VideoCameraFrontOutlinedIcon />}
              handleClick={handleRequestVisit}
              dataTestId={dataTestIds.startVirtualVisitButton}
            />

            <HomepageOption
              title="In-Person Check-In"
              icon={<LocalHospitalOutlinedIcon />}
              handleClick={handleWalkIn}
              dataTestId={dataTestIds.startInPersonVisitButton}
            /> */}
            <HomepageOption
              title="Wellness Screenings"
              icon={pastVisits}
              handleClick={handlePastVisits}
              subtitle="View/Download your results"
              dataTestId={dataTestIds.navigatePastVisitsButton}
            />
          </Box>
        )}

        {/* <HomepageOption
          title="Contact Support"
          icon={<LiveHelpOutlinedIcon />}
          handleClick={handleContactSupport}
          dataTestId={dataTestIds.contactSupportButton}
        /> */}
      </Box>
      {isCancelVisitDialogOpen ? (
        <CancelVisitDialog
          appointmentID={appointmentID}
          onClose={(canceled) => {
            setCancelVisitDialogOpen(false);
            if (canceled) void refetchAppointments();
          }}
        />
      ) : null}
    </CustomContainer>
  );
};

export default Homepage;
