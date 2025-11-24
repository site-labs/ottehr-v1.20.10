import './index.css';
import './lib/i18n';
import { Auth0Provider, CacheLocation, useAuth0 } from '@auth0/auth0-react';
import hasOwn from 'object.hasown';
import React from 'react';
import App from './App';

window.global ||= window; // https://stackoverflow.com/questions/72795666/how-to-fix-vite-build-parser-error-unexpected-token-in-third-party-dependenc

// polyfill for fixing missing hasOwn Object property in some browsers
// https://www.npmjs.com/package/object.hasown
if (!Object.hasOwn) {
  hasOwn.shim();
}

const { VITE_APP_AUTH0_AUDIENCE, VITE_APP_AUTH_URL, VITE_APP_CLIENT_ID } = import.meta.env;
if (!VITE_APP_CLIENT_ID || !VITE_APP_AUTH0_AUDIENCE) {
  throw new Error('Client ID or audience not found');
}

const LoginOptions: React.FC = () => {
  const { loginWithRedirect } = useAuth0();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          maxWidth: '300px',
          width: '100%',
          padding: '32px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          backgroundColor: 'white',
        }}
      >
        <div
          style={{
            marginBottom: '16px',
            width: '320px', // Adjust based on your logo size
            height: '70px', // Adjust based on your logo size
          }}
        >
          {/* Replace with your actual logo */}
          <img
            src="https://sitelabsglobal.com/wp-content/uploads/2023/04/logo_full_color-e1682785765545.png"
            alt="Logo"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
        <h3 style={{ margin: '0 0 16px 0' }}>Patient Portal Login</h3>
        <button
          onClick={() =>
            loginWithRedirect({
              authorizationParams: { connection: 'sms' },
              appState: {
                returnTo: window.location.pathname,
              },
            })
          }
          style={{
            padding: '10px',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          Sign in with Phone/SMS
        </button>
        <button
          onClick={() =>
            loginWithRedirect({
              appState: {
                returnTo: window.location.pathname,
                authorizationParams: { connection: 'email' },
              },
            })
          }
          style={{
            padding: '10px',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          Sign in with Email/Password
        </button>
      </div>
    </div>
  );
};

export const AuthenticationWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authConfig = {
    domain: VITE_APP_AUTH_URL,
    clientId: VITE_APP_CLIENT_ID,
    authorizationParams: {
      // connection: 'sms',
      redirect_uri: `${window.location.origin}/redirect`,
      audience: VITE_APP_AUTH0_AUDIENCE,
      scope: 'openid profile email offline_access',
    },
    useRefreshTokens: true,
    useRefreshTokensFallback: true,
    // adding cache location so that auth persists on page refresh
    // https://stackoverflow.com/questions/63537913/auth0-does-not-persist-login-on-page-refresh-for-email-password
    cacheLocation: 'localstorage' as CacheLocation,
    onRedirectCallback: (appState: any) => {
      // If the appState is not defined, we can just return
      if (!appState || !appState.target) {
        return;
      }
      // Otherwise, we can stick appState.target in local storage so that it can be used in the auth landing page
      localStorage.setItem('redirectDestination', appState.target);
    },
  };

  return <Auth0Provider {...authConfig}>{children}</Auth0Provider>;
};

export const AppWithAuth: React.FC = () => {
  const { isAuthenticated } = useAuth0();

  return isAuthenticated ? <App /> : <LoginOptions />;
};
