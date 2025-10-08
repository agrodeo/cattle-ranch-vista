import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Activity, 
  Heart, 
  Syringe, 
  Weight,
  Baby,
  ArrowLeft,
  Flame,
  Scissors,
  CircleSlash,
  Pill
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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

  const managementTypes: ActivityType[] = [
    {
      id: 'destete',
      title: t('managementTypes.destete.title'),
      description: t('managementTypes.destete.description'),
      icon: Baby,
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
    },
    {
      id: 'marcacion',
      title: t('managementTypes.marcacion.title'),
      description: t('managementTypes.marcacion.description'),
      icon: Flame,
      color: 'bg-orange-50 hover:bg-orange-100 border-orange-200'
    },
    {
      id: 'castracion',
      title: t('managementTypes.castracion.title'),
      description: t('managementTypes.castracion.description'),
      icon: Scissors,
      color: 'bg-red-50 hover:bg-red-100 border-red-200'
    },
    {
      id: 'descorne',
      title: t('managementTypes.descorne.title'),
      description: t('managementTypes.descorne.description'),
      icon: CircleSlash,
      color: 'bg-amber-50 hover:bg-amber-100 border-amber-200'
    },
    {
      id: 'tratamiento',
      title: t('managementTypes.tratamiento.title'),
      description: t('managementTypes.tratamiento.description'),
      icon: Pill,
      color: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
    },
    {
      id: 'apareamiento',
      title: t('managementTypes.apareamiento.title'),
      description: t('managementTypes.apareamiento.description'),
      icon: Heart,
      color: 'bg-pink-50 hover:bg-pink-100 border-pink-200'
    },
    {
      id: 'parto',
      title: t('managementTypes.parto.title'),
      description: t('managementTypes.parto.description'),
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {showManagementTypes ? t('managementTypes.title') : t('typeSelector.title')}
          </DialogTitle>
        </DialogHeader>
        
        {!showManagementTypes ? (
          <>
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
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {managementTypes.map((type) => {
                const IconComponent = type.icon;
                return (
                  <Card 
                    key={type.id}
                    className={`cursor-pointer transition-all duration-200 ${type.color}`}
                    onClick={() => handleManagementTypeSelect(type.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col items-center text-center gap-2">
                        <div className="p-3 rounded-lg bg-white/80">
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900 mb-1 text-sm">
                            {type.title}
                          </h3>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {type.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={handleBackFromManagement}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('managementTypes.back')}
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}