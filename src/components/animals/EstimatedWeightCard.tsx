import { type WeightEstimation } from '@/lib/weightEstimation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, AlertTriangle, Info, Scale } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EstimatedWeightCardProps {
  estimation: WeightEstimation | null;
  isLoading: boolean;
  compact?: boolean;
}

export function EstimatedWeightCard({ estimation, isLoading, compact = false }: EstimatedWeightCardProps) {
  if (isLoading) {
    return (
      <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
        <CardContent className={compact ? 'p-4' : 'p-5'}>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-8 w-24" />
        </CardContent>
      </Card>
    );
  }

  if (!estimation || estimation.estimatedWeight <= 0) {
    return null;
  }

  const confidenceColor =
    estimation.confidencePercent >= 75 ? 'text-green-700 dark:text-green-400' :
    estimation.confidencePercent >= 50 ? 'text-yellow-700 dark:text-yellow-400' :
    'text-red-600 dark:text-red-400';

  const confidenceBadgeVariant: 'default' | 'secondary' | 'destructive' =
    estimation.confidencePercent >= 75 ? 'default' :
    estimation.confidencePercent >= 50 ? 'secondary' : 'destructive';

  return (
    <Card className="border-green-200 bg-green-50/30 dark:bg-green-950/20 dark:border-green-800/50">
      <CardContent className={compact ? 'p-4' : 'p-5'}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
              <span className="text-sm font-medium text-green-800 dark:text-green-300">
                Peso Estimado
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs font-medium mb-1">Fuentes de datos:</p>
                    <ul className="text-xs space-y-0.5">
                      {estimation.dataSources.map((src, i) => (
                        <li key={i}>• {src}</li>
                      ))}
                    </ul>
                    {!estimation.layer1Available && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Registra al menos 2 pesajes para mejor estimación.
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Weight */}
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">
              {estimation.estimatedWeight.toFixed(1)} kg
            </p>

            {/* Confidence range */}
            <p className="text-xs text-muted-foreground">
              ± {estimation.confidenceRange} kg
              {estimation.daysSinceLastWeigh !== null && (
                <> · {estimation.daysSinceLastWeigh} días sin pesar</>
              )}
            </p>
          </div>

          {/* Right side badges */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Badge variant={confidenceBadgeVariant} className="text-xs">
              {estimation.confidencePercent}% confianza
            </Badge>
            {estimation.needsWeighing && (
              <Badge variant="destructive" className="text-xs flex items-center gap-1">
                <Scale className="h-3 w-3" />
                Necesita pesaje
              </Badge>
            )}
            {estimation.hasAnomaly && (
              <Badge variant="outline" className="text-xs flex items-center gap-1 border-yellow-500 text-yellow-700 dark:text-yellow-400">
                <AlertTriangle className="h-3 w-3" />
                Anomalía
              </Badge>
            )}
          </div>
        </div>

        {/* Low data warning */}
        {!estimation.layer1Available && (
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            Registra un peso para mejor estimación
          </p>
        )}
      </CardContent>
    </Card>
  );
}
