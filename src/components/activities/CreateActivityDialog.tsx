import { useState } from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCreateActivityTask } from "@/hooks/useActivityTasks";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TaskForm } from "./TaskForm";

interface CreateActivityDialogProps {
  defaultAnimalId?: string;
  defaultAnimalTag?: string;
}

export function CreateActivityDialog({ defaultAnimalId, defaultAnimalTag }: CreateActivityDialogProps) {
  const { t } = useTranslation("activities");
  const [open, setOpen] = useState(false);
  const createActivity = useCreateActivityTask();

  const handleSubmit = (data: Parameters<typeof createActivity.mutate>[0]) => {
    createActivity.mutate(data, {
      onSuccess: () => {
        setOpen(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {t("create.button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("create.button")}</DialogTitle>
        </DialogHeader>
        <TaskForm
          defaultAnimalId={defaultAnimalId}
          defaultAnimalTag={defaultAnimalTag}
          onSubmit={handleSubmit}
          isSubmitting={createActivity.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
