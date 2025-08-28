import { Calendar, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UpcomingActivity {
  id: string;
  title: string;
  type: string;
  date: string;
  location?: string;
  priority: 'high' | 'medium' | 'low';
  animalCount?: number;
}

interface UpcomingListProps {
  activities: UpcomingActivity[];
  loading?: boolean;
}

export function UpcomingList({ activities, loading = false }: UpcomingListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-ink-50 animate-pulse">
            <div className="w-10 h-10 bg-ink-200 rounded-lg"></div>
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
        <Calendar className="h-12 w-12 mx-auto mb-3 text-ink-300" />
        <p className="text-sm font-medium mb-1">No hay actividades próximas</p>
        <p className="text-xs">Las actividades programadas aparecerán aquí</p>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-brand-500';
      default: return 'bg-ink-400';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'vacuna': return 'bg-blue-100 text-blue-800';
      case 'inseminación': return 'bg-pink-100 text-pink-800';
      case 'tacto': return 'bg-purple-100 text-purple-800';
      case 'pesaje': return 'bg-green-100 text-green-800';
      default: return 'bg-ink-100 text-ink-700';
    }
  };

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-ink-200 hover:border-brand-200 transition-colors cursor-pointer group"
        >
          {/* Priority indicator */}
          <div className={`w-1 h-10 rounded-full ${getPriorityColor(activity.priority)}`} />
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-medium text-ink-900 text-sm truncate group-hover:text-brand-700 transition-colors">
                {activity.title}
              </h4>
              <Badge 
                variant="secondary" 
                className={`text-xs shrink-0 ${getTypeColor(activity.type)}`}
              >
                {activity.type}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-ink-600">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{activity.date}</span>
              </div>
              
              {activity.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{activity.location}</span>
                </div>
              )}
              
              {activity.animalCount && (
                <span className="bg-ink-100 text-ink-700 px-2 py-0.5 rounded-full">
                  {activity.animalCount} animal{activity.animalCount !== 1 ? 'es' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}