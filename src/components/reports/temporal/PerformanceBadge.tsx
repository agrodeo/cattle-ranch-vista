import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type PerformanceLevel = 'excellent' | 'good' | 'average' | 'poor' | 'unknown';

interface PerformanceBadgeProps {
  level: PerformanceLevel;
  value?: number;
  className?: string;
}

const levelConfig: Record<PerformanceLevel, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  excellent: {
    label: 'Excelente',
    variant: 'default',
    className: 'bg-green-600 hover:bg-green-700 text-white'
  },
  good: {
    label: 'Bueno',
    variant: 'secondary',
    className: 'bg-blue-600 hover:bg-blue-700 text-white'
  },
  average: {
    label: 'Regular',
    variant: 'secondary',
    className: 'bg-yellow-600 hover:bg-yellow-700 text-white'
  },
  poor: {
    label: 'Bajo',
    variant: 'destructive',
    className: 'bg-red-600 hover:bg-red-700 text-white'
  },
  unknown: {
    label: 'Sin datos',
    variant: 'outline',
    className: ''
  }
};

export function PerformanceBadge({ level, value, className }: PerformanceBadgeProps) {
  const config = levelConfig[level];

  return (
    <Badge 
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.label}
      {value !== undefined && ` (${value.toFixed(1)}%)`}
    </Badge>
  );
}

/**
 * Determine performance level based on improvement percentage
 */
export function getPerformanceLevel(improvement: number | null): PerformanceLevel {
  if (improvement === null || isNaN(improvement)) return 'unknown';
  
  if (improvement >= 5) return 'excellent';
  if (improvement >= 2) return 'good';
  if (improvement >= -2) return 'average';
  return 'poor';
}
