import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Syringe, Weight, Heart, Activity, AlertTriangle, Stethoscope, Baby, HeartPulse, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NewVaccinationDialog } from "@/components/activities/NewVaccinationDialog";
import { WeighingFlowDialog } from "@/components/activities/WeighingFlowDialog";
import { NewInseminationDialog } from "@/components/activities/NewInseminationDialog";
import { NewGeneralActivityDialog } from "@/components/activities/NewGeneralActivityDialog";
import { NewPregnancyLossDialog } from "@/components/activities/NewPregnancyLossDialog";
import { NewTactoDialog } from "@/components/activities/NewTactoDialog";
import { CalvingRegistrationManager } from "@/components/activities/CalvingRegistrationManager";
import { TaskCreationFlow } from "./TaskCreationFlow";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ActivityCreationFlowProps {
  onClose: () => void;
}

type ActivityType = "vaccination" | "weighing" | "insemination" | "general" | "pregnancy_loss" | "tacto" | "calving" | "task";

export function ActivityCreationFlow({ onClose }: ActivityCreationFlowProps) {
  const { t } = useTranslation('activities');
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [showReproductive, setShowReproductive] = useState(false);

  const mainActivities = [
    {
      id: "vaccination" as const,
      title: t('activityCreation.vaccination.title'),
      description: t('activityCreation.vaccination.description'),
      icon: Syringe,
      color: "bg-red-500",
    },
    {
      id: "weighing" as const,
      title: t('activityCreation.weighing.title'),
      description: t('activityCreation.weighing.description'),
      icon: Weight,
      color: "bg-blue-500",
    },
    {
      id: "reproductive" as const,
      title: t('activityCreation.reproductive.title'),
      description: t('activityCreation.reproductive.description'),
      icon: HeartPulse,
      color: "bg-pink-500",
    },
    {
      id: "general" as const,
      title: t('activityCreation.general.title'),
      description: t('activityCreation.general.description'),
      icon: Activity,
      color: "bg-primary",
    },
    {
      id: "task" as const,
      title: t('activityCreation.task.title'),
      description: t('activityCreation.task.description'),
      icon: ClipboardList,
      color: "bg-emerald-500",
    },
  ];

  const reproductiveActivities: Array<{id: string; title: string; description: string; icon: typeof Heart; color: string}> = [
    {
      id: "insemination",
      title: t('activityCreation.insemination.title'),
      description: t('activityCreation.insemination.description'),
      icon: Heart,
      color: "bg-pink-500",
    },
    {
      id: "calving",
      title: t('activityCreation.calving.title'),
      description: t('activityCreation.calving.description'),
      icon: Baby,
      color: "bg-green-600",
    },
    {
      id: "tacto",
      title: t('activityCreation.tacto.title'),
      description: t('activityCreation.tacto.description'),
      icon: Stethoscope,
      color: "bg-purple-500",
    },
    {
      id: "pregnancy_loss",
      title: t('activityCreation.pregnancyLoss.title'),
      description: t('activityCreation.pregnancyLoss.description'),
      icon: AlertTriangle,
      color: "bg-orange-500",
    },
  ];

  const handleMainSelect = (id: string) => {
    if (id === "reproductive") {
      setShowReproductive(true);
    } else {
      setSelectedActivity(id as ActivityType);
    }
  };

  const handleDialogOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedActivity(null);
    }
  };

  const handleSuccess = () => {
    setSelectedActivity(null);
    onClose();
  };

  const handleBackFromReproductive = () => {
    setShowReproductive(false);
  };

  // Full-screen calving flow
  if (selectedActivity === "calving") {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <div className="flex items-center p-4 border-b border-border shrink-0">
          <Button variant="ghost" size="icon" onClick={() => handleDialogOpenChange(false)} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">{t('activityCreation.calving.title')}</h1>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4">
            <CalvingRegistrationManager isCompact onSuccess={handleSuccess} />
          </div>
        </ScrollArea>
      </div>
    );
  }

  const renderCards = (items: Array<{id: string; title: string; description: string; icon: React.ComponentType<{className?: string}>; color: string}>, onSelect: (id: string) => void) => (
    <>
      {items.map((item) => (
        <Card
          key={item.id}
          className="cursor-pointer border-2 hover:border-primary/50 transition-colors"
          onClick={() => onSelect(item.id)}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg text-white ${item.color}`}>
                <item.icon className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      ))}
    </>
  );

  const currentTitle = showReproductive
    ? t('activityCreation.reproductive.title')
    : t('activityCreation.title');

  const handleBack = showReproductive ? handleBackFromReproductive : onClose;

  const currentCards = showReproductive
    ? renderCards(reproductiveActivities, (id) => setSelectedActivity(id as ActivityType))
    : renderCards(mainActivities, handleMainSelect);

  return (
    <>
      {/* Mobile view - Full screen */}
      <div className="fixed inset-0 z-50 bg-background lg:hidden">
        <div className="flex items-center p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">{currentTitle}</h1>
        </div>
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {currentCards}
        </div>
      </div>

      {/* Desktop view - Modal overlay */}
      <div className="hidden lg:block fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background rounded-lg shadow-xl">
          <div className="flex items-center p-6 border-b border-border">
            <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">{currentTitle}</h1>
          </div>
          <div className="p-6 space-y-4">
            {currentCards}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <NewVaccinationDialog
        open={selectedActivity === "vaccination"}
        onOpenChange={handleDialogOpenChange}
        onSuccess={handleSuccess}
      />
      <WeighingFlowDialog
        open={selectedActivity === "weighing"}
        onOpenChange={handleDialogOpenChange}
        onSuccess={handleSuccess}
      />
      <NewInseminationDialog
        open={selectedActivity === "insemination"}
        onOpenChange={handleDialogOpenChange}
        onSuccess={handleSuccess}
      />
      <NewGeneralActivityDialog
        open={selectedActivity === "general"}
        onOpenChange={handleDialogOpenChange}
        onSuccess={handleSuccess}
      />
      <NewTactoDialog
        open={selectedActivity === "tacto"}
        onOpenChange={handleDialogOpenChange}
        onSuccess={handleSuccess}
      />
      <NewPregnancyLossDialog
        open={selectedActivity === "pregnancy_loss"}
        onOpenChange={handleDialogOpenChange}
        onSuccess={handleSuccess}
      />
    </>
  );
}
