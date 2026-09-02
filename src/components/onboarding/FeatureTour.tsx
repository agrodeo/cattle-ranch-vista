import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "lucide-react";
import { cowHead } from "@lucide/lab";
import {
  Sparkles,
  Fence,
  Move,
  Scale,
  Syringe,
  Baby,
  Wallet,
  BarChart3,
  WifiOff,
  MessageCircle,
  Mail,
  X,
  ArrowLeft,
  ArrowRight,
  HeartHandshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SUPPORT_CONTACT } from "@/config/support";

interface FeatureTourProps {
  onClose: () => void;
}

type SlideId =
  | "welcome"
  | "animals"
  | "corrales"
  | "movimientos"
  | "weights"
  | "health"
  | "reproduction"
  | "finances"
  | "reports"
  | "offline"
  | "assistant"
  | "contact";

const SLIDES: { id: SlideId; render: (className: string) => JSX.Element }[] = [
  { id: "welcome", render: (c) => <Sparkles className={c} /> },
  { id: "animals", render: (c) => <Icon iconNode={cowHead} className={c} /> },
  { id: "corrales", render: (c) => <Fence className={c} /> },
  { id: "movimientos", render: (c) => <Move className={c} /> },
  { id: "weights", render: (c) => <Scale className={c} /> },
  { id: "health", render: (c) => <Syringe className={c} /> },
  { id: "reproduction", render: (c) => <Baby className={c} /> },
  { id: "finances", render: (c) => <Wallet className={c} /> },
  { id: "reports", render: (c) => <BarChart3 className={c} /> },
  { id: "offline", render: (c) => <WifiOff className={c} /> },
  { id: "assistant", render: (c) => <MessageCircle className={c} /> },
  { id: "contact", render: (c) => <HeartHandshake className={c} /> },
];

export const FeatureTour = ({ onClose }: FeatureTourProps) => {
  const { t } = useTranslation(["onboarding"]);
  const [index, setIndex] = useState(0);

  const total = SLIDES.length;
  const slide = SLIDES[index];
  const isLast = index === total - 1;

  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  const whatsappUrl = useMemo(
    () =>
      `https://wa.me/${SUPPORT_CONTACT.whatsappNumber}?text=${encodeURIComponent(
        SUPPORT_CONTACT.whatsappMessage
      )}`,
    []
  );
  const mailtoUrl = useMemo(
    () =>
      `mailto:${SUPPORT_CONTACT.email}?subject=${encodeURIComponent(
        SUPPORT_CONTACT.emailSubject
      )}`,
    []
  );

  const base = `onboarding:featureTour.slides.${slide.id}`;
  const where = t(`${base}.where`, { defaultValue: "" });

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-background">
      {/* Encabezado con progreso y salida siempre disponible */}
      <div className="sticky top-0 z-10 border-b border-border bg-background px-4 pb-3 pt-4 sm:px-6">
        <div className="mx-auto w-full max-w-xl">
          <div className="flex items-center justify-between gap-3">
            <p className="text-base font-medium text-muted-foreground">
              {t("onboarding:featureTour.stepCounter", {
                current: index + 1,
                total,
              })}
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12"
              onClick={handleClose}
              aria-label={t("onboarding:featureTour.close")}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          <Progress value={((index + 1) / total) * 100} className="mt-2 h-2" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {SLIDES.map((s, i) => (
              <span
                key={s.id}
                aria-hidden="true"
                className={`h-2.5 w-2.5 rounded-full ${
                  i <= index ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex flex-1 flex-col px-4 py-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            {slide.render("h-10 w-10 text-primary")}
          </div>

          <h1 className="mt-5 text-2xl font-bold leading-tight text-foreground sm:text-3xl">
            {t(`${base}.title`)}
          </h1>

          <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-foreground sm:text-lg">
            {t(`${base}.body`)}
          </p>

          {where ? (
            <p className="mt-4 text-sm text-muted-foreground">{where}</p>
          ) : null}

          {isLast && (
            <div className="mt-6 space-y-4">
              <p className="text-xl font-semibold text-foreground">
                {SUPPORT_CONTACT.ownerName}
              </p>
              <Button
                asChild
                className="h-14 w-full text-base font-semibold"
              >
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  {t("onboarding:featureTour.contact.whatsappButton")}
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-14 w-full text-base font-semibold"
              >
                <a href={mailtoUrl} target="_blank" rel="noopener noreferrer">
                  <Mail className="mr-2 h-5 w-5" />
                  {t("onboarding:featureTour.contact.emailButton")}
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Navegación */}
      <div className="sticky bottom-0 border-t border-border bg-background px-4 py-4 sm:px-6">
        <div className="mx-auto w-full max-w-xl space-y-3">
          {isLast ? (
            <Button
              className="h-14 w-full text-base font-semibold"
              onClick={handleClose}
            >
              {t("onboarding:featureTour.contact.finishButton")}
            </Button>
          ) : (
            <Button
              className="h-14 w-full text-base font-semibold"
              onClick={() => setIndex((i) => Math.min(i + 1, total - 1))}
            >
              {t("onboarding:featureTour.next")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}

          {index > 0 && (
            <Button
              variant="outline"
              className="h-14 w-full text-base"
              onClick={() => setIndex((i) => Math.max(i - 1, 0))}
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              {t("onboarding:featureTour.back")}
            </Button>
          )}

          <Button
            variant="ghost"
            className="h-14 w-full text-base text-muted-foreground"
            onClick={handleClose}
          >
            {t("onboarding:featureTour.skip")}
          </Button>
        </div>
      </div>
    </div>
  );
};
