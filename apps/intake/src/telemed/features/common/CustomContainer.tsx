import { SiteLabsLogo } from '@theme/index';
import { CustomContainerFactory } from 'src/components/CustomContainerFactory';
import Footer from 'src/telemed/components/Footer';
import { PROJECT_NAME } from 'utils';

export const CustomContainer = CustomContainerFactory({
  logo: SiteLabsLogo,
  alt: PROJECT_NAME,
  footer: <Footer />,
  showLanguagePicker: false,
});
