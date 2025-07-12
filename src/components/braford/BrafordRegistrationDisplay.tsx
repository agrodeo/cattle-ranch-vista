import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Edit3, AlertTriangle } from "lucide-react";
import { 
  calculateBrafordRegistration, 
  validateRegistrationOverride,
  getRegistrationLevelColor,
  REGISTRATION_DESCRIPTIONS,
  type RegistrationLevel,
  type RegistrationResult,
  type ParentInfo 
} from "@/lib/brafordRegistration";
import { toast } from "@/hooks/use-toast";

interface BrafordRegistrationDisplayProps {
  breed: string;
  currentLevel?: RegistrationLevel;
  overrideLevel?: RegistrationLevel;
  overrideReason?: string;
  fatherInfo?: ParentInfo;
  motherInfo?: ParentInfo;
  isArtificialInsemination?: boolean;
  onRegistrationChange?: (level: RegistrationLevel, overrideLevel?: RegistrationLevel, reason?: string) => void;
  readonly?: boolean;
}

export function BrafordRegistrationDisplay({
  breed,
  currentLevel,
  overrideLevel,
  overrideReason,
  fatherInfo,
  motherInfo,
  isArtificialInsemination = false,
  onRegistrationChange,
  readonly = false,
}: BrafordRegistrationDisplayProps) {
  const [registration, setRegistration] = useState<RegistrationResult | null>(null);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [tempOverrideLevel, setTempOverrideLevel] = useState<RegistrationLevel>('Preparatorio');
  const [tempOverrideReason, setTempOverrideReason] = useState('');

  // Calculate registration when props change
  useEffect(() => {
    if (breed === 'Braford') {
      const result = calculateBrafordRegistration(breed, fatherInfo, motherInfo, isArtificialInsemination);
      setRegistration(result);
    } else {
      setRegistration(null);
    }
  }, [breed, fatherInfo, motherInfo, isArtificialInsemination]);

  // Don't render for non-Braford breeds
  if (breed !== 'Braford' || !registration) {
    return null;
  }

  const effectiveLevel = overrideLevel || registration.level;
  const hasOverride = !!overrideLevel;

  const handleOverrideSubmit = () => {
    if (!registration) return;

    const validation = validateRegistrationOverride(
      registration.level,
      tempOverrideLevel,
      tempOverrideReason
    );

    if (!validation.isValid) {
      toast({
        title: "Error de validación",
        description: validation.errors.join('. '),
        variant: "destructive",
      });
      return;
    }

    onRegistrationChange?.(registration.level, tempOverrideLevel, tempOverrideReason);
    setShowOverrideDialog(false);
    
    toast({
      title: "Registro actualizado",
      description: `Nivel cambiado a ${tempOverrideLevel}`,
    });
  };

  const handleRemoveOverride = () => {
    onRegistrationChange?.(registration.level);
    toast({
      title: "Override removido",
      description: "Se restauró el nivel calculado automáticamente",
    });
  };

  const allLevels: RegistrationLevel[] = [
    'Preparatorio',
    'Controlado', 
    'Registrado',
    'Avanzado',
    'Definitivo'
  ];

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Badge variant="outline">Braford</Badge>
          Registro ABA 2022
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>Sistema automático de registro según el Reglamento de Registros y Planes de Crianza de la Asociación Braford Argentina (2022)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Registration Level */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Nivel de Registro</Label>
            <div className="flex items-center gap-2">
              <Badge className={getRegistrationLevelColor(effectiveLevel)}>
                {effectiveLevel}
              </Badge>
              {hasOverride && (
                <Badge variant="outline" className="text-xs">
                  Override Manual
                </Badge>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-md">
                    <p>{REGISTRATION_DESCRIPTIONS[effectiveLevel]}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          {!readonly && registration.canOverride && (
            <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit3 className="h-4 w-4 mr-1" />
                  {hasOverride ? 'Modificar' : 'Override'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Override Manual de Registro</DialogTitle>
                  <DialogDescription>
                    Modifique el nivel de registro si cuenta con documentación que justifique el cambio
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label>Nivel Calculado Automáticamente</Label>
                    <div className="mt-1">
                      <Badge className={getRegistrationLevelColor(registration.level)}>
                        {registration.level}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="override-level">Nuevo Nivel</Label>
                    <Select value={tempOverrideLevel} onValueChange={(value) => setTempOverrideLevel(value as RegistrationLevel)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allLevels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="override-reason">Justificación (requerida)</Label>
                    <Textarea
                      id="override-reason"
                      value={tempOverrideReason}
                      onChange={(e) => setTempOverrideReason(e.target.value)}
                      placeholder="Detalle la documentación o razón que justifica este cambio..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleOverrideSubmit} className="flex-1">
                      Aplicar Override
                    </Button>
                    {hasOverride && (
                      <Button variant="outline" onClick={handleRemoveOverride}>
                        Remover Override
                      </Button>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Calculation Details */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Cálculo Automático</Label>
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p><strong>Nivel sugerido:</strong> {registration.level}</p>
            <p><strong>Razón:</strong> {registration.reason}</p>
            {(registration.fatherLevel || registration.motherLevel) && (
              <div className="mt-2 space-y-1">
                {registration.fatherLevel && (
                  <p>• Padre: <Badge variant="outline" className="text-xs">{registration.fatherLevel}</Badge></p>
                )}
                {registration.motherLevel && (
                  <p>• Madre: <Badge variant="outline" className="text-xs">{registration.motherLevel}</Badge></p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Warnings and Errors */}
        {registration.warnings.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Advertencias:</strong>
              <ul className="list-disc list-inside mt-1">
                {registration.warnings.map((warning, index) => (
                  <li key={index} className="text-sm">{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {registration.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Errores:</strong>
              <ul className="list-disc list-inside mt-1">
                {registration.errors.map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* DNA Requirement */}
        {registration.requiresDNA && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Requisito de ADN:</strong> Este nivel de registro requiere verificación genética.
            </AlertDescription>
          </Alert>
        )}

        {/* Override Reason Display */}
        {hasOverride && overrideReason && (
          <div className="space-y-1">
            <Label className="text-sm font-medium">Justificación del Override</Label>
            <div className="text-sm bg-blue-50 border border-blue-200 p-3 rounded-lg">
              {overrideReason}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}