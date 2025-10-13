import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";

interface ManualAnimalFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function ManualAnimalForm({ onBack, onSuccess }: ManualAnimalFormProps) {
  const { t } = useTranslation(['animals', 'common', 'forms']);
  const [loading, setLoading] = useState(false);
  const [animals, setAnimals] = useState<any[]>([]);
  const [corrales, setCorrales] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    id_tag: "",
    name: "",
    sex: "",
    breed: "",
    birth_date: "",
    peso_nacimiento: "",
    father_id: "",
    mother_id: "",
    corral_id: "",
    color: "",
    mocho: "",
    is_castrated: false,
    observaciones: "",
  });

  useEffect(() => {
    loadAnimalsAndCorrales();
  }, []);

  const loadAnimalsAndCorrales = async () => {
    try {
      const { data: cabanaId } = await supabase.rpc('get_current_user_cabana_id');
      
      if (!cabanaId) return;

      // Load animals for parents selection - using filter instead of eq
      const { data: animalsData } = await supabase
        .from('animals')
        .select('id, id_tag, name, sex')
        .filter('cabaña_id', 'eq', cabanaId)
        .in('status', ['activo'])
        .order('id_tag');
      
      // Load corrales - using filter instead of eq
      const { data: corralesData } = await supabase
        .from('corrales')
        .select('id, name')
        .filter('cabaña_id', 'eq', cabanaId)
        .order('name');
      
      setAnimals(animalsData || []);
      setCorrales(corralesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.id_tag || !formData.sex || !formData.breed) {
      toast.error("Campos requeridos: Identificación, Sexo y Raza");
      return;
    }

    setLoading(true);
    try {
      // Get current user's cabaña_id using RPC function
      const { data: cabanaData, error: cabanaError } = await supabase.rpc(
        'get_current_user_cabana_id'
      );

      if (cabanaError || !cabanaData) {
        throw new Error("No se pudo obtener la cabaña del usuario");
      }

      const animalData: any = {
        id_tag: formData.id_tag,
        name: formData.name || null,
        sex: formData.sex,
        breed: formData.breed,
        birth_date: formData.birth_date || null,
        peso_nacimiento: formData.peso_nacimiento ? parseFloat(formData.peso_nacimiento) : null,
        father_id: (formData.father_id && formData.father_id !== 'none') ? formData.father_id : null,
        mother_id: (formData.mother_id && formData.mother_id !== 'none') ? formData.mother_id : null,
        corral_id: (formData.corral_id && formData.corral_id !== 'none') ? formData.corral_id : null,
        color: (formData.color && formData.color !== 'none') ? formData.color : null,
        mocho: (formData.mocho && formData.mocho !== 'none') ? formData.mocho : null,
        is_castrated: formData.is_castrated,
        observaciones: formData.observaciones || null,
        status: "activo"
      };

      // Add cabaña_id using bracket notation to avoid TypeScript issues with ñ
      animalData["cabaña_id"] = cabanaData;

      const { error } = await supabase
        .from("animals")
        .insert([animalData]);

      if (error) throw error;

      toast.success("Animal creado exitosamente");
      onSuccess();
    } catch (error) {
      console.error("Error creating animal:", error);
      toast.error("Error al crear el animal");
    } finally {
      setLoading(false);
    }
  };

  const fatherOptions = animals.filter(a => a.sex === 'Macho');
  const motherOptions = animals.filter(a => a.sex === 'Hembra');

  return (
    <div className="fixed inset-0 z-50 bg-background lg:hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={onBack} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Nuevo Animal</h1>
        </div>
        <Button onClick={handleSubmit} disabled={loading} size="sm">
          <Save className="h-4 w-4 mr-2" />
          {loading ? "Guardando..." : "Guardar"}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-6 overflow-y-auto pb-20">
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="id_tag">Identificación *</Label>
              <Input
                id="id_tag"
                value={formData.id_tag}
                onChange={(e) => handleInputChange("id_tag", e.target.value)}
                placeholder="Ej: A001"
              />
            </div>

            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Nombre del animal"
              />
            </div>

            <div>
              <Label htmlFor="sex">Sexo *</Label>
              <Select value={formData.sex} onValueChange={(value) => handleInputChange("sex", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sexo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Macho">Macho</SelectItem>
                  <SelectItem value="Hembra">Hembra</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="breed">Raza *</Label>
              <Select value={formData.breed} onValueChange={(value) => handleInputChange("breed", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar raza" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aberdeen Angus">Aberdeen Angus</SelectItem>
                  <SelectItem value="Brangus">Brangus</SelectItem>
                  <SelectItem value="Braford">Braford</SelectItem>
                  <SelectItem value="Hereford">Hereford</SelectItem>
                  <SelectItem value="Shorthorn">Shorthorn</SelectItem>
                  <SelectItem value="Cruza">Cruza</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => handleInputChange("birth_date", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="color">Color</Label>
              <Select value={formData.color} onValueChange={(value) => handleInputChange("color", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin especificar</SelectItem>
                  <SelectItem value="Negro">Negro</SelectItem>
                  <SelectItem value="Colorado">Colorado</SelectItem>
                  <SelectItem value="Bayo">Bayo</SelectItem>
                  <SelectItem value="Blanco">Blanco</SelectItem>
                  <SelectItem value="Overo">Overo</SelectItem>
                  <SelectItem value="Gateado">Gateado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="mocho">Tipo de Cuernos</Label>
              <Select value={formData.mocho} onValueChange={(value) => handleInputChange("mocho", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin especificar</SelectItem>
                  <SelectItem value="Mocho">Mocho (sin cuernos)</SelectItem>
                  <SelectItem value="Astado">Astado (con cuernos)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.sex === 'Macho' && (
              <div className="flex items-center justify-between">
                <Label htmlFor="is_castrated">Castrado</Label>
                <Switch
                  id="is_castrated"
                  checked={formData.is_castrated}
                  onCheckedChange={(checked) => handleInputChange("is_castrated", checked)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Genealogía</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="father_id">Padre</Label>
              <Select value={formData.father_id} onValueChange={(value) => handleInputChange("father_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar padre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin padre</SelectItem>
                  {fatherOptions.map(animal => (
                    <SelectItem key={animal.id} value={animal.id}>
                      {animal.id_tag} {animal.name ? `- ${animal.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="mother_id">Madre</Label>
              <Select value={formData.mother_id} onValueChange={(value) => handleInputChange("mother_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar madre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin madre</SelectItem>
                  {motherOptions.map(animal => (
                    <SelectItem key={animal.id} value={animal.id}>
                      {animal.id_tag} {animal.name ? `- ${animal.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ubicación y Pesos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="corral_id">Corral</Label>
              <Select value={formData.corral_id} onValueChange={(value) => handleInputChange("corral_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar corral" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin corral</SelectItem>
                  {corrales.map(corral => (
                    <SelectItem key={corral.id} value={corral.id}>
                      {corral.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="peso_nacimiento">Peso al Nacer (kg)</Label>
              <Input
                id="peso_nacimiento"
                type="number"
                step="0.1"
                value={formData.peso_nacimiento}
                onChange={(e) => handleInputChange("peso_nacimiento", e.target.value)}
                placeholder="Ej: 35.5"
              />
            </div>

            <div>
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={formData.observaciones}
                onChange={(e) => handleInputChange("observaciones", e.target.value)}
                placeholder="Observaciones adicionales..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}