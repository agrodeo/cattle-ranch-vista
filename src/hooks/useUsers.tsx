import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserWithRole } from "./useUserRoles";
import { useCallback } from "react";

export const useUsers = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [userPasswords, setUserPasswords] = useState<Record<string, string>>({});
  const [loadingPasswords, setLoadingPasswords] = useState<Record<string, boolean>>({});

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get users and roles in parallel
      const [usersResponse, rolesResponse] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('user_roles').select('user_id, role')
      ]);

      if (usersResponse.error) throw usersResponse.error;
      if (rolesResponse.error) throw rolesResponse.error;

      // Combine users with their roles
      const usersWithRoles = usersResponse.data.map(user => ({
        ...user,
        role: rolesResponse.data.find(role => role.user_id === user.id)?.role
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Password retrieval removed for security - passwords are now encrypted and cannot be retrieved
  const getUserPassword = useCallback(async (userId: string) => {
    // This function has been disabled for security reasons
    console.warn('Password retrieval is disabled for security. Passwords are encrypted and cannot be viewed.');
    return { success: false, password: null, message: 'Password retrieval disabled for security' };
  }, []);

  // Password loading disabled for security
  const loadAllPasswords = useCallback(async () => {
    console.warn('Bulk password loading is disabled for security reasons.');
    setLoadingPasswords({});
  }, []);

  return {
    users,
    loading,
    userPasswords,
    loadingPasswords,
    fetchUsers,
    getUserPassword,
    loadAllPasswords
  };
};