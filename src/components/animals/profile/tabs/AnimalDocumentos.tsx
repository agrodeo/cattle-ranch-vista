import { Animal } from "@/types/animal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AnimalDocumentosProps {
  animal: Animal;
  onAnimalUpdate: (animal: Animal) => void;
}

export function AnimalDocumentos({ animal }: AnimalDocumentosProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos & Fotos</CardTitle>
        <CardDescription>Archivos y documentos del animal</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Componente en desarrollo...</p>
      </CardContent>
    </Card>
  );
}