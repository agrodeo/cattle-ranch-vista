import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Users, Activity, DollarSign, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AddOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFlow: (flow: string) => void;
}

export function AddOverlay({ isOpen, onClose, onSelectFlow }: AddOverlayProps) {
  const { t } = useTranslation(['activities', 'animals', 'common']);

  const addOptions = [
    {
      id: 'animals',
      title: 'Cargar Animales',
      description: 'Agregar nuevos animales manual o por Excel',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      id: 'activity',
      title: 'Cargar Actividad',
      description: 'Registrar sanidad, reproducción, producción',
      icon: Activity,
      color: 'bg-green-500',
    },
    {
      id: 'finance',
      title: 'Cargar Movimientos',
      description: 'Registrar ingresos y egresos',
      icon: DollarSign,
      color: 'bg-purple-500',
    },
    {
      id: 'corral',
      title: 'Actividad de Corral',
      description: 'Crear corrales y mover animales',
      icon: Home,
      color: 'bg-orange-500',
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h1 className="text-xl font-semibold">Cargar Datos</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-10 w-10"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Cerrar</span>
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