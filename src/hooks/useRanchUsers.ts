import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";

export interface RanchUser {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  position: string | null;
  is_active: boolean;
  created_at: string;
  role: string;
}

export function useRanchUsers() {
  const { currentUser } = useSupabaseAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cabañaId = currentUser?.cabañaId;

  const usersQuery = useQuery({
    queryKey: ["ranch-users", cabañaId],
    queryFn: async (): Promise<RanchUser[]> => {
      if (!cabañaId) return [];

      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email, phone, position, is_active, created_at")
        .eq("cabaña_id", cabañaId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: role } = await supabase.rpc("get_user_role", {
            _user_id: profile.user_id,
          });
          return { ...profile, role: role || "read_only" };
        }),
      );

      return usersWithRoles as RanchUser[];
    },
    enabled: !!cabañaId,
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: {
      email: string;
      fullName: string;
      password: string;
      role: string;
      position?: string;
      phone?: string;
    }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) throw new Error("Tu sesión expiró. Volvé a iniciar sesión.");

      const response = await supabase.functions.invoke("create-ranch-user", {
        body: userData,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.error) {
        throw new Error(response.error.message || "Error al crear usuario");
      }

      const result = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
      if (result?.error) throw new Error(result.error);

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ranch-users", cabañaId] });
      toast({
        title: "Usuario creado",
        description: "El usuario fue creado exitosamente y ya puede iniciar sesión.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear usuario",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleUserActiveMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: isActive })
        .eq("user_id", userId)
        .eq("cabaña_id", cabañaId || "");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ranch-users", cabañaId] });
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo actualizar", description: error.message, variant: "destructive" });
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: role as any })
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ranch-users", cabañaId] });
      toast({
        title: "Rol actualizado",
        description: "El rol del usuario fue actualizado.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo actualizar el rol", description: error.message, variant: "destructive" });
    },
  });

  return {
    users: usersQuery.data || [],
    isLoading: usersQuery.isLoading,
    error: usersQuery.error,
    createUser: createUserMutation.mutateAsync,
    isCreating: createUserMutation.isPending,
    toggleUserActive: toggleUserActiveMutation.mutateAsync,
    updateUserRole: updateUserRoleMutation.mutateAsync,
  };
}
