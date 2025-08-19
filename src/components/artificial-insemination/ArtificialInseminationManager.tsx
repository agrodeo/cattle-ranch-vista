import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Plus } from "lucide-react";
import { ImprovedArtificialInseminationDialog } from "./ImprovedArtificialInseminationDialog";

export function ArtificialInseminationManager() {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Inseminación Artificial Mejorada
          </h3>
          <p className="text-muted-foreground">
            Sistema completo de registro de servicios reproductivos con gestión de preñeces
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Servicio IA
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <Heart className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h4 className="text-lg font-medium">Sistema Mejorado de IA</h4>
              <p className="text-muted-foreground">
                Registro de servicios con hembras elegibles ≥15 meses, gestión de toros y seguimiento de preñeces
              </p>
            </div>
            <Button onClick={() => setShowDialog(true)} size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Crear Nuevo Servicio
            </Button>
          </div>
        </CardContent>
      </Card>

      <ImprovedArtificialInseminationDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onSuccess={() => {
          // Refresh data or show success message
        }}
      />
    </div>
  );
}
