import { Animal } from "@/types/animal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AnimalFinanzasProps {
  animal: Animal;
  onAnimalUpdate: (animal: Animal) => void;
}

export function AnimalFinanzas({ animal }: AnimalFinanzasProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Finanzas</CardTitle>
        <CardDescription>Costos y datos financieros del animal</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Componente en desarrollo...</p>
      </CardContent>
    </Card>
  );
}