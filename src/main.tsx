import { createRoot } from 'react-dom/client';
import React from 'react';
import App from './App.tsx';
import './index.css';
import './i18n'; // Initialize i18n
import { setupAutoSync } from './services/autoSync';

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
        
        // Listen for background sync messages
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'BACKGROUND_SYNC') {
            console.log('Background sync triggered');
          }
        });
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Setup auto-sync on reconnect and periodic sync
setupAutoSync();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
