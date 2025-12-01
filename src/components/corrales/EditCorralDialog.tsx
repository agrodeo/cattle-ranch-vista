import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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

interface EditCorralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  corralId: string | null;
  onSuccess: () => void;
}

export function EditCorralDialog({ open, onOpenChange, corralId, onSuccess }: EditCorralDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation(['corrals', 'common']);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    hectareas: "",
    capacity: "",
  });

  useEffect(() => {
    if (open && corralId) {
      fetchCorral();
    }
  }, [open, corralId]);

  const fetchCorral = async () => {
    if (!corralId) return;

    try {
      const { data, error } = await supabase
        .from("corrales")
        .select("name, hectareas, capacity")
        .eq("id", corralId)
        .single();

      if (error) throw error;

      setFormData({
        name: data.name || "",
        hectareas: data.hectareas?.toString() || "",
        capacity: data.capacity?.toString() || "",
      });
    } catch (error) {
      console.error("Error fetching corral:", error);
      toast({
        title: t('common:error.title'),
        description: t('corrals:dialogs.edit.loadError'),
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!corralId) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from("corrales")
        .update({
          name: formData.name,
          hectareas: formData.hectareas ? parseFloat(formData.hectareas) : null,
          capacity: formData.capacity ? parseInt(formData.capacity) : null,
        })
        .eq("id", corralId);

      if (error) throw error;

      toast({
        title: t('common:success.title'),
        description: t('corrals:dialogs.edit.successMessage'),
      });

      onSuccess();
    } catch (error) {
      console.error("Error updating corral:", error);
      toast({
        title: t('common:error.title'),
        description: t('corrals:dialogs.edit.errorMessage'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('corrals:dialogs.edit.title')}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">{t('corrals:dialogs.create.nameLabel')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('corrals:dialogs.create.namePlaceholder')}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="hectareas">{t('corrals:dialogs.create.hectaresLabel')}</Label>
              <Input
                id="hectareas"
                type="number"
                step="0.1"
                value={formData.hectareas}
                onChange={(e) => setFormData({ ...formData, hectareas: e.target.value })}
                placeholder={t('corrals:dialogs.create.hectaresPlaceholder')}
              />
            </div>
            
            <div>
              <Label htmlFor="capacity">{t('corrals:dialogs.create.capacityLabel')}</Label>
              <Input
                id="capacity"
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                placeholder={t('corrals:dialogs.create.capacityPlaceholder')}
              />
              <p className="text-xs text-muted-foreground mt-1">{t('corrals:dialogs.create.capacityHelp')}</p>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('corrals:dialogs.edit.saving') : t('corrals:dialogs.edit.saveButton')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}