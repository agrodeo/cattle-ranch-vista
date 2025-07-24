import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Crown, Zap } from "lucide-react";

interface ReadOnlyModeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgrade: () => void;
}

export const ReadOnlyModeModal = ({ open, onOpenChange, onUpgrade }: ReadOnlyModeModalProps) => {
  const handleUpgrade = () => {
    onOpenChange(false);
    onUpgrade();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-orange-100">
            <Lock className="h-8 w-8 text-orange-600" />
          </div>
          <DialogTitle className="text-xl">Prueba gratuita finalizada</DialogTitle>
          <DialogDescription>
            Tu prueba gratuita de 30 días ha expirado. Actualiza tu plan para continuar agregando y editando datos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-center">¿Qué puedes hacer ahora?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-green-100">
                  <span className="text-green-600 text-sm">✓</span>
                </div>
                <span className="text-sm">Ver todos tus datos existentes</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-green-100">
                  <span className="text-green-600 text-sm">✓</span>
                </div>
                <span className="text-sm">Generar reportes de solo lectura</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-red-100">
                  <span className="text-red-600 text-sm">✗</span>
                </div>
                <span className="text-sm">Agregar nuevos animales</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-red-100">
                  <span className="text-red-600 text-sm">✗</span>
                </div>
                <span className="text-sm">Editar información existente</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card className="text-center">
              <CardContent className="p-4">
                <Zap className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <CardTitle className="text-sm">Plan Productor</CardTitle>
                <CardDescription className="text-xs">Más popular</CardDescription>
                <p className="text-lg font-bold mt-1">$8,900/mes</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="p-4">
                <Crown className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <CardTitle className="text-sm">Plan Cabaña</CardTitle>
                <CardDescription className="text-xs">Para grandes productores</CardDescription>
                <p className="text-lg font-bold mt-1">$29,900/mes</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Continuar en modo lectura
            </Button>
            <Button onClick={handleUpgrade} className="flex-1">
              Ver todos los planes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};