import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Calendar, Heart, Syringe, Scale, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ActivityStats {
  totalActivities: number;
  thisMonth: number;
  inseminations: number;
  pregnancies: number;
  vaccinations: number;
  weighings: number;
}

export function ActivitiesStats() {
  const [stats, setStats] = useState<ActivityStats>({
    totalActivities: 0,
    thisMonth: 0,
    inseminations: 0,
    pregnancies: 0,
    vaccinations: 0,
    weighings: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", currentUser?.id)
        .single();

      if (!userData?.cabaña_id) return;

      // Fetch AI stats
      const { data: aiData } = await supabase
        .from("artificial_inseminations")
        .select("*")
        .eq("cabaña_id", userData.cabaña_id);

      // Count pregnancies
      const pregnancies = aiData?.filter(record => record.is_pregnant === true).length || 0;

      // Calculate this month's activities
      const currentMonth = new Date();
      const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      
      const thisMonthAI = aiData?.filter(record => 
        new Date(record.insemination_date) >= firstDayOfMonth
      ).length || 0;

      setStats({
        totalActivities: (aiData?.length || 0),
        thisMonth: thisMonthAI,
        inseminations: aiData?.length || 0,
        pregnancies,
        vaccinations: 0, // TODO: Implement when vaccination table exists
        weighings: 0, // TODO: Implement when weighing table exists
      });
    } catch (error) {
      console.error("Error fetching activity stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Cargando estadísticas...</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Actividades</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalActivities}</div>
          <p className="text-xs text-muted-foreground">
            Registros históricos
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.thisMonth}</div>
          <p className="text-xs text-muted-foreground">
            Actividades nuevas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Inseminaciones</CardTitle>
          <Heart className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.inseminations}</div>
          <p className="text-xs text-muted-foreground">
            Servicios totales
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Preñeces</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pregnancies}</div>
          <p className="text-xs text-muted-foreground">
            Confirmadas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vacunaciones</CardTitle>
          <Syringe className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.vaccinations}</div>
          <p className="text-xs text-muted-foreground">
            Próximamente
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pesajes</CardTitle>
          <Scale className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.weighings}</div>
          <p className="text-xs text-muted-foreground">
            Próximamente
          </p>
        </CardContent>
      </Card>
    </div>
  );
}