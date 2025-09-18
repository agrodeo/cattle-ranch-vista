import { useState } from "react";
import { ArrowLeft, Syringe, Weight, Heart, Activity, AlertTriangle, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NewVaccinationDialog } from "@/components/activities/NewVaccinationDialog";
import { NewWeighingDialog } from "@/components/activities/NewWeighingDialog";
import { NewInseminationDialog } from "@/components/activities/NewInseminationDialog";
import { NewGeneralActivityDialog } from "@/components/activities/NewGeneralActivityDialog";
import { NewPregnancyLossDialog } from "@/components/activities/NewPregnancyLossDialog";
import { NewTactoDialog } from "@/components/activities/NewTactoDialog";

interface ActivityCreationFlowProps {
  onClose: () => void;
}

type ActivityType = "vaccination" | "weighing" | "insemination" | "general" | "pregnancy_loss" | "tacto";

export function ActivityCreationFlow({ onClose }: ActivityCreationFlowProps) {
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);

  const activities = [
    {
      id: "vaccination" as ActivityType,
      title: "Vacunación",
      description: "Registrar aplicación de vacunas",
      icon: Syringe,
      color: "bg-red-500",
    },
    {
      id: "weighing" as ActivityType,
      title: "Pesaje",
      description: "Registrar peso de animales",
      icon: Weight,
      color: "bg-blue-500",
    },
    {
      id: "insemination" as ActivityType,
      title: "Inseminación Artificial",
      description: "Registrar servicios de IA",
      icon: Heart,
      color: "bg-pink-500",
    },
    {
      id: "general" as ActivityType,
      title: "Actividad General",
      description: "Otras actividades de manejo",
      icon: Activity,
      color: "bg-green-500",
    },
    {
      id: "tacto" as ActivityType,
      title: "Tacto/Detección",
      description: "Detectar preñeces",
      icon: Stethoscope,
      color: "bg-purple-500",
    },
    {
      id: "pregnancy_loss" as ActivityType,
      title: "Pérdida de Preñez",
      description: "Registrar pérdidas reproductivas",
      icon: AlertTriangle,
      color: "bg-orange-500",
    },
  ];

  const handleActivitySelect = (activityId: ActivityType) => {
    setSelectedActivity(activityId);
  };

  const handleDialogClose = () => {
    setSelectedActivity(null);
  };

  const handleSuccess = () => {
    setSelectedActivity(null);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background lg:hidden">
        {/* Header */}
        <div className="flex items-center p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={onClose} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Cargar Actividad</h1>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 space-y-4">
          {activities.map((activity) => (
            <Card
              key={activity.id}
              className="cursor-pointer border-2 hover:border-primary/50 transition-colors"
              onClick={() => handleActivitySelect(activity.id)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg text-white ${activity.color}`}>
                    <activity.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>{activity.title}</CardTitle>
                    <CardDescription>{activity.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Dialogs */}
      <NewVaccinationDialog
        open={selectedActivity === "vaccination"}
        onOpenChange={handleDialogClose}
        onSuccess={handleSuccess}
      />
      
      <NewWeighingDialog
        open={selectedActivity === "weighing"}
        onOpenChange={handleDialogClose}
        onSuccess={handleSuccess}
      />
      
      <NewInseminationDialog
        onSuccess={handleSuccess}
      />
      
      <NewGeneralActivityDialog
        open={selectedActivity === "general"}
        onOpenChange={handleDialogClose}
        onSuccess={handleSuccess}
      />
      
      <NewTactoDialog
        open={selectedActivity === "tacto"}
        onOpenChange={handleDialogClose}
        onSuccess={handleSuccess}
      />
      
      <NewPregnancyLossDialog
        open={selectedActivity === "pregnancy_loss"}
        onOpenChange={handleDialogClose}
        onSuccess={handleSuccess}
      />
    </>
  );
}