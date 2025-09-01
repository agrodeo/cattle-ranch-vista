import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Check } from "lucide-react";

interface VaccineSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface VaccineOption {
  code: string;
  name: string;
  description?: string;
  category: 'official' | 'custom';
}

export function VaccineSelector({ value, onChange, placeholder = "Seleccionar vacuna" }: VaccineSelectorProps) {
  const [vaccines, setVaccines] = useState<VaccineOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customVaccineName, setCustomVaccineName] = useState("");
  const [herdSettings, setHerdSettings] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadVaccines();
    loadHerdSettings();
  }, []);

  const loadHerdSettings = async () => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      // Get user's cabaña info
      const { data: cabanaInfo, error: cabanaError } = await supabase
        .rpc('get_user_cabana_info', { user_uuid: currentUser.user.id });

      if (cabanaError) throw cabanaError;

      if (cabanaInfo && cabanaInfo.length > 0) {
        const cabanaId = cabanaInfo[0].cabana_id;
        
        // Get herd settings for this cabaña
        const { data: settings, error: settingsError } = await supabase
          .from('herd_settings')
          .select('*')
          .eq('cabaña_id', cabanaId)
          .single();

        if (!settingsError && settings) {
          setHerdSettings(settings);
        }
      }
    } catch (error) {
      console.error('Error loading herd settings:', error);
    }
  };

  const loadVaccines = async () => {
    try {
      setLoading(true);
      
      // Load official vaccines from the catalog
      const { data: officialVaccines, error: officialError } = await supabase
        .from('vaccines')
        .select('code, name, description')
        .eq('active', true)
        .eq('species', 'bovine')
        .order('name');

      if (officialError) throw officialError;

      // Load custom vaccines for this cabaña
      const { data: currentUser } = await supabase.auth.getUser();
      let customVaccines: any[] = [];
      
      if (currentUser.user) {
        const { data: customVaccinesData, error: customError } = await supabase
          .from('custom_vaccines')
          .select('name, description')
          .order('name');

        if (!customError && customVaccinesData) {
          customVaccines = customVaccinesData.map(v => ({
            code: v.name,
            name: v.name,
            description: v.description,
            category: 'custom' as const
          }));
        }
      }

      // Combine official and custom vaccines
      const allVaccines: VaccineOption[] = [
        ...(officialVaccines || []).map(v => ({
          code: v.code,
          name: v.name,
          description: v.description,
          category: 'official' as const
        })),
        ...customVaccines
      ];

      setVaccines(allVaccines);
    } catch (error) {
      console.error('Error loading vaccines:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las vacunas disponibles"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomVaccine = async () => {
    try {
      if (!customVaccineName.trim()) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "El nombre de la vacuna es requerido"
        });
        return;
      }

      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      const { data: cabanaInfo } = await supabase
        .rpc('get_user_cabana_info', { user_uuid: currentUser.user.id });

      if (!cabanaInfo || cabanaInfo.length === 0) return;

      const cabanaId = cabanaInfo[0].cabana_id;

      // Check if vaccine already exists
      const existingVaccine = vaccines.find(v => 
        v.name.toLowerCase() === customVaccineName.trim().toLowerCase()
      );

      if (existingVaccine) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Ya existe una vacuna con ese nombre"
        });
        return;
      }

      // Create custom vaccine entry
      const { error } = await supabase
        .from('custom_vaccines')
        .insert({
          cabaña_id: cabanaId,
          name: customVaccineName.trim(),
          description: `Vacuna personalizada - ${customVaccineName.trim()}`,
          created_by: currentUser.user.id
        });

      if (error) throw error;

      // Add to local state
      const newVaccine: VaccineOption = {
        code: customVaccineName.trim(),
        name: customVaccineName.trim(),
        description: `Vacuna personalizada - ${customVaccineName.trim()}`,
        category: 'custom'
      };

      setVaccines(prev => [...prev, newVaccine]);
      onChange(customVaccineName.trim());
      setCustomVaccineName("");
      setShowCustomDialog(false);

      toast({
        title: "Vacuna agregada",
        description: `Se agregó "${customVaccineName.trim()}" a la lista de vacunas personalizadas`
      });

    } catch (error) {
      console.error('Error adding custom vaccine:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo agregar la vacuna personalizada"
      });
    }
  };

  // Filter vaccines based on location if herd settings are available
  const getRecommendedVaccines = () => {
    if (!herdSettings) return vaccines;

    // You can implement filtering logic based on country/region here
    // For now, return all vaccines but could filter by jurisdiction in the future
    return vaccines;
  };

  const recommendedVaccines = getRecommendedVaccines();
  const officialVaccines = recommendedVaccines.filter(v => v.category === 'official');
  const customVaccines = recommendedVaccines.filter(v => v.category === 'custom');

  return (
    <div className="space-y-2">
      <Label>Vacuna *</Label>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="flex-1 bg-background">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border z-50 max-h-[300px] overflow-y-auto">
            {herdSettings && (
              <div className="px-2 py-1 text-xs text-muted-foreground border-b">
                Recomendadas para {herdSettings.country || 'tu ubicación'}
              </div>
            )}
            
            {officialVaccines.length > 0 && (
              <>
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  Vacunas Oficiales
                </div>
                {officialVaccines.map((vaccine) => (
                  <SelectItem 
                    key={vaccine.code} 
                    value={vaccine.name}
                    className="bg-background hover:bg-muted"
                  >
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-medium">{vaccine.name}</div>
                        {vaccine.description && (
                          <div className="text-xs text-muted-foreground">
                            {vaccine.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </>
            )}

            {customVaccines.length > 0 && (
              <>
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground border-t mt-1 pt-2">
                  Vacunas Personalizadas
                </div>
                {customVaccines.map((vaccine) => (
                  <SelectItem 
                    key={vaccine.code} 
                    value={vaccine.name}
                    className="bg-background hover:bg-muted"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-primary rounded-full" />
                      <div>
                        <div className="font-medium">{vaccine.name}</div>
                        {vaccine.description && (
                          <div className="text-xs text-muted-foreground">
                            {vaccine.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>

        <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-background">
            <DialogHeader>
              <DialogTitle>Agregar Vacuna Personalizada</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customVaccine">Nombre de la Vacuna</Label>
                <Input
                  id="customVaccine"
                  value={customVaccineName}
                  onChange={(e) => setCustomVaccineName(e.target.value)}
                  placeholder="Ej: Vacuna Triple, Brucelosis, etc."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setCustomVaccineName("");
                    setShowCustomDialog(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleAddCustomVaccine}
                  disabled={!customVaccineName.trim()}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {herdSettings && (
        <p className="text-xs text-muted-foreground">
          Mostrando vacunas recomendadas para {herdSettings.country}
          {herdSettings.region && `, ${herdSettings.region}`}
        </p>
      )}
    </div>
  );
}