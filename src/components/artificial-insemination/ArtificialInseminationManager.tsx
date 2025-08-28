import { Card, CardContent } from "@/components/ui/card";
import { Heart } from "lucide-react";

export function ArtificialInseminationManager() {

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <Heart className="h-12 w-12 text-red-500 mx-auto" />
          <div>
            <h4 className="text-lg font-medium">Sistema de IA</h4>
            <p className="text-muted-foreground">
              Registro de servicios con hembras elegibles ≥15 meses, gestión de toros y seguimiento de preñeces
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
