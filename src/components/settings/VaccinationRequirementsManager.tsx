import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Edit } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useVaccinationRequirements } from "@/hooks/useVaccinationRequirements";
import { VaccineCodeSelector } from "./VaccineCodeSelector";
import { toast } from "sonner";

const requirementSchema = z.object({
  vaccine_name: z.string().min(1, "El nombre de la vacuna es requerido"),
  vaccine_type: z.string().min(1, "El tipo de vacuna es requerido"),
  vaccine_code: z.string().min(1, "El código de la vacuna es requerido"),
  description: z.string().optional(),
  is_mandatory: z.boolean(),
  sex_restriction: z.string().optional(),
  min_age_months: z.number().min(0).optional(),
  max_age_months: z.number().min(0).optional(),
  frequency_months: z.number().min(1).optional(),
  doses_required: z.number().min(1).max(5).optional(),
  interval_between_doses_days: z.number().min(1).optional(),
  country: z.string().min(1, "El país es requerido"),
});

type RequirementFormData = z.infer<typeof requirementSchema>;

export const VaccinationRequirementsManager = () => {
  const { requirements, loading, createRequirement, updateRequirement, deleteRequirement } = useVaccinationRequirements();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<any>(null);

  const form = useForm<RequirementFormData>({
    resolver: zodResolver(requirementSchema),
    defaultValues: {
      vaccine_name: "",
      vaccine_type: "",
      vaccine_code: "",
      description: "",
      is_mandatory: false,
      sex_restriction: "ninguno",
      min_age_months: undefined,
      max_age_months: undefined,
      frequency_months: undefined,
      doses_required: 1,
      interval_between_doses_days: undefined,
      country: "Argentina",
    },
  });

  const onSubmit = async (data: RequirementFormData) => {
    try {
      const formattedData = {
        vaccine_name: data.vaccine_name,
        vaccine_type: data.vaccine_type,
        vaccine_code: data.vaccine_code,
        description: data.description,
        is_mandatory: data.is_mandatory,
        sex_restriction: data.sex_restriction === "ninguno" ? null : data.sex_restriction,
        min_age_months: data.min_age_months,
        max_age_months: data.max_age_months,
        frequency_months: data.frequency_months,
        doses_required: data.doses_required,
        interval_between_doses_days: data.interval_between_doses_days,
        country: data.country,
      };

      if (editingRequirement) {
        await updateRequirement(editingRequirement.id, formattedData);
      } else {
        await createRequirement(formattedData);
      }
      setIsDialogOpen(false);
      setEditingRequirement(null);
      form.reset();
    } catch (error) {
      toast.error("Error al guardar el requisito de vacunación");
    }
  };

  const handleEdit = (requirement: any) => {
    setEditingRequirement(requirement);
    form.reset({
      vaccine_name: requirement.vaccine_name,
      vaccine_type: requirement.vaccine_type,
      vaccine_code: requirement.vaccine_code,
      description: requirement.description || "",
      is_mandatory: requirement.is_mandatory,
      sex_restriction: requirement.sex_restriction || "ninguno",
      min_age_months: requirement.min_age_months || undefined,
      max_age_months: requirement.max_age_months || undefined,
      frequency_months: requirement.frequency_months || undefined,
      doses_required: requirement.doses_required || 1,
      interval_between_doses_days: requirement.interval_between_doses_days || undefined,
      country: requirement.country,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este requisito?")) {
      await deleteRequirement(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingRequirement(null);
    form.reset();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Requisitos de Vacunación</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configura las vacunas requeridas para tu cabaña
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Vacuna
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRequirement ? "Editar Requisito" : "Nuevo Requisito de Vacunación"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="vaccine_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de la Vacuna</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ej: Aftosa" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vaccine_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Vacuna</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ej: Viral" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="vaccine_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código de Vacuna</FormLabel>
                      <FormControl>
                        <VaccineCodeSelector
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Descripción opcional" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="is_mandatory"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Obligatoria</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Esta vacuna es obligatoria
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sex_restriction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Restricción de Sexo</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar sexo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ninguno">Sin restricción</SelectItem>
                            <SelectItem value="Macho">Solo Machos</SelectItem>
                            <SelectItem value="Hembra">Solo Hembras</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="min_age_months"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Edad Mín. (meses)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="0"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="max_age_months"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Edad Máx. (meses)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="Sin límite"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="frequency_months"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frecuencia (meses)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="Una vez"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="doses_required"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dosis Requeridas</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(Number(value))} 
                          value={field.value?.toString() || "1"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-background border z-50">
                            <SelectItem value="1">1 dosis</SelectItem>
                            <SelectItem value="2">2 dosis</SelectItem>
                            <SelectItem value="3">3 dosis</SelectItem>
                            <SelectItem value="4">4 dosis</SelectItem>
                            <SelectItem value="5">5 dosis</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Interval between doses field - only show if doses > 1 */}
                {form.watch('doses_required') && form.watch('doses_required')! > 1 && (
                  <FormField
                    control={form.control}
                    name="interval_between_doses_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Intervalo entre dosis (días)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="Ej: 21, 30, 45"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>País</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Argentina">Argentina</SelectItem>
                          <SelectItem value="Brasil">Brasil</SelectItem>
                          <SelectItem value="Uruguay">Uruguay</SelectItem>
                          <SelectItem value="Paraguay">Paraguay</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingRequirement ? "Actualizar" : "Crear"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Cargando requisitos...</p>
        ) : requirements.length === 0 ? (
          <p className="text-muted-foreground">No hay requisitos de vacunación configurados.</p>
        ) : (
          <div className="space-y-4">
            {requirements.map((requirement) => (
              <div key={requirement.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium">{requirement.vaccine_name}</h3>
                    {requirement.is_mandatory && (
                      <Badge variant="destructive">Obligatoria</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Tipo: {requirement.vaccine_type}
                  </p>
                  {requirement.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {requirement.description}
                    </p>
                  )}
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {requirement.sex_restriction && (
                      <span>Sexo: {requirement.sex_restriction}</span>
                    )}
                    {requirement.min_age_months && (
                      <span>Edad mín: {requirement.min_age_months} meses</span>
                    )}
                    {requirement.max_age_months && (
                      <span>Edad máx: {requirement.max_age_months} meses</span>
                    )}
                    {requirement.frequency_months && (
                      <span>Cada {requirement.frequency_months} meses</span>
                    )}
                    {requirement.doses_required && requirement.doses_required > 1 && (
                      <span>{requirement.doses_required} dosis</span>
                    )}
                    {requirement.interval_between_doses_days && (
                      <span>Intervalo: {requirement.interval_between_doses_days} días</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(requirement)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(requirement.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};