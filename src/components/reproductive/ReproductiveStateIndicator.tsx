import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Clock, 
  Heart, 
  Baby, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useTranslation } from "react-i18next";

interface ReproductiveStateIndicatorProps {
  state: string;
  lastUpdate?: string;
  expectedDate?: string;
  serviceType?: string;
  notes?: string;
}

export function ReproductiveStateIndicator({ 
  state, 
  lastUpdate, 
  expectedDate, 
  serviceType, 
  notes 
}: ReproductiveStateIndicatorProps) {
  const { t } = useTranslation('animals');
  
  const getStateInfo = (estado: string) => {
    switch (estado) {
      case 'sin_actividad':
        return {
          icon: Clock,
          label: t('profile.reproduction.states.noActivity'),
          variant: 'secondary' as const,
          color: 'text-muted-foreground',
          description: t('profile.reproduction.stateDescriptions.noActivity')
        };
      case 'servicio_pendiente':
        return {
          icon: Clock,
          label: t('profile.reproduction.states.pendingService'),
          variant: 'default' as const,
          color: 'text-blue-600',
          description: t('profile.reproduction.stateDescriptions.pendingService')
        };
      case 'ia_pendiente':
        return {
          icon: Clock,
          label: t('profile.reproduction.states.pendingAI'),
          variant: 'default' as const,
          color: 'text-purple-600',
          description: t('profile.reproduction.stateDescriptions.pendingAI')
        };
      case 'preñez_servicio':
        return {
          icon: Heart,
          label: t('profile.reproduction.states.pregnantByService'),
          variant: 'default' as const,
          color: 'text-green-600',
          description: t('profile.reproduction.stateDescriptions.pregnantByService')
        };
      case 'preñez_ia':
        return {
          icon: Heart,
          label: t('profile.reproduction.states.pregnantByAI'),
          variant: 'default' as const,
          color: 'text-green-600',
          description: t('profile.reproduction.stateDescriptions.pregnantByAI')
        };
      case 'preñez_activa':
        return {
          icon: Heart,
          label: t('profile.reproduction.states.activePregnancy'),
          variant: 'default' as const,
          color: 'text-green-600',
          description: t('profile.reproduction.stateDescriptions.activePregnancy')
        };
      case 'servicio_fallido':
        return {
          icon: XCircle,
          label: t('profile.reproduction.states.failedService'),
          variant: 'destructive' as const,
          color: 'text-red-600',
          description: t('profile.reproduction.stateDescriptions.failedService')
        };
      case 'ia_fallida':
        return {
          icon: XCircle,
          label: t('profile.reproduction.states.failedAI'),
          variant: 'destructive' as const,
          color: 'text-red-600',
          description: t('profile.reproduction.stateDescriptions.failedAI')
        };
      case 'preñez_exitosa_servicio':
        return {
          icon: CheckCircle,
          label: t('profile.reproduction.states.successfulPregnancyService'),
          variant: 'default' as const,
          color: 'text-green-700',
          description: t('profile.reproduction.stateDescriptions.successfulPregnancyService')
        };
      case 'preñez_exitosa_ia':
        return {
          icon: CheckCircle,
          label: t('profile.reproduction.states.successfulPregnancyAI'),
          variant: 'default' as const,
          color: 'text-green-700',
          description: t('profile.reproduction.stateDescriptions.successfulPregnancyAI')
        };
      case 'preñez_exitosa':
        return {
          icon: CheckCircle,
          label: t('profile.reproduction.states.successfulPregnancy'),
          variant: 'default' as const,
          color: 'text-green-700',
          description: t('profile.reproduction.stateDescriptions.successfulPregnancy')
        };
      case 'preñez_perdida':
        return {
          icon: AlertTriangle,
          label: t('profile.reproduction.states.lostPregnancy'),
          variant: 'destructive' as const,
          color: 'text-red-600',
          description: t('profile.reproduction.stateDescriptions.lostPregnancy')
        };
      case 'post_parto':
        return {
          icon: Baby,
          label: t('profile.reproduction.states.postpartum'),
          variant: 'default' as const,
          color: 'text-blue-600',
          description: t('profile.reproduction.stateDescriptions.postpartum')
        };
      default:
        return {
          icon: Clock,
          label: estado,
          variant: 'outline' as const,
          color: 'text-muted-foreground',
          description: t('profile.reproduction.stateDescriptions.unknown')
        };
    }
  };

  const stateInfo = getStateInfo(state);
  const Icon = stateInfo.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className={`h-4 w-4 ${stateInfo.color}`} />
          {t('profile.reproduction.reproductiveStatus')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div>
            <Badge variant={stateInfo.variant} className="mb-1">
              {stateInfo.label}
            </Badge>
            <p className="text-xs text-muted-foreground">
              {stateInfo.description}
            </p>
          </div>
          
          {serviceType && (
            <div className="text-xs">
              <span className="font-medium">{t('profile.reproduction.type')}: </span>
              <span className="text-muted-foreground">{serviceType}</span>
            </div>
          )}
          
          {lastUpdate && (
            <div className="text-xs flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span className="font-medium">{t('profile.reproduction.lastUpdate')}: </span>
              <span className="text-muted-foreground">
                {format(new Date(lastUpdate), 'dd/MM/yyyy', { locale: es })}
              </span>
            </div>
          )}
          
          {expectedDate && (
            <div className="text-xs flex items-center gap-1">
              <Heart className="h-3 w-3" />
              <span className="font-medium">{t('profile.reproduction.expectedDate')}: </span>
              <span className="text-muted-foreground">
                {format(new Date(expectedDate), 'dd/MM/yyyy', { locale: es })}
              </span>
            </div>
          )}
          
          {notes && (
            <div className="text-xs">
              <span className="font-medium">{t('profile.reproduction.notes')}: </span>
              <span className="text-muted-foreground">{notes}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}