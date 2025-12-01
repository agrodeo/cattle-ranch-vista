import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface CreateCorralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCorralDialog({ open, onOpenChange, onSuccess }: CreateCorralDialogProps) {
  const { currentUser } = useSupabaseAuth();
  const { toast } = useToast();
  const { t } = useTranslation(['corrals', 'common']);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    hectareas: "",
    capacity: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setLoading(true);

      console.log("Debug - currentUser:", currentUser);
      console.log("Debug - currentUser.cabañaId:", currentUser.cabañaId);
      console.log("Debug - currentUser.cabañaId:", currentUser.cabañaId);

      // Use the cabañaId directly from currentUser since hybrid auth already provides it
      const cabanaId = currentUser.cabañaId;
      
      if (!cabanaId) {
        throw new Error(t('corrals:dialogs.create.noCabanaError'));
      }

      // Prepare insert data - only include user_id for Supabase auth users
      const insertData: any = {
        name: formData.name,
        hectareas: formData.hectareas ? parseFloat(formData.hectareas) : null,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        cabaña_id: cabanaId,
      };

      // Always add user_id since we're using Supabase auth
      insertData.user_id = currentUser.id;

      const { error } = await supabase
        .from("corrales")
        .insert(insertData);

      if (error) throw error;

      toast({
        title: t('common:success.title'),
        description: t('corrals:dialogs.create.successMessage'),
      });

      setFormData({ name: "", hectareas: "", capacity: "" });
      onSuccess();
    } catch (error) {
      console.error("Error creating corral:", error);
      toast({
        title: t('common:error.title'),
        description: t('corrals:dialogs.create.errorMessage'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{t('corrals:dialogs.create.title')}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">{t('corrals:dialogs.create.nameLabel')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('corrals:dialogs.create.namePlaceholder')}
                className="h-10 mt-1"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="hectareas" className="text-sm font-medium">{t('corrals:dialogs.create.hectaresLabel')}</Label>
              <Input
                id="hectareas"
                type="number"
                step="0.1"
                value={formData.hectareas}
                onChange={(e) => setFormData({ ...formData, hectareas: e.target.value })}
                placeholder={t('corrals:dialogs.create.hectaresPlaceholder')}
                className="h-10 mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="capacity" className="text-sm font-medium">{t('corrals:dialogs.create.capacityLabel')}</Label>
              <Input
                id="capacity"
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                placeholder={t('corrals:dialogs.create.capacityPlaceholder')}
                className="h-10 mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">{t('corrals:dialogs.create.capacityHelp')}</p>
            </div>
          </div>

          <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {t('common:actions.cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? t('corrals:dialogs.create.creating') : t('corrals:dialogs.create.createButton')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}