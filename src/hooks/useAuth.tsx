import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  user_id: string;
  full_name?: string;
  email?: string;
  cabaña_id?: string;
}

interface UserRole {
  user_id: string;
  role: 'admin' | 'employee' | 'read_only';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  userRole: UserRole | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching user profile for:', userId);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
      } else {
        console.log('Profile data:', profileData);
      }

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (roleError) {
        console.error('Role fetch error:', roleError);
      } else {
        console.log('Role data:', roleData);
      }

      setProfile(profileData);
      setUserRole(roleData);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Set loading to false even on error to prevent infinite loading
      setLoading(false);
    }
  };

  useEffect(() => {
    let isInitialized = false;
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, !!session);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to prevent deadlock in auth state change callback
          setTimeout(() => {
            fetchUserProfile(session.user.id).finally(() => {
              if (!isInitialized) {
                setLoading(false);
                isInitialized = true;
              }
            });
          }, 0);
        } else {
          setProfile(null);
          setUserRole(null);
          if (!isInitialized) {
            setLoading(false);
            isInitialized = true;
          }
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', !!session);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id).finally(() => {
          if (!isInitialized) {
            setLoading(false);
            isInitialized = true;
          }
        });
      } else {
        if (!isInitialized) {
          setLoading(false);
          isInitialized = true;
        }
      }
    }).catch((error) => {
      console.error('Error getting initial session:', error);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: fullName
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isAuthenticated = !!user;
  const isAdmin = userRole?.role === 'admin';
  const isEmployee = userRole?.role === 'employee' || isAdmin;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      userRole,
      loading,
      isAuthenticated,
      isAdmin,
      isEmployee,
      signIn,
      signUp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};