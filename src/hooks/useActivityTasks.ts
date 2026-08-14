import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { toast } from "sonner";

export interface ActivityTask {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "completed";
  priority: "alta" | "media" | "baja";
  due_date: string | null;
  assigned_to: string | null;
  assigned_profile?: { full_name: string | null; email?: string | null } | null;
  created_by: string | null;
  creator_profile?: { full_name: string | null } | null;
  animal_id: string | null;
  animal?: { id_tag: string | null; name: string | null } | null;
  corral_id: string | null;
  corral?: { name: string } | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateActivityTaskInput {
  title: string;
  description?: string;
  priority?: "alta" | "media" | "baja";
  due_date?: string | null;
  assigned_to?: string | null;
  animal_id?: string | null;
  corral_id?: string | null;
}

type StatusFilter = "pending" | "completed" | "all";

const enrichTasks = async (rows: any[]): Promise<ActivityTask[]> => {
  const assigneeIds = [...new Set(rows.map((row) => row.assigned_to).filter(Boolean))];
  const creatorIds = [...new Set(rows.map((row) => row.created_by).filter(Boolean))];
  const animalIds = [...new Set(rows.map((row) => row.animal_id).filter(Boolean))];
  const corralIds = [...new Set(rows.map((row) => row.corral_id).filter(Boolean))];

  const [profilesResult, animalsResult, corralesResult] = await Promise.all([
    assigneeIds.length || creatorIds.length
      ? supabase.rpc("get_cabana_member_directory")
      : Promise.resolve({ data: [] as any[], error: null }),
    animalIds.length
      ? supabase.from("animals").select("id, id_tag, name").in("id", animalIds)
      : Promise.resolve({ data: [] as any[], error: null }),
    corralIds.length
      ? supabase.from("corrales").select("id, name").in("id", corralIds)
      : Promise.resolve({ data: [] as any[], error: null }),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (animalsResult.error) throw animalsResult.error;
  if (corralesResult.error) throw corralesResult.error;

  const profiles = new Map((profilesResult.data || []).map((profile: any) => [profile.user_id, profile]));
  const animals = new Map((animalsResult.data || []).map((animal: any) => [animal.id, animal]));
  const corrales = new Map((corralesResult.data || []).map((corral: any) => [corral.id, corral]));

  return rows.map((row) => ({
    ...row,
    assigned_profile: row.assigned_to ? profiles.get(row.assigned_to) || null : null,
    creator_profile: row.created_by ? profiles.get(row.created_by) || null : null,
    animal: row.animal_id ? animals.get(row.animal_id) || null : null,
    corral: row.corral_id ? corrales.get(row.corral_id) || null : null,
  })) as ActivityTask[];
};

export function useActivityTasks(statusFilter: StatusFilter = "all") {
  const { currentUser } = useSupabaseAuth();
  const cabañaId = currentUser?.cabañaId;

  return useQuery({
    queryKey: ["activity-tasks", cabañaId, statusFilter],
    queryFn: async () => {
      if (!cabañaId) return [];

      let query = (supabase as any)
        .from("activities")
        .select("id, title, description, status, priority, due_date, assigned_to, created_by, animal_id, corral_id, completed_at, completed_by, created_at, updated_at")
        .eq("cabaña_id", cabañaId)
        .eq("kind", "task")
        .order("status", { ascending: false })
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return enrichTasks(data || []);
    },
    enabled: !!cabañaId,
  });
}

export function useMyActivityTasks() {
  const { currentUser } = useSupabaseAuth();
  const cabañaId = currentUser?.cabañaId;
  const userId = currentUser?.id;

  return useQuery({
    queryKey: ["my-activity-tasks", cabañaId, userId],
    queryFn: async () => {
      if (!cabañaId || !userId) return { assignedToMe: [], createdByMe: [] };

      const baseSelect = "id, title, description, status, priority, due_date, assigned_to, created_by, animal_id, corral_id, completed_at, completed_by, created_at, updated_at";
      const [assignedResult, createdResult] = await Promise.all([
        (supabase as any)
          .from("activities")
          .select(baseSelect)
          .eq("cabaña_id", cabañaId)
          .eq("kind", "task")
          .eq("status", "pending")
          .eq("assigned_to", userId)
          .order("due_date", { ascending: true, nullsFirst: false }),
        (supabase as any)
          .from("activities")
          .select(baseSelect)
          .eq("cabaña_id", cabañaId)
          .eq("kind", "task")
          .eq("status", "pending")
          .eq("created_by", userId)
          .neq("assigned_to", userId)
          .order("due_date", { ascending: true, nullsFirst: false }),
      ]);

      if (assignedResult.error) throw assignedResult.error;
      if (createdResult.error) throw createdResult.error;

      const [assignedToMe, createdByMe] = await Promise.all([
        enrichTasks(assignedResult.data || []),
        enrichTasks(createdResult.data || []),
      ]);

      return { assignedToMe, createdByMe };
    },
    enabled: !!cabañaId && !!userId,
  });
}

export function useCreateActivityTask() {
  const queryClient = useQueryClient();
  const { currentUser } = useSupabaseAuth();

  return useMutation({
    mutationFn: async (input: CreateActivityTaskInput) => {
      if (!currentUser?.cabañaId || !currentUser?.id) throw new Error("Usuario no autenticado");

      const { data, error } = await (supabase as any)
        .from("activities")
        .insert({
          ...input,
          kind: "task",
          status: "pending",
          cabaña_id: currentUser.cabañaId,
          created_by: currentUser.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-activity-tasks"] });
      toast.success("Actividad creada");
    },
    onError: (err: any) => toast.error(`Error al crear actividad: ${err.message}`),
  });
}

export function useCompleteActivityTask() {
  const queryClient = useQueryClient();
  const { currentUser } = useSupabaseAuth();

  return useMutation({
    mutationFn: async (activityId: string) => {
      if (!currentUser?.id) throw new Error("Usuario no autenticado");
      const { error } = await (supabase as any)
        .from("activities")
        .update({ status: "completed", completed_at: new Date().toISOString(), completed_by: currentUser.id })
        .eq("id", activityId)
        .eq("kind", "task");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-activity-tasks"] });
      toast.success("Actividad completada");
    },
  });
}

export function useDeleteActivityTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await (supabase as any).from("activities").delete().eq("id", activityId).eq("kind", "task");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-activity-tasks"] });
      toast.success("Actividad eliminada");
    },
  });
}
