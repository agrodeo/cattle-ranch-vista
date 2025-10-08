import { useTranslation } from 'react-i18next';
import { 
  Baby,
  Flame,
  Scissors,
  CircleSlash,
  ArrowRight,
  Pill,
  Stethoscope,
  Heart,
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

interface ManagementType {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface ManagementTypeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectType: (type: string) => void;
  onBack: () => void;
}

export function ManagementTypeSelector({ 
  open, 
  onOpenChange, 
  onSelectType,
  onBack
}: ManagementTypeSelectorProps) {
  const { t } = useTranslation('activities');

  const managementTypes: ManagementType[] = [
    {
      id: 'destete',
      icon: Baby,
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
    },
    {
      id: 'marcacion',
      icon: Flame,
      color: 'bg-orange-50 hover:bg-orange-100 border-orange-200'
    },
    {
      id: 'castracion',
      icon: Scissors,
      color: 'bg-red-50 hover:bg-red-100 border-red-200'
    },
    {
      id: 'descorne',
      icon: CircleSlash,
      color: 'bg-amber-50 hover:bg-amber-100 border-amber-200'
    },
    {
      id: 'traslado',
      icon: ArrowRight,
      color: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200'
    },
    {
      id: 'tratamiento',
      icon: Pill,
      color: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
    },
    {
      id: 'revision',
      icon: Stethoscope,
      color: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200'
    },
    {
      id: 'apareamiento',
      icon: Heart,
      color: 'bg-pink-50 hover:bg-pink-100 border-pink-200'
    },
    {
      id: 'parto',
      icon: Baby,
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200'
    }
  ];

  const handleSelectType = (typeId: string) => {
    onSelectType(typeId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t('managementTypes.title')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          {managementTypes.map((type) => {
            const IconComponent = type.icon;
            return (
              <Card 
                key={type.id}
                className={`cursor-pointer transition-all duration-200 ${type.color}`}
                onClick={() => handleSelectType(type.id)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="p-3 rounded-lg bg-white/80">
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900 mb-1">
                        {t(`managementTypes.${type.id}.title`)}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {t(`managementTypes.${type.id}.description`)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('managementTypes.back')}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}