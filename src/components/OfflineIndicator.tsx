import { useTranslation } from 'react-i18next';
import { CloudOff, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { SyncStatus } from '@/services/offlineTypes';

interface OfflineIndicatorProps {
  syncStatus?: SyncStatus;
  className?: string;
  showTooltip?: boolean;
}

export function OfflineIndicator({ syncStatus, className, showTooltip = true }: OfflineIndicatorProps) {
  const { t } = useTranslation('common');

  if (!syncStatus || syncStatus === 'synced') {
    return null;
  }

  const getStatusConfig = () => {
    switch (syncStatus) {
      case 'pending':
        return {
          icon: Clock,
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10',
          label: t('pendingSync'),
          description: t('willSyncWhenOnline')
        };
      case 'failed':
        return {
          icon: AlertCircle,
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/10',
          label: t('syncFailed'),
          description: t('willRetryAutomatically')
        };
      case 'failed_permanent':
        return {
          icon: CloudOff,
          color: 'text-destructive',
          bgColor: 'bg-destructive/10',
          label: t('syncError'),
          description: t('manualActionRequired')
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  const Icon = config.icon;

  const indicator = (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 px-1.5 py-0.5 text-xs font-normal',
        config.color,
        config.bgColor,
        'border-current/20',
        className
      )}
    >
      <Icon className="h-3 w-3" />
      <span className="sr-only sm:not-sr-only">{config.label}</span>
    </Badge>
  );

  if (!showTooltip) {
    return indicator;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {indicator}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Small dot indicator for compact views
interface OfflineDotProps {
  syncStatus?: SyncStatus;
  className?: string;
}

export function OfflineDot({ syncStatus, className }: OfflineDotProps) {
  if (!syncStatus || syncStatus === 'synced') {
    return null;
  }

  const colorClass = {
    pending: 'bg-amber-500',
    failed: 'bg-orange-500',
    failed_permanent: 'bg-destructive'
  }[syncStatus];

  return (
    <span
      className={cn(
        'inline-block h-2 w-2 rounded-full animate-pulse',
        colorClass,
        className
      )}
    />
  );
}
