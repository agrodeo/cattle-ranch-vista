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
  
  const getStateInfo = (estado: string) => {
    switch (estado) {
      case 'sin_actividad':
        return {
          icon: Clock,
          label: 'Sin Actividad',
          variant: 'secondary' as const,
          color: 'text-muted-foreground',
          description: 'Sin servicios registrados'
        };
      case 'servicio_pendiente':
        return {
          icon: Clock,
          label: 'Servicio Pendiente',
          variant: 'default' as const,
          color: 'text-blue-600',
          description: 'Esperando confirmación de preñez'
        };
      case 'ia_pendiente':
        return {
          icon: Clock,
          label: 'IA Pendiente',
          variant: 'default' as const,
          color: 'text-purple-600',
          description: 'Inseminación artificial esperando confirmación'
        };
      case 'preñez_servicio':
        return {
          icon: Heart,
          label: 'Preñada por Servicio',
          variant: 'default' as const,
          color: 'text-green-600',
          description: 'Preñez confirmada por servicio natural'
        };
      case 'preñez_ia':
        return {
          icon: Heart,
          label: 'Preñada por IA',
          variant: 'default' as const,
          color: 'text-green-600',
          description: 'Preñez confirmada por inseminación artificial'
        };
      case 'preñez_activa':
        return {
          icon: Heart,
          label: 'Preñez Activa',
          variant: 'default' as const,
          color: 'text-green-600',
          description: 'Preñez confirmada sin origen específico'
        };
      case 'servicio_fallido':
        return {
          icon: XCircle,
          label: 'Servicio Fallido',
          variant: 'destructive' as const,
          color: 'text-red-600',
          description: 'Servicio no resultó en preñez'
        };
      case 'ia_fallida':
        return {
          icon: XCircle,
          label: 'IA Fallida',
          variant: 'destructive' as const,
          color: 'text-red-600',
          description: 'Inseminación artificial no resultó en preñez'
        };
      case 'preñez_exitosa_servicio':
        return {
          icon: CheckCircle,
          label: 'Preñez Exitosa (Servicio)',
          variant: 'default' as const,
          color: 'text-green-700',
          description: 'Parto exitoso de servicio natural'
        };
      case 'preñez_exitosa_ia':
        return {
          icon: CheckCircle,
          label: 'Preñez Exitosa (IA)',
          variant: 'default' as const,
          color: 'text-green-700',
          description: 'Parto exitoso de inseminación artificial'
        };
      case 'preñez_exitosa':
        return {
          icon: CheckCircle,
          label: 'Preñez Exitosa',
          variant: 'default' as const,
          color: 'text-green-700',
          description: 'Parto exitoso'
        };
      case 'preñez_perdida':
        return {
          icon: AlertTriangle,
          label: 'Preñez Perdida',
          variant: 'destructive' as const,
          color: 'text-red-600',
          description: 'Preñez terminada sin parto exitoso'
        };
      case 'post_parto':
        return {
          icon: Baby,
          label: 'Post Parto',
          variant: 'default' as const,
          color: 'text-blue-600',
          description: 'Recuperándose del parto'
        };
      default:
        return {
          icon: Clock,
          label: estado,
          variant: 'outline' as const,
          color: 'text-muted-foreground',
          description: 'Estado desconocido'
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
          Estado Reproductivo
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
              <span className="font-medium">Tipo: </span>
              <span className="text-muted-foreground">{serviceType}</span>
            </div>
          )}
          
          {lastUpdate && (
            <div className="text-xs flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span className="font-medium">Última actualización: </span>
              <span className="text-muted-foreground">
                {format(new Date(lastUpdate), 'dd/MM/yyyy', { locale: es })}
              </span>
            </div>
          )}
          
          {expectedDate && (
            <div className="text-xs flex items-center gap-1">
              <Heart className="h-3 w-3" />
              <span className="font-medium">Fecha esperada: </span>
              <span className="text-muted-foreground">
                {format(new Date(expectedDate), 'dd/MM/yyyy', { locale: es })}
              </span>
            </div>
          )}
          
          {notes && (
            <div className="text-xs">
              <span className="font-medium">Notas: </span>
              <span className="text-muted-foreground">{notes}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}