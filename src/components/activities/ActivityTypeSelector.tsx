import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Activity, 
  Heart, 
  Syringe, 
  Weight,
  Baby,
  ArrowLeft
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ManagementTypeSelector } from './ManagementTypeSelector';

interface ActivityType {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface ActivityTypeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectType: (type: string) => void;
}

export function ActivityTypeSelector({ 
  open, 
  onOpenChange, 
  onSelectType 
}: ActivityTypeSelectorProps) {
  const { t } = useTranslation('activities');
  const [showManagementTypes, setShowManagementTypes] = useState(false);

  const activityTypes: ActivityType[] = [
    {
      id: 'general',
      title: t('typeSelector.general.title'),
      description: t('typeSelector.general.description'),
      icon: Activity,
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
    },
    {
      id: 'insemination',
      title: t('typeSelector.insemination.title'),
      description: t('typeSelector.insemination.description'),
      icon: Heart,
      color: 'bg-rose-50 hover:bg-rose-100 border-rose-200'
    },
    {
      id: 'vaccination',
      title: t('typeSelector.vaccination.title'),
      description: t('typeSelector.vaccination.description'),
      icon: Syringe,
      color: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
    },
    {
      id: 'weighing',
      title: t('typeSelector.weighing.title'),
      description: t('typeSelector.weighing.description'),
      icon: Weight,
      color: 'bg-amber-50 hover:bg-amber-100 border-amber-200'
    },
    {
      id: 'pregnancy',
      title: t('typeSelector.pregnancy.title'),
      description: t('typeSelector.pregnancy.description'),
      icon: Baby,
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200'
    }
  ];

  const handleSelectType = (typeId: string) => {
    if (typeId === 'general') {
      setShowManagementTypes(true);
    } else {
      onSelectType(typeId);
      onOpenChange(false);
    }
  };

  const handleManagementTypeSelect = (managementType: string) => {
    onSelectType(managementType);
    setShowManagementTypes(false);
    onOpenChange(false);
  };

  const handleBackFromManagement = () => {
    setShowManagementTypes(false);
  };

  if (showManagementTypes) {
    return (
      <ManagementTypeSelector
        open={open}
        onOpenChange={onOpenChange}
        onSelectType={handleManagementTypeSelect}
        onBack={handleBackFromManagement}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t('typeSelector.title')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {activityTypes.map((type) => {
            const IconComponent = type.icon;
            return (
              <Card 
                key={type.id}
                className={`cursor-pointer transition-all duration-200 ${type.color}`}
                onClick={() => handleSelectType(type.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-white/80">
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-900 mb-1">
                        {type.title}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {type.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}