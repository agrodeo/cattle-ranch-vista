import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MapPin, Globe, Settings, AlertTriangle, CheckCircle } from "lucide-react";
import { useLocationAwareVaccination } from "@/hooks/useLocationAwareVaccination";

interface HerdSettingsFormProps {
  onSettingsSaved?: () => void;
}

export function HerdSettingsForm({ onSettingsSaved }: HerdSettingsFormProps) {
  const { herdSettings, saveHerdSettings, getJurisdictions, rules, loading } = useLocationAwareVaccination();
  const [jurisdictions, setJurisdictions] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    country: '',
    region: '',
    herd_type: '',
    service_type: '',
    compliance_mode: 'strict',
  });

  useEffect(() => {
    loadJurisdictions();
  }, []);

  useEffect(() => {
    if (herdSettings) {
      setFormData({
        country: herdSettings.country || '',
        region: herdSettings.region || '',
        herd_type: herdSettings.herd_type || '',
        service_type: herdSettings.service_type || '',
        compliance_mode: herdSettings.compliance_mode || 'strict',
      });
    }
  }, [herdSettings]);

  const loadJurisdictions = async () => {
    const data = await getJurisdictions();
    setJurisdictions(data);
  };

  const countries = jurisdictions.filter(j => !j.parent_code && j.code !== 'GLOBAL');
  const regions = jurisdictions.filter(j => j.parent_code === formData.country);

  const handleSave = async () => {
    try {
      await saveHerdSettings({
        ...formData,
        compliance_mode: formData.compliance_mode as 'strict' | 'advisory'
      });
      onSettingsSaved?.();
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const mandatoryRules = rules.filter(r => r.mandatory);
  const advisoryRules = rules.filter(r => !r.mandatory);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Configuración de Ubicación
          </CardTitle>
          <CardDescription>
            Configure la ubicación de su establecimiento para obtener reglas de vacunación específicas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>País *</Label>
              <Select value={formData.country} onValueChange={(value) => setFormData({...formData, country: value, region: ''})}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione país" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Región (opcional)</Label>
              <Select value={formData.region} onValueChange={(value) => setFormData({...formData, region: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione región" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region.code} value={region.code}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Establecimiento</Label>
              <Select value={formData.herd_type} onValueChange={(value) => setFormData({...formData, herd_type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cría">Cría</SelectItem>
                  <SelectItem value="recría">Recría</SelectItem>
                  <SelectItem value="feedlot">Feedlot</SelectItem>
                  <SelectItem value="tambo">Tambo</SelectItem>
                  <SelectItem value="mixto">Mixto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Servicio</Label>
              <Select value={formData.service_type} onValueChange={(value) => setFormData({...formData, service_type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione servicio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IA">Inseminación Artificial</SelectItem>
                  <SelectItem value="toros">Toros</SelectItem>
                  <SelectItem value="mixto">Mixto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Modo de Cumplimiento</Label>
              <Select value={formData.compliance_mode} onValueChange={(value) => setFormData({...formData, compliance_mode: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strict">Estricto (obligatorias prioritarias)</SelectItem>
                  <SelectItem value="advisory">Orientativo (todo recomendaciones)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSave} disabled={!formData.country} className="w-full">
            Guardar Configuración
          </Button>
        </CardContent>
      </Card>

      {rules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Esquema de Vacunación Aplicable
            </CardTitle>
            <CardDescription>
              Reglas de vacunación según su ubicación y tipo de establecimiento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mandatoryRules.length > 0 && (
              <div>
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Vacunas Obligatorias ({mandatoryRules.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {mandatoryRules.map((rule) => (
                    <div key={rule.vaccine_code} className="p-3 border border-red-200 bg-red-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-red-800">{rule.vaccine_name}</span>
                        <Badge variant="destructive" className="text-xs">OBLIGATORIA</Badge>
                      </div>
                      <p className="text-xs text-red-600 mt-1">{rule.notes}</p>
                      {rule.one_time && (
                        <Badge variant="outline" className="text-xs mt-1">Dosis única</Badge>
                      )}
                      {!rule.one_time && rule.booster_interval_days && (
                        <Badge variant="outline" className="text-xs mt-1">
                          Cada {Math.round(rule.booster_interval_days / 30)} meses
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {advisoryRules.length > 0 && (
              <div>
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Vacunas Recomendadas ({advisoryRules.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {advisoryRules.map((rule) => (
                    <div key={rule.vaccine_code} className="p-3 border border-green-200 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-green-800">{rule.vaccine_name}</span>
                        <Badge variant="secondary" className="text-xs">RECOMENDADA</Badge>
                      </div>
                      <p className="text-xs text-green-600 mt-1">{rule.notes}</p>
                      {!rule.one_time && rule.booster_interval_days && (
                        <Badge variant="outline" className="text-xs mt-1">
                          Cada {Math.round(rule.booster_interval_days / 30)} meses
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}