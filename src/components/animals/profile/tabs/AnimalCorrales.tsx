import { Animal } from "@/types/animal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AnimalCorralesProps {
  animal: Animal;
  onAnimalUpdate: (animal: Animal) => void;
}

export function AnimalCorrales({ animal }: AnimalCorralesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Corrales</CardTitle>
        <CardDescription>Historial de corrales y movimientos</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Componente en desarrollo...</p>
      </CardContent>
    </Card>
  );
}