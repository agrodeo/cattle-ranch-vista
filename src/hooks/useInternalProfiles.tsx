import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ProfileRole = 'admin' | 'employee' | 'read_only';

export interface InternalProfile {
  id: string;
  username?: string;
  full_name?: string;
  email?: string;
  employee_code?: string;
  position?: string;
  department?: string;
  hire_date?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  role?: ProfileRole;
  cabaña_id?: string;
  is_internal_profile: boolean;
}

export const useInternalProfiles = () => {
  const { user, profile } = useAuth();
  const [profiles, setProfiles] = useState<InternalProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // Obtener todos los perfiles internos
  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      
      // Obtener usuarios/perfiles internos
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('is_internal_profile', true)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Obtener roles de cada perfil
      const profilesWithRoles: InternalProfile[] = [];
      
      for (const user of usersData || []) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .limit(1);

        profilesWithRoles.push({
          ...user,
          role: roleData?.[0]?.role || 'employee'
        });
      }

      setProfiles(profilesWithRoles);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Crear nuevo perfil interno
  const createProfile = useCallback(async (profileData: {
    username: string;
    full_name?: string;
    position?: string;
    department?: string;
    role: ProfileRole;
    password: string;
  }) => {
    try {
      if (!user || !profile?.cabaña_id) {
        throw new Error('Usuario no autenticado o sin cabaña asignada');
      }

      // Generate employee code
      const employeeCode = `USR${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      // Crear perfil interno usando el ID del usuario autenticado como created_by
      const userId = crypto.randomUUID();
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          username: profileData.username,
          full_name: profileData.full_name || profileData.username,
          employee_code: employeeCode,
          position: profileData.position || 'Empleado',
          department: profileData.department || 'General',
          is_internal_profile: true,
          is_active: true,
          cabaña_id: profile.cabaña_id,
          hire_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (userError) throw userError;

      // Crear contraseña
      const { error: passwordError } = await supabase
        .from('user_passwords')
        .insert({
          user_id: userId,
          password_text: profileData.password,
          created_by: user.id
        });

      if (passwordError) throw passwordError;

      // Asignar rol
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: profileData.role,
          created_by: user.id
        });

      if (roleError) throw roleError;

      await fetchProfiles();
      return { success: true };
    } catch (error) {
      console.error('Error creating profile:', error);
      return { success: false, error };
    }
  }, [fetchProfiles, user, profile]);

  // Actualizar perfil interno
  const updateProfile = useCallback(async (profileId: string, updates: Partial<InternalProfile>) => {
    try {
      // Actualizar datos del perfil
      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: updates.full_name,
          email: updates.email,
          employee_code: updates.employee_code,
          position: updates.position,
          department: updates.department,
          hire_date: updates.hire_date,
          is_active: updates.is_active
        })
        .eq('id', profileId);

      if (userError) throw userError;

      // Actualizar rol si se proporciona
      if (updates.role) {
        // Eliminar rol existente
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', profileId);

        // Insertar nuevo rol
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: profileId,
            role: updates.role,
            created_by: null
          });

        if (roleError) throw roleError;
      }

      await fetchProfiles();
      return { success: true };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error };
    }
  }, [fetchProfiles]);

  // Eliminar perfil interno
  const deleteProfile = useCallback(async (profileId: string) => {
    try {
      // Eliminar roles asociados
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', profileId);

      // Eliminar perfil
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', profileId)
        .eq('is_internal_profile', true);

      if (error) throw error;

      await fetchProfiles();
      return { success: true };
    } catch (error) {
      console.error('Error deleting profile:', error);
      return { success: false, error };
    }
  }, [fetchProfiles]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return {
    profiles,
    loading,
    fetchProfiles,
    createProfile,
    updateProfile,
    deleteProfile
  };
};