import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Upload } from "lucide-react";

interface WeighingMethodSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectManual: () => void;
  onSelectBulk: () => void;
}

export function WeighingMethodSelector({
  open,
  onOpenChange,
  onSelectManual,
  onSelectBulk,
}: WeighingMethodSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md h-full max-h-[100vh] lg:max-h-[90vh] lg:h-auto p-4 lg:p-6 lg:rounded-lg">
        <div className="flex flex-col h-full">
        <DialogHeader>
          <DialogTitle>Seleccionar método de registro</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={onSelectManual}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Carga Manual</CardTitle>
                  <CardDescription className="text-sm">
                    Para pocos animales
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                Selecciona animales individualmente y registra sus pesos uno por uno
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={onSelectBulk}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <Upload className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <CardTitle className="text-base">Carga Masiva</CardTitle>
                  <CardDescription className="text-sm">
                    Para muchos animales
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                Carga múltiples pesajes desde un archivo Excel o CSV
              </p>
            </CardContent>
          </Card>
        </div>

          <div className="flex justify-end mt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="h-12 lg:h-10 w-full lg:w-auto"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}