import { useState } from "react";
import { ArrowLeft, Filter, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BulkMoveDialog } from "@/components/breeding/BulkMoveDialog";
import { MoveAnimalDialog } from "@/components/corrales/MoveAnimalDialog";

interface AnimalMoveTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  cabanaId: string;
}

type MoveType = "bulk" | "manual";

export function AnimalMoveTypeSelector({ isOpen, onClose, cabanaId }: AnimalMoveTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<MoveType | null>(null);

  const moveTypes = [
    {
      id: "bulk" as MoveType,
      title: "Movimiento Masivo",
      description: "Mover animales usando filtros automáticos y selección específica",
      icon: Filter,
      color: "bg-orange-500",
    },
    {
      id: "manual" as MoveType,
      title: "Movimiento Manual",
      description: "Seleccionar animales individualmente para mover",
      icon: Users,
      color: "bg-blue-500",
    },
  ];

  const handleTypeSelect = (typeId: MoveType) => {
    setSelectedType(typeId);
  };

  const handleDialogClose = () => {
    setSelectedType(null);
  };

  const handleSuccess = () => {
    setSelectedType(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background lg:hidden">
        {/* Header */}
        <div className="flex items-center p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={onClose} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Tipo de Movimiento</h1>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 space-y-4">
          {moveTypes.map((type) => (
            <Card
              key={type.id}
              className="cursor-pointer border-2 hover:border-primary/50 transition-colors"
              onClick={() => handleTypeSelect(type.id)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg text-white ${type.color}`}>
                    <type.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>{type.title}</CardTitle>
                    <CardDescription>{type.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Dialogs */}
      <BulkMoveDialog
        isOpen={selectedType === "bulk"}
        onClose={handleDialogClose}
        cabanaId={cabanaId}
      />
      
      <MoveAnimalDialog
        open={selectedType === "manual"}
        onOpenChange={handleDialogClose}
        onSuccess={handleSuccess}
      />
    </>
  );
}