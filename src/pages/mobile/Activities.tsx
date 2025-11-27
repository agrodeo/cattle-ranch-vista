import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { MobilePageHeader } from "@/components/mobile/MobilePageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Filter, Search, Clock, User, MapPin, Syringe, Heart, Scale, Activity as ActivityIcon } from "lucide-react";
import { formatDate } from "@/lib/format";

interface ActivityRecord {
  id: string;
  fecha: string;
  tipo: string;
  animal_id: string;
  animal_name?: string;
  animal_id_tag: string;
  corral_name?: string;
  user_name?: string;
  observaciones?: string;
  vacuna?: string;
  peso?: number;
  resultado?: string;
}

export function MobileActivities() {
  const { t } = useTranslation(['activities', 'common']);
  const { currentUser } = useSupabaseAuth();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      // This would be replaced with actual query joining activities with animals, corrals, etc.
      const { data, error } = await supabase
        .from("activities")
        .select(`
          id,
          date,
          type,
          animal_id,
          description,
          animals!inner(id_tag, name),
          users(name)
        `)
        .order("fecha", { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Transform data to match our interface
      const transformedData: ActivityRecord[] = (data || []).map(item => ({
        id: item.id,
        fecha: item.date,
        tipo: item.type,
        animal_id: item.animal_id,
        animal_name: item.animals?.name,
        animal_id_tag: item.animals?.id_tag || '',
        corral_name: '',
        user_name: '',
        observaciones: item.description,
      }));

      setActivities(transformedData);
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'vacunacion':
        return Syringe;
      case 'inseminacion':
      case 'servicio':
        return Heart;
      case 'peso':
      case 'pesaje':
        return Scale;
      default:
        return ActivityIcon;
    }
  };

  const getActivityColor = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'vacunacion':
        return 'bg-green-100 text-green-700';
      case 'inseminacion':
      case 'servicio':
        return 'bg-pink-100 text-pink-700';
      case 'peso':
      case 'pesaje':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.animal_id_tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (activity.animal_name && activity.animal_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         activity.tipo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || activity.tipo === typeFilter;
    
    let matchesDate = true;
    if (dateFilter !== "all") {
      const activityDate = new Date(activity.fecha);
      const today = new Date();
      
      switch (dateFilter) {
        case "today":
          matchesDate = activityDate.toDateString() === today.toDateString();
          break;
        case "week":
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = activityDate >= weekAgo;
          break;
        case "month":
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = activityDate >= monthAgo;
          break;
      }
    }
    
    return matchesSearch && matchesType && matchesDate;
  });

  const uniqueTypes = [...new Set(activities.map(a => a.tipo).filter(Boolean))];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MobilePageHeader title={t('activities:title', 'Actividades')} />
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MobilePageHeader 
        title={t('activities:title')}
        subtitle={`${filteredActivities.length} ${filteredActivities.length === 1 ? t('activities:mobile.activity') : t('activities:mobile.activities')}`}
      />

      {/* Search and Filters */}
      <div className="p-4 space-y-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('activities:mobile.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('activities:mobile.allTypes')}</SelectItem>
              {uniqueTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Fecha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('activities:mobile.allDates')}</SelectItem>
              <SelectItem value="today">{t('activities:mobile.today')}</SelectItem>
              <SelectItem value="week">{t('activities:mobile.lastWeek')}</SelectItem>
              <SelectItem value="month">{t('activities:mobile.lastMonth')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Activities Timeline */}
      <div className="p-4">
        {filteredActivities.length === 0 ? (
          <EmptyState
            icon={<Clock className="h-12 w-12" />}
            title={t('activities:mobile.noActivities')}
            description={t('activities:mobile.noActivitiesMessage')}
          />
        ) : (
          <div className="space-y-3">
            {filteredActivities.map((activity) => {
              const ActivityIcon = getActivityIcon(activity.tipo);
              
              return (
                <Card key={activity.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getActivityColor(activity.tipo)}`}>
                          <ActivityIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-medium">
                            {activity.tipo}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-medium text-foreground">
                              {activity.animal_name 
                                ? `${activity.animal_name} – ${activity.animal_id_tag}` 
                                : activity.animal_id_tag}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {formatDate(activity.fecha)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {activity.corral_name && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{activity.corral_name}</span>
                          </div>
                        )}
                        {activity.user_name && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{activity.user_name}</span>
                          </div>
                        )}
                      </div>
                      {activity.observaciones && (
                        <p className="text-sm text-muted-foreground">
                          {activity.observaciones}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}