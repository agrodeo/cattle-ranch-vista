import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useSupabaseAuth";
import { ConnectivityBanner } from "@/components/ConnectivityBanner";
import { useConnectivity } from "@/services/connectivity";
import { trySync, setupSyncListeners } from "@/services/sync";
import { useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Animals from "./pages/Animals";
import Corrales from "./pages/Corrales";
import Activities from "./pages/Activities";

import AnimalProfile from "./pages/AnimalProfile";
import Subscription from "./pages/Subscription";
import Layout from "@/components/Layout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Finances from "./pages/Finances";
import Reports from "./pages/Reports";
import { SettingsPage } from "./pages/Settings";

import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppWithConnectivity />
      </AuthProvider>
    </QueryClientProvider>
  );
};

function AppWithConnectivity() {
  const { isOnline } = useConnectivity();

  useEffect(() => {
    // Setup sync listeners for service worker communication
    setupSyncListeners();
    
    // Try to sync when coming online
    if (isOnline) {
      trySync().catch(error => {
        console.error('Initial sync failed:', error);
      });
    }
  }, [isOnline]);

  return (
    <BrowserRouter>
      <TooltipProvider>
        <ConnectivityBanner />
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
          </Route>
          <Route path="/animales/:id" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<AnimalProfile />} />
          </Route>
          <Route path="/animals" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Animals />} />
          </Route>
          <Route path="/corrales" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Corrales />} />
          </Route>
          <Route path="/activities" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Activities />} />
          </Route>
          <Route path="/finances" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Finances />} />
          </Route>
          <Route path="/reports" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Reports />} />
          </Route>
          <Route path="/subscription" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Subscription />} />
          </Route>
          <Route path="/settings" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  );
}

export default App;
