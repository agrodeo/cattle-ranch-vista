import { useState } from "react";
import { Animal } from "@/types/animal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { 
  BarChart3, 
  Activity, 
  Heart, 
  Syringe, 
  Scale, 
  GitBranch, 
  MapPin, 
  FileText, 
  DollarSign 
} from "lucide-react";

// Tab components (will create these)
import { AnimalResumen } from "./tabs/AnimalResumen";
import { AnimalActividades } from "./tabs/AnimalActividades";
import { AnimalReproduccion } from "./tabs/AnimalReproduccion";
import { AnimalVacunas } from "./tabs/AnimalVacunas";
import { AnimalProduccion } from "./tabs/AnimalProduccion";
import { AnimalGenealogia } from "./tabs/AnimalGenealogia";
import { AnimalCorrales } from "./tabs/AnimalCorrales";
import { AnimalDocumentos } from "./tabs/AnimalDocumentos";
import { AnimalFinanzas } from "./tabs/AnimalFinanzas";

interface AnimalProfileTabsProps {
  animal: Animal;
  onAnimalUpdate: (animal: Animal) => void;
}

export function AnimalProfileTabs({ animal, onAnimalUpdate }: AnimalProfileTabsProps) {
  const { t } = useTranslation('animals');
  const [activeTab, setActiveTab] = useState('resumen');
  const isMobile = useIsMobile();

  const tabs = [
    { id: 'resumen', label: t('profile.tabs.summary'), icon: BarChart3 },
    { id: 'reproduccion', label: t('profile.tabs.reproduction'), icon: Heart },
    { id: 'vacunas', label: t('profile.tabs.vaccines'), icon: Syringe },
    { id: 'produccion', label: t('profile.tabs.production'), icon: Scale },
    { id: 'genealogia', label: t('profile.tabs.genealogy'), icon: GitBranch },
    { id: 'corrales', label: t('profile.tabs.corrals'), icon: MapPin },
    { id: 'documentos', label: t('profile.tabs.documents'), icon: FileText },
    { id: 'finanzas', label: t('profile.tabs.finances'), icon: DollarSign },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'resumen':
        return <AnimalResumen animal={animal} onAnimalUpdate={onAnimalUpdate} />;
      case 'reproduccion':
        return <AnimalReproduccion animal={animal} onAnimalUpdate={onAnimalUpdate} />;
      case 'vacunas':
        return <AnimalVacunas animal={animal} onAnimalUpdate={onAnimalUpdate} />;
      case 'produccion':
        return <AnimalProduccion animal={animal} onAnimalUpdate={onAnimalUpdate} />;
      case 'genealogia':
        return <AnimalGenealogia animal={animal} onAnimalUpdate={onAnimalUpdate} />;
      case 'corrales':
        return <AnimalCorrales animal={animal} onAnimalUpdate={onAnimalUpdate} />;
      case 'documentos':
        return <AnimalDocumentos animal={animal} onAnimalUpdate={onAnimalUpdate} />;
      case 'finanzas':
        return <AnimalFinanzas animal={animal} onAnimalUpdate={onAnimalUpdate} />;
      default:
        return <AnimalResumen animal={animal} onAnimalUpdate={onAnimalUpdate} />;
    }
  };

  if (isMobile) {
    return (
      <div className="space-y-4">
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <SelectItem key={tab.id} value={tab.id}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        
        <div>
          {renderTabContent()}
        </div>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="flex w-full overflow-x-auto scrollbar-hide mb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              className="flex-shrink-0 flex items-center gap-1 text-xs px-2"
            >
              <Icon className="h-3 w-3" />
              <span className="hidden lg:inline">{tab.label}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      <div className="mt-0">
        {renderTabContent()}
      </div>
    </Tabs>
  );
}