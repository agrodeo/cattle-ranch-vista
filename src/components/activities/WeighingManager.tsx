import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scale, Plus, TrendingUp } from "lucide-react";
import { NewWeighingDialog } from "./NewWeighingDialog";
import { useActivities } from "@/hooks/useActivities";

export function WeighingManager() {
  const { stats, fetchStats } = useActivities();
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Gestión de Pesajes</h3>
          <p className="text-muted-foreground">
            Control de peso y rendimiento del ganado
          </p>
        </div>
        <NewWeighingDialog onSuccess={fetchStats} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peso Promedio</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0 kg</div>
            <p className="text-xs text-muted-foreground">
              Del rodeo actual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganancia Diaria</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0 kg</div>
            <p className="text-xs text-muted-foreground">
              Promedio últimos 30 días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Animales Pesados</CardTitle>
            <div className="h-4 w-4 rounded-full bg-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.weighings}</div>
            <p className="text-xs text-muted-foreground">
              Este mes
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Control de Pesajes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center py-8 text-muted-foreground">
              <Scale className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h4 className="text-lg font-medium mb-2">Sistema de Pesajes</h4>
              <p className="mb-4">
                Próximamente podrás registrar y analizar el rendimiento de peso de tu ganado
              </p>
              <div className="text-sm space-y-2">
                <p>• Registro individual y por lotes</p>
                <p>• Cálculo automático de GDP (Ganancia Diaria de Peso)</p>
                <p>• Gráficos de crecimiento</p>
                <p>• Alertas de bajo rendimiento</p>
                <p>• Exportación de datos</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}