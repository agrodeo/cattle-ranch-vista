import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { toast } from "sonner";

const requirementSchema = z.object({
  vaccine_code: z.string().min(1, "El código de la vacuna es requerido"),
  vaccine_name: z.string().min(1, "El nombre de la vacuna es requerido"),
  vaccine_type: z.string().min(1, "El tipo de vacuna es requerido"),
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
  const { t } = useTranslation(['common', 'settings']);
  const { requirements, loading, createRequirement, updateRequirement, deleteRequirement } = useVaccinationRequirements();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<any>(null);

  const form = useForm<RequirementFormData>({
    resolver: zodResolver(requirementSchema),
    defaultValues: {
      vaccine_code: "",
      vaccine_name: "",
      vaccine_type: "",
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
        vaccine_code: data.vaccine_code,
        vaccine_name: data.vaccine_name,
        vaccine_type: data.vaccine_type,
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
      toast.error(t('common:error.saveFailed'));
    }
  };

  const handleEdit = (requirement: any) => {
    setEditingRequirement(requirement);
    form.reset({
      vaccine_code: requirement.vaccine_code || "",
      vaccine_name: requirement.vaccine_name,
      vaccine_type: requirement.vaccine_type,
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
    if (window.confirm(t('settings:vaccines.deleteConfirm'))) {
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
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <CardTitle>{t('settings:vaccines.title')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('settings:vaccines.subtitle')}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              {t('settings:vaccines.addVaccine')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRequirement ? t('settings:vaccines.editRequirement') : t('settings:vaccines.newRequirement')}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="vaccine_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:vaccines.vaccineCode')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ej: AFTOSA" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vaccine_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:vaccines.vaccineName')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ej: Aftosa" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="vaccine_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings:vaccines.vaccineType')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('settings:vaccines.selectType')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Viral">{t('settings:vaccines.viral')}</SelectItem>
                          <SelectItem value="Bacterial">{t('settings:vaccines.bacterial')}</SelectItem>
                          <SelectItem value="Parasitic">{t('settings:vaccines.parasitic')}</SelectItem>
                          <SelectItem value="Other">{t('settings:vaccines.other')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings:vaccines.description')}</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder={t('settings:vaccines.optionalDescription')} />
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
                          <FormLabel className="text-base">{t('settings:vaccines.mandatory')}</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            {t('settings:vaccines.mandatoryDescription')}
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
                        <FormLabel>{t('settings:vaccines.sexRestriction')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('settings:vaccines.selectSex')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ninguno">{t('settings:vaccines.noRestriction')}</SelectItem>
                            <SelectItem value="Macho">{t('settings:vaccines.malesOnly')}</SelectItem>
                            <SelectItem value="Hembra">{t('settings:vaccines.femalesOnly')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="min_age_months"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:vaccines.minAge')}</FormLabel>
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
                        <FormLabel>{t('settings:vaccines.maxAge')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            placeholder={t('settings:vaccines.noLimit')}
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
                        <FormLabel>{t('settings:vaccines.frequency')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            placeholder={t('settings:vaccines.onceOnly')}
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
                        <FormLabel>{t('settings:vaccines.dosesRequired')}</FormLabel>
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
                            <SelectItem value="1">1 {t('settings:vaccines.dose')}</SelectItem>
                            <SelectItem value="2">2 {t('settings:vaccines.doses')}</SelectItem>
                            <SelectItem value="3">3 {t('settings:vaccines.doses')}</SelectItem>
                            <SelectItem value="4">4 {t('settings:vaccines.doses')}</SelectItem>
                            <SelectItem value="5">5 {t('settings:vaccines.doses')}</SelectItem>
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
                        <FormLabel>{t('settings:vaccines.intervalBetweenDoses')}</FormLabel>
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
                      <FormLabel>{t('settings:vaccines.country')}</FormLabel>
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

                <div className="flex flex-col sm:flex-row justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleDialogClose} className="w-full sm:w-auto">
                    {t('settings:vaccines.cancel')}
                  </Button>
                  <Button type="submit" className="w-full sm:w-auto">
                    {editingRequirement ? t('settings:vaccines.update') : t('settings:vaccines.create')}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>{t('settings:vaccines.loading')}</p>
        ) : requirements.length === 0 ? (
          <p className="text-muted-foreground">{t('settings:vaccines.noRequirements')}</p>
        ) : (
          <div className="space-y-4">
            {requirements.map((requirement) => (
              <div key={requirement.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium">{requirement.vaccine_name}</h3>
                    {requirement.is_mandatory && (
                      <Badge variant="destructive">{t('settings:vaccines.mandatory')}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('settings:vaccines.type')}: {requirement.vaccine_type}
                  </p>
                  {requirement.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {requirement.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    {requirement.sex_restriction && (
                      <span>{t('settings:vaccines.sex')}: {requirement.sex_restriction}</span>
                    )}
                    {requirement.min_age_months && (
                      <span>{t('settings:vaccines.minAgeMonths')}: {requirement.min_age_months} {t('settings:vaccines.months')}</span>
                    )}
                    {requirement.max_age_months && (
                      <span>{t('settings:vaccines.maxAgeMonths')}: {requirement.max_age_months} {t('settings:vaccines.months')}</span>
                    )}
                    {requirement.frequency_months && (
                      <span>{t('settings:vaccines.everyMonths')} {requirement.frequency_months} {t('settings:vaccines.months')}</span>
                    )}
                    {requirement.doses_required && requirement.doses_required > 1 && (
                      <span>{requirement.doses_required} {t('settings:vaccines.doses')}</span>
                    )}
                    {requirement.interval_between_doses_days && (
                      <span>{t('settings:vaccines.interval')}: {requirement.interval_between_doses_days} {t('settings:vaccines.days')}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto justify-end sm:justify-start flex-shrink-0">
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