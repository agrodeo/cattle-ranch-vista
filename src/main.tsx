import { createRoot } from 'react-dom/client';
import React from 'react';
import { AuthProvider } from "@/hooks/useSupabaseAuth";
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
