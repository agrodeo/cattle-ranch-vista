import { Animal } from "@/types/animal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AnimalGenealogiaProps {
  animal: Animal;
  onAnimalUpdate: (animal: Animal) => void;
}

export function AnimalGenealogia({ animal }: AnimalGenealogiaProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Genealogía</CardTitle>
        <CardDescription>Árbol genealógico del animal</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Componente en desarrollo...</p>
      </CardContent>
    </Card>
  );
}