import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scale, TrendingUp, Upload, Plus } from "lucide-react";
import { useActivities } from "@/hooks/useActivities";
import { NewWeighingDialog } from "./NewWeighingDialog";
import { BulkWeighingUpload } from "./BulkWeighingUpload";

export function WeighingManager() {
  const { stats } = useActivities();
  const [showWeighingDialog, setShowWeighingDialog] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  
  return (
    <div className="space-y-6">
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
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Scale className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h4 className="text-lg font-medium mb-2">Sistema de Pesajes</h4>
            <p className="mb-4">
              Registro y análisis del rendimiento de peso de tu ganado
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => setShowWeighingDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Registrar Pesaje
              </Button>
              <Button variant="outline" onClick={() => setShowBulkUpload(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Carga Masiva
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <NewWeighingDialog
        open={showWeighingDialog}
        onOpenChange={setShowWeighingDialog}
        onSuccess={() => setShowWeighingDialog(false)}
      />

      <BulkWeighingUpload
        open={showBulkUpload}
        onOpenChange={setShowBulkUpload}
        onSuccess={() => setShowBulkUpload(false)}
      />
    </div>
  );
}