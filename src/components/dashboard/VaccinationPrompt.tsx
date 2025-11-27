import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Syringe, Settings, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const VaccinationPrompt = () => {
  const { t } = useTranslation(['dashboard']);
  const navigate = useNavigate();

  const handleSetupVaccines = () => {
    navigate('/settings?tab=vaccines');
  };

  return (
    <Card className="border-dashed border-primary/50 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-primary/10">
            <Syringe className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">{t('dashboard:vaccination.title')}</CardTitle>
            <CardDescription className="text-sm">
              {t('dashboard:vaccination.description')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-4">
          {t('dashboard:vaccination.message')}
        </p>
        <div className="flex gap-2">
          <Button 
            onClick={handleSetupVaccines}
            size="sm"
            className="flex-1"
          >
            <Settings className="h-4 w-4 mr-2" />
            {t('dashboard:actions.configureNow')}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/activities')}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};