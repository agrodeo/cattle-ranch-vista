import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUsers } from "./useUsers";
import { useCallback } from "react";

export type UserRole = 'admin' | 'employee' | 'read_only';

export interface UserWithRole {
  id: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
  role?: UserRole;
  cabaña_id: string | null;
  password?: string;
}

export const useUserRoles = () => {
  const { user: currentUser } = useAuth();
  const { users, loading: usersLoading, fetchUsers } = useUsers();
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  // Get current user's role
  useEffect(() => {
    const getCurrentUserRole = async () => {
      if (!currentUser) return;
      
      try {
        const { data, error } = await supabase
          .rpc('get_user_role', { _user_id: currentUser.id });
        
        if (error) throw error;
        setCurrentUserRole(data);
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setRoleLoading(false);
      }
    };

    getCurrentUserRole();
  }, [currentUser]);

  // Create new user
  const createUser = useCallback(async (email: string, password: string, fullName: string, role: UserRole) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email,
          password,
          fullName,
          role,
          requesterId: currentUser?.id
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      await fetchUsers();
      return { success: true };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, error };
    }
  }, [currentUser, fetchUsers]);

  // Update user
  const updateUser = useCallback(async (userId: string, updates: Partial<UserWithRole>) => {
    try {
      console.log('Updating user:', userId, 'with updates:', updates);
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .update({
          full_name: updates.full_name,
          email: updates.email,
          is_active: updates.is_active
        })
        .eq('id', userId)
        .select();

      if (userError) {
        console.error('User update error:', userError);
        throw userError;
      }

      console.log('User updated successfully:', userData);

      if (updates.role) {
        console.log('Updating role to:', updates.role);
        
        const { error: deleteRoleError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        if (deleteRoleError) {
          console.error('Error deleting old role:', deleteRoleError);
          throw deleteRoleError;
        }

        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: updates.role,
            created_by: currentUser?.id
          });

        if (roleError) {
          console.error('Role update error:', roleError);
          throw roleError;
        }
        
        console.log('Role updated successfully');
      }

      await fetchUsers();
      return { success: true };
    } catch (error) {
      console.error('Error updating user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      return { success: false, error: errorMessage };
    }
  }, [currentUser, fetchUsers]);

  // Delete user
  const deleteUser = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'delete_user',
          userId,
          requesterId: currentUser?.id
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      await fetchUsers();
      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      return { success: false, error };
    }
  }, [currentUser, fetchUsers]);

  // Change user password
  const changeUserPassword = useCallback(async (userId: string, newPassword: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'change_password',
          userId,
          newPassword,
          requesterId: currentUser?.id
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      return { success: true };
    } catch (error) {
      console.error('Error changing user password:', error);
      return { success: false, error };
    }
  }, [currentUser]);

  // Check if current user has admin role
  const isAdmin = currentUserRole === 'admin';
  const isEmployee = currentUserRole === 'employee';
  const isReadOnly = currentUserRole === 'read_only';

  const loading = roleLoading || usersLoading;

  return {
    currentUserRole,
    users,
    loading,
    isAdmin,
    isEmployee,
    isReadOnly,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    changeUserPassword
  };
};