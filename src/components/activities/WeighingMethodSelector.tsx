import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Upload } from "lucide-react";

interface WeighingMethodSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectManual: () => void;
  onSelectBulk: () => void;
}

export function WeighingMethodSelector({
  open,
  onOpenChange,
  onSelectManual,
  onSelectBulk,
}: WeighingMethodSelectorProps) {
  const { t } = useTranslation('common');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('weighingMethod.title')}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={onSelectManual}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{t('weighingMethod.manual.title')}</CardTitle>
                  <CardDescription className="text-sm">
                    {t('weighingMethod.manual.subtitle')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                {t('weighingMethod.manual.description')}
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={onSelectBulk}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <Upload className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <CardTitle className="text-base">{t('weighingMethod.bulk.title')}</CardTitle>
                  <CardDescription className="text-sm">
                    {t('weighingMethod.bulk.subtitle')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                {t('weighingMethod.bulk.description')}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}