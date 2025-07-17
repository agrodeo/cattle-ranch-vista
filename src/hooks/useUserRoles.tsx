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
  const { user } = useAuth();
  const { users, loading: usersLoading, fetchUsers } = useUsers();
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  // Get current user's role
  useEffect(() => {
    const getCurrentUserRole = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .rpc('get_user_role', { _user_id: user.id });
        
        if (error) throw error;
        setCurrentUserRole(data);
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setRoleLoading(false);
      }
    };

    getCurrentUserRole();
  }, [user]);

  // Create new user
  const createUser = useCallback(async (email: string, password: string, fullName: string, role: UserRole) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email,
          password,
          fullName,
          role,
          requesterId: user?.id
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
  }, [user, fetchUsers]);

  // Update user
  const updateUser = useCallback(async (userId: string, updates: Partial<UserWithRole>) => {
    try {
      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: updates.full_name,
          email: updates.email,
          is_active: updates.is_active
        })
        .eq('id', userId);

      if (userError) throw userError;

      if (updates.role) {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: updates.role,
            created_by: user?.id
          });

        if (roleError) throw roleError;
      }

      await fetchUsers();
      return { success: true };
    } catch (error) {
      console.error('Error updating user:', error);
      return { success: false, error };
    }
  }, [user, fetchUsers]);

  // Delete user
  const deleteUser = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'delete_user',
          userId,
          requesterId: user?.id
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
  }, [user, fetchUsers]);

  // Change user password
  const changeUserPassword = useCallback(async (userId: string, newPassword: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'change_password',
          userId,
          newPassword,
          requesterId: user?.id
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
  }, [user]);

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