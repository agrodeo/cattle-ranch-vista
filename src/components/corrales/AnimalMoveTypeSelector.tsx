import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Filter, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BulkMoveDialog } from "@/components/breeding/BulkMoveDialog";
import { MoveAnimalDialog } from "@/components/corrales/MoveAnimalDialog";

interface AnimalMoveTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  cabanaId: string;
}

type MoveType = "bulk" | "manual";

export function AnimalMoveTypeSelector({ isOpen, onClose, cabanaId }: AnimalMoveTypeSelectorProps) {
  const { t } = useTranslation(['corrals']);
  const [selectedType, setSelectedType] = useState<MoveType | null>(null);

  const moveTypes = [
    {
      id: "bulk" as MoveType,
      title: t('corrals:move.bulkMove'),
      description: t('corrals:move.bulkMoveDesc'),
      icon: Filter,
      color: "bg-orange-500",
    },
    {
      id: "manual" as MoveType,
      title: t('corrals:move.manualMove'),
      description: t('corrals:move.manualMoveDesc'),
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
        <div className="flex items-center p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={onClose} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">{t('corrals:move.moveType')}</h1>
        </div>

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
