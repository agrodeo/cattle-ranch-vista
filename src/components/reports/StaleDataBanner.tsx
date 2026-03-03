import { WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { es, enUS, ptBR } from "date-fns/locale";
import { useLanguage } from "@/hooks/useLanguage";

interface StaleDataBannerProps {
  lastUpdated: string | null;
  className?: string;
}

const localeMap: Record<string, typeof es> = { es, en: enUS, pt: ptBR };

export function StaleDataBanner({ lastUpdated, className = "" }: StaleDataBannerProps) {
  const { t } = useTranslation(['reports', 'common']);
  const { lang } = useLanguage();
  const locale = localeMap[lang] || es;

  const formattedDate = lastUpdated
    ? format(new Date(lastUpdated), "dd/MM/yyyy HH:mm", { locale })
    : null;

  return (
    <div className={`flex items-center gap-2 rounded-lg border border-muted bg-muted/50 px-3 py-2 text-sm text-muted-foreground ${className}`}>
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>
        {t('common:offlineData', 'Datos offline')}
        {formattedDate && ` — ${t('common:lastUpdated', 'última actualización')}: ${formattedDate}`}
      </span>
    </div>
  );
}
