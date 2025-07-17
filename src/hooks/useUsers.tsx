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

  const getUserPassword = useCallback(async (userId: string) => {
    try {
      setLoadingPasswords(prev => ({ ...prev, [userId]: true }));
      
      const { data, error } = await supabase
        .from('user_passwords')
        .select('password_text')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data?.password_text) {
        setUserPasswords(prev => ({
          ...prev,
          [userId]: data.password_text
        }));
        return { success: true, password: data.password_text };
      }

      return { success: false, error: 'No password found' };
    } catch (error) {
      console.error(`Error getting user password for ${userId}:`, error);
      return { success: false, error };
    } finally {
      setLoadingPasswords(prev => ({ ...prev, [userId]: false }));
    }
  }, []);

  const loadAllPasswords = useCallback(async () => {
    if (!users.length) return;

    // Initialize loading states
    const loadingStates: Record<string, boolean> = {};
    users.forEach(user => {
      loadingStates[user.id] = true;
    });
    setLoadingPasswords(loadingStates);

    // Fetch all passwords in parallel
    const passwordPromises = users.map(user => getUserPassword(user.id));
    await Promise.all(passwordPromises);
  }, [users, getUserPassword]);

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