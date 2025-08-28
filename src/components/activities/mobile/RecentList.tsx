import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, User, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RecentActivity {
  id: string;
  title: string;
  type: string;
  date: Date;
  user?: string;
  location?: string;
  animalCount?: number;
  status: 'completed' | 'pending' | 'cancelled';
}

interface RecentListProps {
  activities: RecentActivity[];
  loading?: boolean;
}

export function RecentList({ activities, loading = false }: RecentListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-ink-50 animate-pulse">
            <div className="w-8 h-8 bg-ink-200 rounded-lg"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-ink-200 rounded w-3/4"></div>
              <div className="h-3 bg-ink-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-ink-500">
        <Clock className="h-12 w-12 mx-auto mb-3 text-ink-300" />
        <p className="text-sm font-medium mb-1">No hay actividades recientes</p>
        <p className="text-xs">Las actividades completadas aparecerán aquí</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-brand-100 text-brand-800';
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-ink-100 text-ink-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completada';
      case 'pending': return 'Pendiente';
      case 'cancelled': return 'Cancelada';
      default: return 'Desconocido';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'vacuna': return '💉';
      case 'inseminación': return '💝';
      case 'tacto': return '👐';
      case 'pesaje': return '⚖️';
      case 'manejo': return '🔧';
      default: return '📋';
    }
  };

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-ink-200 hover:border-brand-200 transition-colors cursor-pointer group"
        >
          {/* Type icon */}
          <div className="w-8 h-8 rounded-lg bg-ink-100 flex items-center justify-center text-sm">
            {getTypeIcon(activity.type)}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-medium text-ink-900 text-sm truncate group-hover:text-brand-700 transition-colors">
                {activity.title}
              </h4>
              <Badge 
                variant="secondary" 
                className={`text-xs shrink-0 ${getStatusColor(activity.status)}`}
              >
                {getStatusText(activity.status)}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-ink-600">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(activity.date, { 
                    addSuffix: true, 
                    locale: es 
                  })}
                </span>
              </div>
              
              {activity.user && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span className="truncate">{activity.user}</span>
                </div>
              )}
              
              {activity.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{activity.location}</span>
                </div>
              )}
            </div>
            
            {activity.animalCount && (
              <div className="mt-1">
                <span className="bg-ink-100 text-ink-700 px-2 py-0.5 rounded-full text-xs">
                  {activity.animalCount} animal{activity.animalCount !== 1 ? 'es' : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}