import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendIndicator } from './TrendIndicator';
import { formatWeight } from '@/lib/format';
import type { SupportedLanguage } from '@/i18n';

interface PeriodComparisonProps {
  currentPeriod: {
    label: string;
    value: number;
  };
  previousPeriod: {
    label: string;
    value: number;
  };
  change: number;
  metric: string;
  lang?: SupportedLanguage;
}

export function PeriodComparison({
  currentPeriod,
  previousPeriod,
  change,
  metric,
  lang = 'es'
}: PeriodComparisonProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Comparación de Períodos</CardTitle>
        <CardDescription>{metric}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{currentPeriod.label}</p>
            <p className="text-2xl font-bold">{formatWeight(currentPeriod.value, lang)}</p>
          </div>
          <Badge variant="outline" className="ml-2">
            Actual
          </Badge>
        </div>
        
        <div className="flex items-center justify-between opacity-70">
          <div>
            <p className="text-sm text-muted-foreground">{previousPeriod.label}</p>
            <p className="text-lg font-semibold">{formatWeight(previousPeriod.value, lang)}</p>
          </div>
          <Badge variant="secondary" className="ml-2">
            Anterior
          </Badge>
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Cambio:</span>
            <TrendIndicator value={change} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
