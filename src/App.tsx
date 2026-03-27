import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useSupabaseAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import SupportProvider from "@/components/SupportProvider";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { RevenueCatProvider } from "@/providers/RevenueCatProvider";
import { PaddleProvider } from "@/providers/PaddleProvider";
import Animals from "./pages/Animals";
import Corrales from "./pages/Corrales";
import Activities from "./pages/Activities";

import AnimalProfile from "./pages/AnimalProfile";
import Subscription from "./pages/Subscription";
import Plans from "./pages/Plans";
import Layout from "@/components/Layout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Finances from "./pages/Finances";
import Reports from "./pages/Reports";
import Achievements from "./pages/Achievements";
import { SettingsPage } from "./pages/Settings";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import RefundPolicy from "./pages/RefundPolicy";

import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AuthConfirm from "./pages/AuthConfirm";

import { Capacitor } from "@capacitor/core";
import {
  isDespiaRuntime,
  isRevenueCatCapacitorAvailable,
  detectPlatform,
} from "@/lib/platformDetection";

console.log("=== PLATFORM DEBUG ===");
console.log("isNativePlatform:", Capacitor.isNativePlatform());
console.log("getPlatform:", Capacitor.getPlatform());
console.log("isDespiaRuntime:", isDespiaRuntime());
console.log("isRevenueCatAvailable:", isRevenueCatCapacitorAvailable());
console.log("detectPlatform:", detectPlatform());
console.log("hostname:", window.location.hostname);
console.log("port:", window.location.port);
console.log("userAgent:", navigator.userAgent);
console.log("======================");

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <RevenueCatProvider>
        <h1>Prueba</h1>
        <h1>Prueba</h1>
        <h1>Prueba</h1>
        <h1>Prueba</h1>
        <h1>Prueba</h1>
        <h1>Prueba</h1>
        <h1>Prueba</h1>
        {/* <PaddleProvider>
          <SupportProvider>
            <GlobalErrorBoundary>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Routes>
                    <Route
                      path="/"
                      element={<Navigate to="/dashboard" replace />}
                    />
                    <Route path="/auth" element={<Auth />} />
                    <Route
                      path="/forgot-password"
                      element={<ForgotPassword />}
                    />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/auth/confirm" element={<AuthConfirm />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/refund-policy" element={<RefundPolicy />} />
                    <Route
                      element={
                        <ProtectedRoute>
                          <Layout />
                        </ProtectedRoute>
                      }
                    >
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/animales/:id" element={<AnimalProfile />} />
                      <Route path="/animals" element={<Animals />} />
                      <Route path="/finances" element={<Finances />} />
                      <Route path="/corrales" element={<Corrales />} />
                      <Route path="/activities" element={<Activities />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/subscription" element={<Subscription />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/achievements" element={<Achievements />} />
                    </Route>
                    <Route
                      path="/plans"
                      element={
                        <ProtectedRoute>
                          <Plans />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </GlobalErrorBoundary>
          </SupportProvider>
        </PaddleProvider> */}
      </RevenueCatProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
