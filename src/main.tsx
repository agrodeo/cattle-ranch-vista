import { createRoot } from 'react-dom/client';
import React from 'react';
import App from './App.tsx';
import './index.css';
import './i18n'; // Initialize i18n
// Unregister any old service workers that may conflict with Despia
const cleanupLegacyServiceWorkers = () => {
  try {
    if (
      typeof navigator === 'undefined' ||
      !('serviceWorker' in navigator) ||
      typeof navigator.serviceWorker.getRegistrations !== 'function'
    ) {
      return;
    }

    navigator.serviceWorker.getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().catch(() => {});
          console.log('Unregistered old service worker:', registration.scope);
        });
      })
      .catch((error) => {
        console.warn('Service worker cleanup skipped:', error);
      });
  } catch (error) {
    console.warn('Service worker cleanup unavailable:', error);
  }
};

console.log('🚀 App starting | href:', window.location.href, '| pathname:', window.location.pathname, '| origin:', window.location.origin);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

cleanupLegacyServiceWorkers();
