import { useEffect, useState } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { OnboardingWizard } from "./OnboardingWizard";
import { FeatureTour } from "./FeatureTour";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface OnboardingWrapperProps {
  children: React.ReactNode;
}

const flagKey = (userId: string) => `onboarding_completed_${userId}`;

export const OnboardingWrapper = ({ children }: OnboardingWrapperProps) => {
  const { isAuthenticated, currentUser } = useSupabaseAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [decided, setDecided] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !currentUser || decided) return;

    const run = async () => {
      const key = flagKey(currentUser.id);
      // localStorage is only a fast cache; the server flag is the source of truth.
      if (localStorage.getItem(key) === "true") {
        setDecided(true);
        return;
      }

      const cabañaId = currentUser.cabañaId;
      if (!cabañaId) {
        setDecided(true);
        return;
      }

      const { data, error } = await supabase
        .from("cabañas")
        .select("onboarding_completed_at")
        .eq("id", cabañaId)
        .maybeSingle();

      if (error) {
        // Never trap the user because of a network/permission hiccup.
        setDecided(true);
        return;
      }

      if (data?.onboarding_completed_at) {
        localStorage.setItem(key, "true");
        setDecided(true);
        return;
      }

      setShowOnboarding(true);
      setDecided(true);
    };

    run();
  }, [isAuthenticated, currentUser, decided]);

  // Marks onboarding as finished (or abandoned) both on the server and locally.
  const markCompleted = async () => {
    if (!currentUser) return;
    try {
      localStorage.setItem(flagKey(currentUser.id), "true");
    } catch {
      /* noop */
    }
    if (currentUser.cabañaId) {
      await supabase
        .from("cabañas")
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq("id", currentUser.cabañaId);
    }
  };

  // Marks the guided feature tour as seen (server is the source of truth).
  const markTourCompleted = async () => {
    if (!currentUser) return;
    try {
      localStorage.setItem(tourFlagKey(currentUser.id), "true");
    } catch {
      /* noop */
    }
    if (currentUser.cabañaId) {
      await supabase
        .from("cabañas")
        .update({ feature_tour_completed_at: new Date().toISOString() })
        .eq("id", currentUser.cabañaId);
    }
  };

  const handleCompleteOnboarding = () => {
    void markCompleted();
    setShowOnboarding(false);
    setShowTour(true);
    navigate("/dashboard");
  };

  const handleCloseTour = () => {
    void markTourCompleted();
    setShowTour(false);
  };

  if (showOnboarding) {
    return <OnboardingWizard onComplete={handleCompleteOnboarding} />;
  }

  return (
    <>
      {children}
      {showTour && <FeatureTour onClose={handleCloseTour} />}
    </>
  );
};
