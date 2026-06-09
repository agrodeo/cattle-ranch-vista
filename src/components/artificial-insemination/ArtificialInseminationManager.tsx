import { Card, CardContent } from "@/components/ui/card";
import { Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SemenInventoryManager } from "./SemenInventoryManager";

export function ArtificialInseminationManager() {
  const { t } = useTranslation('activities');

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <Heart className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h4 className="text-lg font-medium">{t('artificialInsemination.aiSystem')}</h4>
              <p className="text-muted-foreground">
                {t('artificialInsemination.aiSystemDescription')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <SemenInventoryManager />
    </div>
  );
}
