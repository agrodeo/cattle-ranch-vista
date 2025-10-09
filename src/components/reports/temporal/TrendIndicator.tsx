import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendIndicatorProps {
  value: number;
  className?: string;
  showIcon?: boolean;
  showSign?: boolean;
}

export function TrendIndicator({ value, className, showIcon = true, showSign = true }: TrendIndicatorProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;

  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  
  const colorClass = isPositive 
    ? 'text-green-600 dark:text-green-400' 
    : isNegative 
    ? 'text-red-600 dark:text-red-400' 
    : 'text-muted-foreground';

  return (
    <div className={cn('flex items-center gap-1.5', colorClass, className)}>
      {showIcon && <Icon className="h-4 w-4" />}
      <span className="font-medium">
        {showSign && value > 0 && '+'}{value.toFixed(1)}%
      </span>
    </div>
  );
}
