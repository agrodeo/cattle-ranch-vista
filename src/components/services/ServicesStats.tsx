import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Calendar, TrendingUp, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";

interface ServicesStats {
  totalServices: number;
  pendingResults: number;
  pregnantAnimals: number;
  successRate: number;
}

export function ServicesStats() {
  const [stats, setStats] = useState<ServicesStats>({
    totalServices: 0,
    pendingResults: 0,
    pregnantAnimals: 0,
    successRate: 0,
  });
  const [loading, setLoading] = useState(true);

  const { currentUser } = useSimpleAuth();

  useEffect(() => {
    if (currentUser?.cabañaId) {
      fetchStats();
    }
  }, [currentUser?.cabañaId]);

  const fetchStats = async () => {
    if (!currentUser?.cabañaId) return;

    setLoading(true);
    try {
      // Get all services
      const { data: services, error } = await supabase
        .from("services")
        .select("outcome");

      if (error) throw error;

      const totalServices = services?.length || 0;
      const pendingResults = services?.filter(s => !s.outcome)?.length || 0;
      const pregnantAnimals = services?.filter(s => 
        s.outcome?.toLowerCase() === "preñada" || s.outcome?.toLowerCase() === "pregnant"
      )?.length || 0;
      
      const servicesWithResults = totalServices - pendingResults;
      const successRate = servicesWithResults > 0 ? (pregnantAnimals / servicesWithResults) * 100 : 0;

      setStats({
        totalServices,
        pendingResults,
        pregnantAnimals,
        successRate: Math.round(successRate * 100) / 100,
      });
    } catch (error) {
      console.error("Error fetching services stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Servicios",
      value: stats.totalServices,
      icon: Heart,
      color: "text-blue-500",
    },
    {
      title: "Resultados Pendientes",
      value: stats.pendingResults,
      icon: Calendar,
      color: "text-orange-500",
    },
    {
      title: "Animales Preñados",
      value: stats.pregnantAnimals,
      icon: Activity,
      color: "text-green-500",
    },
    {
      title: "Tasa de Éxito",
      value: `${stats.successRate}%`,
      icon: TrendingUp,
      color: "text-purple-500",
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 bg-muted animate-pulse rounded"></div>
              </CardTitle>
              <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}