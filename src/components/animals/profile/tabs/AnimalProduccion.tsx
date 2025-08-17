import { Animal } from "@/types/animal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AnimalProduccionProps {
  animal: Animal;
  onAnimalUpdate: (animal: Animal) => void;
}

export function AnimalProduccion({ animal }: AnimalProduccionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Producción (Pesajes)</CardTitle>
        <CardDescription>Datos de peso y ganancia diaria</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Componente en desarrollo...</p>
      </CardContent>
    </Card>
  );
}