import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateActivityTask } from "@/hooks/useActivityTasks";
import { TaskForm } from "@/components/activities/TaskForm";

interface TaskCreationFlowProps {
  onClose: () => void;
}

export function TaskCreationFlow({ onClose }: TaskCreationFlowProps) {
  const { t } = useTranslation("activities");
  const createActivity = useCreateActivityTask();
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (data: Parameters<typeof createActivity.mutate>[0]) => {
    createActivity.mutate(data, {
      onSuccess: () => {
        setIsSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1200);
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col lg:hidden">
      <div className="flex items-center p-4 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" onClick={onClose} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">{t("create.button")}</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-medium text-foreground">{t("create.success")}</p>
          </div>
        ) : (
          <TaskForm onSubmit={handleSubmit} isSubmitting={createActivity.isPending} />
        )}
      </div>
    </div>
  );
}
