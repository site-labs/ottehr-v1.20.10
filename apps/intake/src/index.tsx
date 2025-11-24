import './index.css';
import './lib/i18n';
import hasOwn from 'object.hasown';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppWithAuth, AuthenticationWrapper } from './AuthWrapper';

window.global ||= window; // https://stackoverflow.com/questions/72795666/how-to-fix-vite-build-parser-error-unexpected-token-in-third-party-dependenc

// polyfill for fixing missing hasOwn Object property in some browsers
// https://www.npmjs.com/package/object.hasown
if (!Object.hasOwn) {
  hasOwn.shim();
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <AuthenticationWrapper>
      <AppWithAuth />
    </AuthenticationWrapper>
  </React.StrictMode>
);
