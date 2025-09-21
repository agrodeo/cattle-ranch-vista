import { useState, useEffect } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useVaccinationRequirements } from "@/hooks/useVaccinationRequirements";
import { OnboardingFlow } from "./OnboardingFlow";
import { useNavigate } from "react-router-dom";

interface OnboardingWrapperProps {
  children: React.ReactNode;
}

export const OnboardingWrapper = ({ children }: OnboardingWrapperProps) => {
  const { isAuthenticated, currentUser } = useSupabaseAuth();
  const { requirements, loading } = useVaccinationRequirements();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && currentUser && !loading) {
      // Check if user has any vaccination requirements set up
      const hasVaccinationSetup = requirements.length > 0;
      
      // Check if this is a new user (could use localStorage or another method)
      const hasCompletedOnboarding = localStorage.getItem(`onboarding_completed_${currentUser.id}`);
      
      // Show onboarding if no vaccination setup and hasn't completed onboarding
      if (!hasVaccinationSetup && !hasCompletedOnboarding) {
        setShowOnboarding(true);
      }
    }
  }, [isAuthenticated, currentUser, requirements, loading]);

  const handleCompleteOnboarding = () => {
    if (currentUser) {
      localStorage.setItem(`onboarding_completed_${currentUser.id}`, 'true');
    }
    setShowOnboarding(false);
    navigate('/dashboard');
  };

  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleCompleteOnboarding} />;
  }

  return <>{children}</>;
};