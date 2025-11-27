import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DeleteCorralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  corralId: string | null;
  corralName: string;
  animalCount: number;
  onSuccess: () => void;
}

export function DeleteCorralDialog({ 
  open, 
  onOpenChange, 
  corralId, 
  corralName, 
  animalCount,
  onSuccess 
}: DeleteCorralDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation(['corrals', 'common']);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!corralId) return;

    // Verificar que el corral esté vacío
    if (animalCount > 0) {
      toast({
        title: t('common:error.title'),
        description: t('corrals:dialogs.delete.cannotDelete', { name: corralName, count: animalCount }),
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from("corrales")
        .delete()
        .eq("id", corralId);

      if (error) throw error;

      toast({
        title: t('common:success.title'),
        description: t('corrals:dialogs.delete.successMessage', { name: corralName }),
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting corral:", error);
      toast({
        title: t('common:error.title'),
        description: t('corrals:dialogs.delete.errorMessage'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const canDelete = animalCount === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            {t('corrals:dialogs.delete.title')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!canDelete ? (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">{t('corrals:dialogs.delete.cannotDeleteTitle')}</p>
                <p className="text-sm text-yellow-700 mt-1">
                  {t('corrals:dialogs.delete.cannotDeleteMessage', { name: corralName, count: animalCount })}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">{t('corrals:dialogs.delete.confirmTitle')}</p>
                <p className="text-sm text-red-700 mt-1">
                  {t('corrals:dialogs.delete.confirmMessage', { name: corralName })}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button 
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || !canDelete}
          >
            {loading ? t('corrals:dialogs.delete.deleting') : t('corrals:dialogs.delete.deleteButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}