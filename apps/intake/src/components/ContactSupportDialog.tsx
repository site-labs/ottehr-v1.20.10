import { Box, Link, Typography } from '@mui/material';
import { FC } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { CustomDialog } from './CustomDialog';
import PageForm from './PageForm';

type ContactSupportDialogProps = { onClose: () => void };

export const ContactSupportDialog: FC<ContactSupportDialogProps> = ({ onClose }) => {
  const { t } = useTranslation();
  return (
    <CustomDialog open={true} onClose={onClose}>
      <Typography variant="h2" color="primary.main" sx={{ mb: 2 }}>
        {t('contactSupport.needHelp')}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="body2">
          <Trans i18nKey="contactSupport.emailUs" />
          <Link href={`mailto:${t('contactSupport.emailAddress')}`}>
            <Trans i18nKey="contactSupport.emailAddress" />
          </Link>
        </Typography>
        <Typography variant="body2">{t('contactSupport.emergency')}</Typography>
      </Box>
      <PageForm
        onSubmit={onClose}
        controlButtons={{
          submitLabel: 'Ok',
          backButton: false,
        }}
      />
    </CustomDialog>
  );
};
