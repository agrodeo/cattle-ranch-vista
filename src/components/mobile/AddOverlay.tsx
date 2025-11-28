import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Users, Activity, DollarSign, Home, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { AnimalCreationFlow } from "./flows/AnimalCreationFlow";
import { ActivityCreationFlow } from "./flows/ActivityCreationFlow";
import { FinanceCreationFlow } from "./flows/FinanceCreationFlow";
import { CorralCreationFlow } from "./flows/CorralCreationFlow";

interface AddOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFlow: (flow: string) => void;
  selectedFlow: string | null;
}

export function AddOverlay({ isOpen, onClose, onSelectFlow, selectedFlow }: AddOverlayProps) {
  const { t } = useTranslation(['activities', 'animals', 'common']);
  
  const { isRefreshing, pullDistance, isPulling } = usePullToRefresh({
    onRefresh: async () => {
      // Simulate refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
    disabled: !isOpen || !!selectedFlow,
  });

  const addOptions = [
    {
      id: 'animals',
      title: t('activities:mobile.loadAnimals'),
      description: t('activities:mobile.loadAnimalsDesc'),
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      id: 'activity',
      title: t('activities:mobile.loadActivity'),
      description: t('activities:mobile.loadActivityDesc'),
      icon: Activity,
      color: 'bg-primary',
    },
    {
      id: 'finance',
      title: t('activities:mobile.loadMovements'),
      description: t('activities:mobile.loadMovementsDesc'),
      icon: DollarSign,
      color: 'bg-purple-500',
    },
    {
      id: 'corral',
      title: t('activities:mobile.corralActivity'),
      description: t('activities:mobile.corralActivityDesc'),
      icon: Home,
      color: 'bg-orange-500',
    },
  ];

  if (!isOpen) return null;

  // Show individual flows
  if (selectedFlow === 'animals') {
    return <AnimalCreationFlow onClose={onClose} />;
  }
  
  if (selectedFlow === 'activity') {
    return <ActivityCreationFlow onClose={onClose} />;
  }
  
  if (selectedFlow === 'finance') {
    return <FinanceCreationFlow onClose={onClose} />;
  }
  
  if (selectedFlow === 'corral') {
    return <CorralCreationFlow onClose={onClose} />;
  }

  return (
    <div className="lg:hidden fixed inset-0 z-50 bg-background">
      {/* Pull to refresh indicator */}
      {isPulling && (
        <div 
          className="absolute top-0 left-0 right-0 bg-primary/10 flex items-center justify-center transition-all duration-200 ease-out z-10"
          style={{ height: `${Math.min(pullDistance, 80)}px` }}
        >
          <RefreshCw 
            className={cn(
              "h-5 w-5 text-primary transition-transform duration-200",
              isRefreshing && "animate-spin"
            )}
            style={{ 
              transform: `rotate(${Math.min(pullDistance * 4, 360)}deg)` 
            }}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h1 className="text-xl font-semibold">{t('activities:mobile.loadData')}</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-10 w-10"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">{t('activities:mobile.close')}</span>
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        {/* Phone: Stack vertically */}
        <div className="sm:hidden space-y-4">
          {addOptions.map((option) => (
            <Card
              key={option.id}
              className="cursor-pointer border-2 hover:border-primary/50 transition-colors"
              onClick={() => onSelectFlow(option.id)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className={cn("p-3 rounded-lg text-white", option.color)}>
                    <option.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{option.title}</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      {option.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Tablet: 2x2 Grid */}
        <div className="hidden sm:grid sm:grid-cols-2 gap-6">
          {addOptions.map((option) => (
            <Card
              key={option.id}
              className="cursor-pointer border-2 hover:border-primary/50 transition-colors h-40"
              onClick={() => onSelectFlow(option.id)}
            >
              <CardHeader className="text-center h-full flex flex-col justify-center">
                <div className={cn("mx-auto p-4 rounded-lg text-white mb-3", option.color)}>
                  <option.icon className="h-8 w-8" />
                </div>
                <CardTitle className="text-xl">{option.title}</CardTitle>
                <CardDescription className="text-sm mt-2">
                  {option.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}