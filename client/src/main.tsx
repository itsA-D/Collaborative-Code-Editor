import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import posthog from 'posthog-js';
import { PostHogProvider } from '@posthog/react';
import App from './App';
import './styles.css';
import './styles/board.css';
import { AuthProvider } from './state/AuthContext';
import { initAnalytics, isAnalyticsEnabled } from './analytics/posthog';

// global cursor glow removed

// A data router (not <BrowserRouter>) is required for useBlocker, which powers
// the unsaved temporary-session navigation guard.
const router = createBrowserRouter([
  {
    path: '*',
    element: (
      <AuthProvider>
        <App />
      </AuthProvider>
    ),
  },
]);

// Initialized once, synchronously and without awaiting, so nothing blocks the
// first render. It disables itself when the env vars are absent.
initAnalytics();

const app = (
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  isAnalyticsEnabled() ? <PostHogProvider client={posthog}>{app}</PostHogProvider> : app
);
