import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";

const DISMISS_KEY = "free_trial_banner_dismissed";

interface FreeTrialBannerProps {
  onViewPlans?: () => void;
}

/**
 * Subtle banner shown only while the cabaña is inside the automatic
 * 7-day signup trial. Disappears for paid/plan-trial subscriptions.
 */
export const FreeTrialBanner = ({ onViewPlans }: FreeTrialBannerProps) => {
  const { t } = useTranslation("subscription");
  const { subscriptionStatus, isInFreeTrial } = useSubscription();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  // Never show the signup trial to anyone with a paid plan or an active plan trial
  const hasPlan =
    subscriptionStatus?.status === 'active' ||
    subscriptionStatus?.status === 'trial' ||
    !!subscriptionStatus?.isTrialActive ||
    subscriptionStatus?.accessLevel === 'paid';

  if (hasPlan || !isInFreeTrial() || dismissed) return null;

  const daysRemaining = Math.max(1, Math.min(7, subscriptionStatus?.signupTrialDaysRemaining ?? 0));
  const currentDay = Math.max(1, 8 - daysRemaining);

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setDismissed(true);
  };

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {t("freeTrial.banner.title", { day: currentDay })}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("freeTrial.banner.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onViewPlans && (
            <Button size="sm" variant="outline" onClick={onViewPlans}>
              {t("freeTrial.banner.cta")}
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={handleDismiss}
            aria-label={t("freeTrial.banner.dismiss")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
