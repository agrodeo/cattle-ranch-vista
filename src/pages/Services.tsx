import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServicesManager } from "@/components/services/ServicesManager";
import { ServicesTable } from "@/components/services/ServicesTable";
import { ServicesStats } from "@/components/services/ServicesStats";
import { Heart, Calendar, TrendingUp } from "lucide-react";

const Services = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleServiceAdded = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Servicios</h1>
          <p className="text-muted-foreground">
            Gestión de servicios naturales y registros reproductivos
          </p>
        </div>
      </div>

      <ServicesStats key={refreshKey} />

      <Tabs defaultValue="register" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="register" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Registrar Servicio
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Registrar Nuevo Servicio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ServicesManager onServiceAdded={handleServiceAdded} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Historial de Servicios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ServicesTable key={refreshKey} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Services;