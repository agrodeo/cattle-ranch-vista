import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Activity, DollarSign, TrendingUp } from "lucide-react";

const Dashboard = () => {
  // Mock data for now - will be replaced with real data from Supabase
  const stats = [
    {
      title: "Total de Animales",
      value: "0",
      icon: Users,
      description: "Ganado activo en el sistema",
      trend: "+0%",
    },
    {
      title: "Actividades Recientes",
      value: "0",
      icon: Activity,
      description: "Actividades registradas esta semana",
      trend: "+0%",
    },
    {
      title: "Ingresos Mensuales",
      value: "$0",
      icon: DollarSign,
      description: "Ingresos este mes",
      trend: "+0%",
    },
    {
      title: "Servicios",
      value: "0",
      icon: TrendingUp,
      description: "Servicios de reproducción completados",
      trend: "+0%",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tablero</h1>
        <Badge variant="outline">Bienvenido a AgroDeo</Badge>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Actividades Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron actividades recientes.
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Comienza por:
            </div>
            <ul className="space-y-2 text-sm">
              <li>• Agregar tu primer animal</li>
              <li>• Registrar una actividad</li>
              <li>• Anotar un servicio</li>
              <li>• Rastrear finanzas</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;