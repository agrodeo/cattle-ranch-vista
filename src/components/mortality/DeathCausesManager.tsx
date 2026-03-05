import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateDeathCauseDialog } from "./CreateDeathCauseDialog";
import { EditDeathCauseDialog } from "./EditDeathCauseDialog";

interface DeathCause {
  id: string;
  nombre: string;
  activo: boolean;
  orden: number;
}

export function DeathCausesManager() {
  const { t } = useTranslation(['mortality', 'common']);
  const [open, setOpen] = useState(false);
  const [causes, setCauses] = useState<DeathCause[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCause, setSelectedCause] = useState<DeathCause | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadDeathCauses();
    }
  }, [open]);

  const loadDeathCauses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('manage_death_causes', {
        _action: 'list'
      });

      if (error) throw error;
      setCauses((data as unknown as DeathCause[]) || []);
    } catch (error) {
      console.error('Error loading death causes:', error);
      toast({
        title: t('common:toast.error'),
        description: t('mortality:manager.errorLoad'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('mortality:manager.confirmDeactivate'))) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc('manage_death_causes', {
        _action: 'delete',
        _id: id
      });

      if (error) throw error;

      if ((data as any)?.success) {
        toast({
          title: t('common:toast.success'),
          description: (data as any).message,
        });
        loadDeathCauses();
      } else {
        throw new Error((data as any)?.error || t('common:toast.error'));
      }
    } catch (error: any) {
      console.error('Error deleting death cause:', error);
      toast({
        title: t('common:toast.error'),
        description: error.message || t('mortality:manager.errorDeactivate'),
        variant: "destructive",
      });
    }
  };

  const handleEdit = (cause: DeathCause) => {
    setSelectedCause(cause);
    setEditDialogOpen(true);
  };

  const handleSuccess = () => {
    loadDeathCauses();
    setCreateDialogOpen(false);
    setEditDialogOpen(false);
    setSelectedCause(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Settings className="h-4 w-4" />
            {t('mortality:manager.title')}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {t('mortality:manager.title')}
              <Button
                onClick={() => setCreateDialogOpen(true)}
                size="sm"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {t('common:actions.add')}
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">{t('mortality:manager.loading')}</p>
              </div>
            ) : causes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">{t('mortality:manager.noCausesConfigured')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('mortality:manager.order')}</TableHead>
                    <TableHead>{t('mortality:manager.name')}</TableHead>
                    <TableHead>{t('mortality:manager.status')}</TableHead>
                    <TableHead className="text-right">{t('mortality:manager.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {causes.map((cause) => (
                    <TableRow key={cause.id}>
                      <TableCell className="font-mono text-sm">
                        {cause.orden}
                      </TableCell>
                      <TableCell className="font-medium">
                        {cause.nombre}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cause.activo ? "default" : "secondary"}>
                          {cause.activo ? t('mortality:manager.active') : t('mortality:manager.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(cause)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(cause.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CreateDeathCauseDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleSuccess}
      />

      <EditDeathCauseDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        cause={selectedCause}
        onSuccess={handleSuccess}
      />
    </>
  );
}
