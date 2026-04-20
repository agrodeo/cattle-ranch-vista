import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

interface WizardStepShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  onBack?: () => void;
  onSkip?: () => void;
  onContinue: () => void;
  loading?: boolean;
  continueDisabled?: boolean;
  isFinal?: boolean;
}

/**
 * Shared layout for every onboarding step.
 * Title + subtitle (no decorative emoji), body slot, full-width button, optional skip link.
 */
export const WizardStepShell = ({
  title,
  subtitle,
  children,
  onBack,
  onSkip,
  onContinue,
  loading = false,
  continueDisabled = false,
  isFinal = false,
}: WizardStepShellProps) => {
  const { t } = useTranslation(["onboarding"]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="self-start inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors -ml-2 px-2 py-1 rounded-md"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("onboarding:wizard.back")}
        </button>
      )}

      <div className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{title}</h2>
        <p className="text-base text-muted-foreground">{subtitle}</p>
      </div>

      <div>{children}</div>

      <div className="space-y-3 pt-2">
        <button
          type="button"
          onClick={onContinue}
          disabled={loading || continueDisabled}
          className="w-full h-14 rounded-2xl text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              {isFinal ? t("onboarding:wizard.finish") : t("onboarding:wizard.continue")}
              {!isFinal && <ArrowRight className="h-5 w-5" />}
            </>
          )}
        </button>
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            disabled={loading}
            className="w-full h-12 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("onboarding:wizard.skip")}
          </button>
        )}
      </div>
    </div>
  );
};
