import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface TaskFormData {
  title: string;
  description: string;
  priority: "alta" | "media" | "baja";
  due_date: string;
  assigned_to: string;
  animal_id: string;
  corral_id: string;
}

interface TaskFormProps {
  defaultAnimalId?: string;
  defaultAnimalTag?: string;
  onSubmit: (data: Omit<TaskFormData, "animal_id" | "corral_id" | "assigned_to"> & {
    assigned_to: string | null;
    animal_id: string | null;
    corral_id: string | null;
  }) => void;
  isSubmitting?: boolean;
}

const NONE_VALUE = "__none__";

export function TaskForm({ defaultAnimalId, defaultAnimalTag, onSubmit, isSubmitting }: TaskFormProps) {
  const { t } = useTranslation("activities");
  const { currentUser } = useSupabaseAuth();
  const cabañaId = currentUser?.cabañaId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"alta" | "media" | "baja">("media");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState(NONE_VALUE);
  const [animalId, setAnimalId] = useState(defaultAnimalId || "");
  const [corralId, setCorralId] = useState(NONE_VALUE);
  const [animalSearch, setAnimalSearch] = useState(defaultAnimalTag || "");

  useEffect(() => {
    setAnimalId(defaultAnimalId || "");
    setAnimalSearch(defaultAnimalTag || "");
  }, [defaultAnimalId, defaultAnimalTag]);

  const { data: users } = useQuery({
    queryKey: ["activity-task-users", cabañaId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_cabana_member_directory");
      if (error) throw error;
      return (data || [])
        .filter((member: any) => member.is_active !== false)
        .map((member: any) => ({
          user_id: member.user_id,
          full_name: member.full_name,
          position: member.member_position,
        }))
        .sort((a: any, b: any) => (a.full_name || "").localeCompare(b.full_name || ""));
    },
    enabled: !!cabañaId,
  });

  const { data: corrales } = useQuery({
    queryKey: ["activity-task-corrales", cabañaId],
    queryFn: async () => {
      const { data, error } = await supabase.from("corrales").select("id, name").eq("cabaña_id", cabañaId!).order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!cabañaId,
  });

  const { data: animalResults } = useQuery({
    queryKey: ["activity-task-animal-search", cabañaId, animalSearch],
    queryFn: async () => {
      const search = animalSearch.replace(/[%,]/g, "").trim();
      const { data, error } = await supabase
        .from("animals")
        .select("id, id_tag, name")
        .eq("cabaña_id", cabañaId!)
        .not("status", "ilike", "vendido")
        .not("status", "ilike", "muerto")
        .or(`id_tag.ilike.%${search}%,name.ilike.%${search}%`)
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!cabañaId && !animalId && animalSearch.trim().length >= 2,
  });

  const handleFormSubmit = () => {
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      due_date: dueDate || null,
      assigned_to: assignedTo === NONE_VALUE ? null : assignedTo,
      animal_id: animalId || null,
      corral_id: corralId === NONE_VALUE ? null : corralId,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t("create.title")} *</Label>
        <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("create.titlePlaceholder")} />
      </div>

      <div className="space-y-2">
        <Label>{t("create.description")}</Label>
        <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("create.descPlaceholder")} rows={2} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("create.priority")}</Label>
          <Select value={priority} onValueChange={(value) => setPriority(value as typeof priority)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="alta">{t("priority.alta")}</SelectItem>
              <SelectItem value="media">{t("priority.media")}</SelectItem>
              <SelectItem value="baja">{t("priority.baja")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("create.dueDate")}</Label>
          <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("create.assignTo")}</Label>
        <Select value={assignedTo} onValueChange={setAssignedTo}>
          <SelectTrigger><SelectValue placeholder={t("create.unassigned")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>{t("create.unassigned")}</SelectItem>
            {(users || []).map((user) => (
              <SelectItem key={user.user_id} value={user.user_id}>
                {user.full_name || user.user_id}{user.position ? ` · ${user.position}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t("create.linkAnimal")}</Label>
        <Input
          value={animalSearch}
          onChange={(event) => {
            setAnimalSearch(event.target.value);
            if (!event.target.value) setAnimalId("");
          }}
          placeholder={t("create.searchAnimal")}
        />
        {animalId && (
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => { setAnimalId(""); setAnimalSearch(""); }}>
            {t("create.clearAnimal")}
          </Button>
        )}
        {!!animalResults?.length && !animalId && (
          <div className="max-h-32 overflow-y-auto rounded-md border bg-background">
            {animalResults.map((animal) => (
              <button
                key={animal.id}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  setAnimalId(animal.id);
                  setAnimalSearch(`${animal.id_tag}${animal.name ? ` — ${animal.name}` : ""}`);
                }}
              >
                <span className="font-mono">{animal.id_tag}</span>
                {animal.name && <span className="ml-2 text-muted-foreground">{animal.name}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>{t("create.linkCorral")}</Label>
        <Select value={corralId} onValueChange={setCorralId}>
          <SelectTrigger><SelectValue placeholder={t("create.none")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>{t("create.none")}</SelectItem>
            {(corrales || []).map((corral) => <SelectItem key={corral.id} value={corral.id}>{corral.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleFormSubmit} disabled={!title.trim() || isSubmitting} className="w-full">
        {isSubmitting ? t("create.creating") : t("create.submit")}
      </Button>
    </div>
  );
}
