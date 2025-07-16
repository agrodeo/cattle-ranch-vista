import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

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
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);

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
        setLoading(false);
      }
    };

    getCurrentUserRole();
  }, [user]);

  // Fetch all users (admin only)
  const fetchUsers = async () => {
    if (!user || currentUserRole !== 'admin') return;

    try {
      setLoading(true);
      
      // Get users with their roles
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*');

      if (usersError) throw usersError;

      // Get roles for all users
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine users with their roles
      const usersWithRoles = usersData.map(user => ({
        ...user,
        role: rolesData.find(role => role.user_id === user.id)?.role
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create new user
  const createUser = async (email: string, password: string, fullName: string, role: UserRole) => {
    try {
      // Create user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create user role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role,
            created_by: user?.id
          });

        if (roleError) throw roleError;

        // Store password for admin access
        const { error: passwordError } = await supabase
          .from('user_passwords')
          .insert({
            user_id: authData.user.id,
            password_text: password,
            created_by: user?.id
          });

        if (passwordError) throw passwordError;

        await fetchUsers();
        return { success: true };
      }
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, error };
    }
  };

  // Update user
  const updateUser = async (userId: string, updates: Partial<UserWithRole>) => {
    try {
      // Update user in users table
      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: updates.full_name,
          email: updates.email,
          is_active: updates.is_active
        })
        .eq('id', userId);

      if (userError) throw userError;

      // Update role if provided
      if (updates.role) {
        // Delete existing role
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        // Insert new role
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
  };

  // Delete user
  const deleteUser = async (userId: string) => {
    try {
      // Delete from auth.users (this will cascade to other tables)
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) throw error;

      await fetchUsers();
      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      return { success: false, error };
    }
  };

  // Get user password (admin only)
  const getUserPassword = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_passwords')
        .select('password_text')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return { success: true, password: data.password_text };
    } catch (error) {
      console.error('Error getting user password:', error);
      return { success: false, error };
    }
  };

  // Change user password
  const changeUserPassword = async (userId: string, newPassword: string) => {
    try {
      // Update password in auth using updateUserById
      const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword
      });

      if (authError) throw authError;

      // Update stored password
      const { error: passwordError } = await supabase
        .from('user_passwords')
        .update({ 
          password_text: newPassword,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (passwordError) throw passwordError;

      return { success: true };
    } catch (error) {
      console.error('Error changing user password:', error);
      return { success: false, error };
    }
  };

  // Check if current user has admin role
  const isAdmin = currentUserRole === 'admin';
  const isEmployee = currentUserRole === 'employee';
  const isReadOnly = currentUserRole === 'read_only';

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
    getUserPassword,
    changeUserPassword
  };
};