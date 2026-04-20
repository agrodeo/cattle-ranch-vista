import { useEffect, useState } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useVaccinationRequirements } from "@/hooks/useVaccinationRequirements";
import { OnboardingWizard } from "./OnboardingWizard";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface OnboardingWrapperProps {
  children: React.ReactNode;
}

const flagKey = (userId: string) => `onboarding_completed_${userId}`;

export const OnboardingWrapper = ({ children }: OnboardingWrapperProps) => {
  const { isAuthenticated, currentUser } = useSupabaseAuth();
  const { requirements, loading } = useVaccinationRequirements();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [decided, setDecided] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !currentUser || loading || decided) return;

    const run = async () => {
      const key = flagKey(currentUser.id);
      const alreadyCompleted = localStorage.getItem(key) === "true";
      if (alreadyCompleted) {
        setDecided(true);
        return;
      }

      // Trigger only for accounts that look "fresh": no vaccines AND no corrales AND no animals.
      // Existing accounts get auto-flagged so the wizard never appears for them.
      const hasVaccines = requirements.length > 0;

      let hasCorrales = false;
      let hasAnimals = false;
      if (currentUser.cabañaId) {
        const [{ count: cCount }, { count: aCount }] = await Promise.all([
          supabase
            .from("corrales")
            .select("id", { count: "exact", head: true })
            .eq("cabaña_id", currentUser.cabañaId),
          supabase
            .from("animals")
            .select("id", { count: "exact", head: true })
            .eq("cabaña_id", currentUser.cabañaId),
        ]);
        hasCorrales = (cCount ?? 0) > 0;
        hasAnimals = (aCount ?? 0) > 0;
      }

      if (hasVaccines || hasCorrales || hasAnimals) {
        // Existing user — never show onboarding again.
        localStorage.setItem(key, "true");
        setDecided(true);
        return;
      }

      setShowOnboarding(true);
      setDecided(true);
    };

    run();
  }, [isAuthenticated, currentUser, requirements, loading, decided]);

  const handleCompleteOnboarding = () => {
    if (currentUser) {
      localStorage.setItem(flagKey(currentUser.id), "true");
    }
    setShowOnboarding(false);
    navigate("/dashboard");
  };

  if (showOnboarding) {
    return <OnboardingWizard onComplete={handleCompleteOnboarding} />;
  }

  return <>{children}</>;
};
