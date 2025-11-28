import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useVaccinationRequirements } from "@/hooks/useVaccinationRequirements";
import { Plus, Check, Shield, AlertTriangle } from "lucide-react";

interface VaccineSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  selectedAnimals?: string[];
}

export function VaccineSelector({ 
  value, 
  onChange, 
  placeholder,
  selectedAnimals = []
}: VaccineSelectorProps) {
  const { t } = useTranslation(['activities', 'common']);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customVaccineName, setCustomVaccineName] = useState("");
  const { toast } = useToast();
  const { requirements, loading } = useVaccinationRequirements();

  const handleAddCustomVaccine = () => {
    if (!customVaccineName.trim()) {
      toast({
        variant: "destructive",
        title: t('common:error'),
        description: t('activities:vaccination.vaccineNameRequired')
      });
      return;
    }

    onChange(customVaccineName.trim());
    setCustomVaccineName("");
    setShowCustomDialog(false);

    toast({
      title: t('activities:vaccination.vaccineSelected'),
      description: t('activities:vaccination.customVaccineMessage', { name: customVaccineName.trim() })
    });
  };

  return (
    <div className="space-y-2">
      <Label>{t('activities:vaccination.vaccineLabel')}</Label>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="flex-1 bg-background">
            <SelectValue placeholder={placeholder || t('activities:vaccination.selectVaccine')} />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border z-50 max-h-[300px] overflow-y-auto">
            {requirements.length > 0 ? (
              <>
                <div className="px-2 py-1 text-xs text-muted-foreground border-b">
                  {t('activities:vaccination.configuredVaccines')}
                </div>
                {requirements.map((requirement) => (
                  <SelectItem 
                    key={requirement.id} 
                    value={requirement.id}
                    className="bg-background hover:bg-muted"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        {requirement.is_mandatory ? (
                          <Shield className="h-3 w-3 text-red-500" />
                        ) : (
                          <div className="h-3 w-3 rounded-full bg-blue-500" />
                        )}
                        <div>
                          <div className="font-medium">{requirement.vaccine_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {requirement.vaccine_type}
                            {requirement.doses_required && requirement.doses_required > 1 && 
                              ` • ${requirement.doses_required} ${t('activities:vaccination.doses')}`
                            }
                          </div>
                        </div>
                      </div>
                      {requirement.is_mandatory && (
                        <div className="text-xs text-red-600 font-medium">
                          {t('activities:vaccination.mandatory')}
                        </div>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </>
            ) : (
              <div className="px-2 py-4 text-center text-muted-foreground">
                <AlertTriangle className="h-4 w-4 mx-auto mb-2" />
                <div className="text-sm">{t('activities:vaccination.noVaccinesConfigured')}</div>
                <div className="text-xs">{t('activities:vaccination.configureInSettings')}</div>
              </div>
            )}
          </SelectContent>
        </Select>

        <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" title={t('activities:vaccination.addCustomVaccine')}>
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-background">
            <DialogHeader>
              <DialogTitle>{t('activities:vaccination.customVaccineDialogTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customVaccine">{t('activities:vaccination.vaccineNameLabel')}</Label>
                <Input
                  id="customVaccine"
                  value={customVaccineName}
                  onChange={(e) => setCustomVaccineName(e.target.value)}
                  placeholder={t('activities:vaccination.vaccineNamePlaceholder')}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setCustomVaccineName("");
                    setShowCustomDialog(false);
                  }}
                >
                  {t('common:cancel')}
                </Button>
                <Button 
                  onClick={handleAddCustomVaccine}
                  disabled={!customVaccineName.trim()}
                >
                  <Check className="h-4 w-4 mr-2" />
                  {t('common:add')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <p className="text-xs text-muted-foreground">
        {requirements.length > 0 
          ? t('activities:vaccination.selectConfiguredOrCustom')
          : t('activities:vaccination.configureOrAddCustom')
        }
      </p>
    </div>
  );
}
