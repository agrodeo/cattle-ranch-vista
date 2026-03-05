import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Move, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateCorralDialog } from "@/components/corrales/CreateCorralDialog";
import { AnimalMoveTypeSelector } from "@/components/corrales/AnimalMoveTypeSelector";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

interface CorralCreationFlowProps {
  onClose: () => void;
}

type CorralAction = "create" | "move";

export function CorralCreationFlow({ onClose }: CorralCreationFlowProps) {
  const { t } = useTranslation(['corrals']);
  const [selectedAction, setSelectedAction] = useState<CorralAction | null>(null);
  const { currentUser } = useSupabaseAuth();

  const corralActions = [
    {
      id: "create" as CorralAction,
      title: t('corrals:actions.create'),
      description: t('corrals:dialogs.create.title'),
      icon: Plus,
      color: "bg-blue-500",
    },
    {
      id: "move" as CorralAction,
      title: t('corrals:actions.moveAnimals'),
      description: t('corrals:mobile.moveAnimalsBetween'),
      icon: Move,
      color: "bg-orange-500",
    },
  ];

  const handleActionSelect = (actionId: CorralAction) => {
    setSelectedAction(actionId);
  };

  const handleDialogClose = () => {
    setSelectedAction(null);
  };

  const handleSuccess = () => {
    setSelectedAction(null);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background lg:hidden">
        <div className="flex items-center p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={onClose} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">{t('corrals:title')}</h1>
        </div>

        <div className="flex-1 p-4 space-y-4">
          {corralActions.map((action) => (
            <Card
              key={action.id}
              className="cursor-pointer border-2 hover:border-primary/50 transition-colors"
              onClick={() => handleActionSelect(action.id)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg text-white ${action.color}`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      <CreateCorralDialog
        open={selectedAction === "create"}
        onOpenChange={handleDialogClose}
        onSuccess={handleSuccess}
      />
      
      <AnimalMoveTypeSelector
        isOpen={selectedAction === "move"}
        onClose={handleDialogClose}
        cabanaId={currentUser?.cabañaId || ""}
      />
    </>
  );
}
