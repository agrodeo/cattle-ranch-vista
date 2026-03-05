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
    caravana_electronica: "",
    name: "",
    sex: "",
    breed: "",
    birth_date: "",
    peso_nacimiento: "",
    peso_destete: "",
    peso_final: "",
    peso_actual_kg: "",
    father_id: "",
    mother_id: "",
    corral_id: "",
    color: "",
    mocho: "",
    is_castrated: false,
    condicion_corporal: "",
    circunferencia_escrotal: "",
    fecha_destete: "",
    observaciones: "",
  });

  useEffect(() => {
    loadAnimalsAndCorrales();
  }, []);

  const loadAnimalsAndCorrales = async () => {
    try {
      const { data: cabanaId } = await supabase.rpc('get_current_user_cabana_id');
      if (!cabanaId) return;

      const { data: animalsData } = await supabase
        .from('animals')
        .select('id, id_tag, name, sex')
        .filter('cabaña_id', 'eq', cabanaId)
        .in('status', ['activo'])
        .order('id_tag');
      
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
      toast.error(t('animals:messages.requiredFields'));
      return;
    }

    setLoading(true);
    try {
      const { data: cabanaData, error: cabanaError } = await supabase.rpc(
        'get_current_user_cabana_id'
      );

      if (cabanaError || !cabanaData) {
        throw new Error(t('animals:form.errorNoCabana'));
      }

      const animalData: any = {
        id_tag: formData.id_tag,
        name: formData.name || null,
        sex: formData.sex,
        breed: formData.breed,
        birth_date: formData.birth_date || null,
        peso_nacimiento: formData.peso_nacimiento ? parseFloat(formData.peso_nacimiento) : null,
        peso_destete: formData.peso_destete ? parseFloat(formData.peso_destete) : null,
        peso_final: formData.peso_final ? parseFloat(formData.peso_final) : null,
        peso_actual_kg: formData.peso_actual_kg ? parseFloat(formData.peso_actual_kg) : null,
        fecha_destete: formData.fecha_destete || null,
        father_id: (formData.father_id && formData.father_id !== 'none') ? formData.father_id : null,
        mother_id: (formData.mother_id && formData.mother_id !== 'none') ? formData.mother_id : null,
        corral_id: (formData.corral_id && formData.corral_id !== 'none') ? formData.corral_id : null,
        color: (formData.color && formData.color !== 'none') ? formData.color : null,
        mocho: (formData.mocho && formData.mocho !== 'none') ? formData.mocho : null,
        is_castrated: formData.is_castrated,
        condicion_corporal: (formData.condicion_corporal && formData.condicion_corporal !== 'none') ? formData.condicion_corporal : null,
        circunferencia_escrotal: formData.circunferencia_escrotal ? parseFloat(formData.circunferencia_escrotal) : null,
        observaciones: formData.observaciones || null,
        status: "activo",
        ...(formData.caravana_electronica && { caravana_electronica: formData.caravana_electronica })
      };

      animalData["cabaña_id"] = cabanaData;

      const { error } = await supabase
        .from("animals")
        .insert([animalData]);

      if (error) throw error;

      toast.success(t('animals:messages.createdSuccessfully'));
      onSuccess();
    } catch (error) {
      console.error("Error creating animal:", error);
      toast.error(t('animals:messages.errorCreating'));
    } finally {
      setLoading(false);
    }
  };

  const fatherOptions = animals.filter(a => a.sex === 'Macho');
  const motherOptions = animals.filter(a => a.sex === 'Hembra');

  return (
    <div 
      className="fixed inset-0 z-50 bg-background lg:hidden flex flex-col"
      onTouchMove={(e) => e.stopPropagation()}
      style={{ touchAction: 'auto' }}
    >
      <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={onBack} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">{t('animals:form.newAnimal')}</h1>
        </div>
        <Button onClick={handleSubmit} disabled={loading} size="sm">
          <Save className="h-4 w-4 mr-2" />
          {loading ? t('common:forms.saving') : t('common:actions.save')}
        </Button>
      </div>

      <div 
        className="flex-1 p-4 space-y-6 overflow-y-auto pb-20"
        style={{ touchAction: 'pan-y' }}
      >
        <Card>
          <CardHeader>
            <CardTitle>{t('animals:form.basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="id_tag">{t('animals:form.identificationRequired')}</Label>
              <Input
                id="id_tag"
                value={formData.id_tag}
                onChange={(e) => handleInputChange("id_tag", e.target.value)}
                placeholder={t('animals:form.identificationPlaceholder')}
              />
            </div>

            <div>
              <Label htmlFor="caravana_electronica">{t('animals:form.electronicTag')}</Label>
              <Input
                id="caravana_electronica"
                value={formData.caravana_electronica}
                onChange={(e) => handleInputChange("caravana_electronica", e.target.value)}
                placeholder={t('animals:form.electronicTagPlaceholder')}
              />
            </div>

            <div>
              <Label htmlFor="name">{t('common:name')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder={t('animals:form.animalName')}
              />
            </div>

            <div>
              <Label htmlFor="sex">{t('animals:form.sexRequired')}</Label>
              <Select value={formData.sex} onValueChange={(value) => handleInputChange("sex", value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('animals:form.selectSex')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Macho">Macho</SelectItem>
                  <SelectItem value="Hembra">Hembra</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="breed">{t('animals:form.breedRequired')}</Label>
              <Select value={formData.breed} onValueChange={(value) => handleInputChange("breed", value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('animals:form.selectBreed')} />
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
              <Label htmlFor="birth_date">{t('animals:form.birthDate')}</Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => handleInputChange("birth_date", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="color">{t('common:color')}</Label>
              <Select value={formData.color} onValueChange={(value) => handleInputChange("color", value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('animals:form.selectColor')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('animals:form.unspecified')}</SelectItem>
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
              <Label htmlFor="mocho">{t('animals:form.hornCondition')}</Label>
              <Select value={formData.mocho} onValueChange={(value) => handleInputChange("mocho", value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('common:actions.select')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('animals:hornOptions.unspecified')}</SelectItem>
                  <SelectItem value="Mocho">{t('animals:hornOptions.polled')}</SelectItem>
                  <SelectItem value="Astado">{t('animals:hornOptions.horned')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.sex === 'Macho' && (
              <div className="flex items-center justify-between">
                <Label htmlFor="is_castrated">{t('animals:form.castrated')}</Label>
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
            <CardTitle>{t('animals:form.genealogy')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="father_id">{t('animals:form.father')}</Label>
              <Select value={formData.father_id} onValueChange={(value) => handleInputChange("father_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('animals:form.selectFather')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('animals:form.noFather')}</SelectItem>
                  {fatherOptions.map(animal => (
                    <SelectItem key={animal.id} value={animal.id}>
                      {animal.id_tag} {animal.name ? `- ${animal.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="mother_id">{t('animals:form.mother')}</Label>
              <Select value={formData.mother_id} onValueChange={(value) => handleInputChange("mother_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('animals:form.selectMother')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('animals:form.noMother')}</SelectItem>
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
            <CardTitle>{t('animals:form.locationAndWeights')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="corral_id">{t('animals:form.corral')}</Label>
              <Select value={formData.corral_id} onValueChange={(value) => handleInputChange("corral_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('animals:form.selectCorral')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('animals:form.noCorral')}</SelectItem>
                  {corrales.map(corral => (
                    <SelectItem key={corral.id} value={corral.id}>
                      {corral.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="peso_nacimiento">{t('animals:form.birthWeightKg')}</Label>
              <Input
                id="peso_nacimiento"
                type="number"
                step="0.1"
                value={formData.peso_nacimiento}
                onChange={(e) => handleInputChange("peso_nacimiento", e.target.value)}
                placeholder="35.5"
              />
            </div>

            <div>
              <Label htmlFor="fecha_destete">{t('animals:form.weaningDate')}</Label>
              <Input
                id="fecha_destete"
                type="date"
                value={formData.fecha_destete}
                onChange={(e) => handleInputChange("fecha_destete", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="peso_destete">{t('animals:form.weaningWeightKg')}</Label>
              <Input
                id="peso_destete"
                type="number"
                step="0.1"
                value={formData.peso_destete}
                onChange={(e) => handleInputChange("peso_destete", e.target.value)}
                placeholder="180.5"
              />
            </div>

            <div>
              <Label htmlFor="peso_final">{t('animals:form.finalWeightKg')}</Label>
              <Input
                id="peso_final"
                type="number"
                step="0.1"
                value={formData.peso_final}
                onChange={(e) => handleInputChange("peso_final", e.target.value)}
                placeholder="450.0"
              />
            </div>

            <div>
              <Label htmlFor="peso_actual_kg">{t('animals:form.currentWeightKg')}</Label>
              <Input
                id="peso_actual_kg"
                type="number"
                step="0.1"
                value={formData.peso_actual_kg}
                onChange={(e) => handleInputChange("peso_actual_kg", e.target.value)}
                placeholder="320.5"
              />
            </div>

            <div>
              <Label htmlFor="condicion_corporal">{t('animals:form.bodyCondition')}</Label>
              <Select value={formData.condicion_corporal} onValueChange={(value) => handleInputChange("condicion_corporal", value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('animals:form.selectCondition')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('animals:form.unspecified')}</SelectItem>
                  <SelectItem value="1">{t('animals:form.conditionScores.1')}</SelectItem>
                  <SelectItem value="2">{t('animals:form.conditionScores.2')}</SelectItem>
                  <SelectItem value="3">{t('animals:form.conditionScores.3')}</SelectItem>
                  <SelectItem value="4">{t('animals:form.conditionScores.4')}</SelectItem>
                  <SelectItem value="5">{t('animals:form.conditionScores.5')}</SelectItem>
                  <SelectItem value="6">{t('animals:form.conditionScores.6')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.sex === 'Macho' && (
              <div>
                <Label htmlFor="circunferencia_escrotal">{t('animals:form.scrotalCircumference')}</Label>
                <Input
                  id="circunferencia_escrotal"
                  type="number"
                  step="0.1"
                  value={formData.circunferencia_escrotal}
                  onChange={(e) => handleInputChange("circunferencia_escrotal", e.target.value)}
                  placeholder="34.5"
                />
              </div>
            )}

            <div>
              <Label htmlFor="observaciones">{t('animals:form.observations')}</Label>
              <Textarea
                id="observaciones"
                value={formData.observaciones}
                onChange={(e) => handleInputChange("observaciones", e.target.value)}
                placeholder={t('animals:form.observationsPlaceholder')}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
