import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  employeeCode?: string;
  position?: string;
  department?: string;
  cabañaId: string;
  role?: string;
  cabañaName?: string;
  username?: string;
  isActive: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, companyName?: string, country?: string, region?: string | null) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  currentUser: AuthUser | null;
  user: User | null;
  session: Session | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useSupabaseAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useSupabaseAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const fetchUserProfile = async (userId: string) => {
    try {
      // Get basic profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      // Get cabaña info separately
      let cabañaName = '';
      if (profile.cabaña_id) {
        const { data: cabañaData } = await supabase
          .from('cabañas')
          .select('name')
          .eq('id', profile.cabaña_id)
          .single();
        
        cabañaName = cabañaData?.name || '';
      }

      // Get user role
      const { data: roleData } = await supabase.rpc('get_user_role', {
        _user_id: userId
      });

      return {
        id: userId,
        email: profile.email || '',
        fullName: profile.full_name || '',
        employeeCode: profile.employee_code,
        position: profile.position,
        department: profile.department,
        cabañaId: profile.cabaña_id || '',
        role: roleData || 'employee',
        cabañaName: cabañaName,
        username: profile.username,
        isActive: profile.is_active ?? true
      };
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // User is logged in
          const userProfile = await fetchUserProfile(session.user.id);
          if (userProfile) {
            setCurrentUser(userProfile);
            setIsAuthenticated(true);
          } else {
            // Profile doesn't exist, create a basic one or handle error
            console.warn('No profile found for user');
            setIsAuthenticated(false);
          }
        } else {
          // User is logged out
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Auth state change will handle the session
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return { error: { message: error.message } };
      }
      
      return { error: null };
    } catch (error) {
      console.error('Error in signIn:', error);
      return { error: { message: 'Error de conexión' } };
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    fullName: string,
    companyName?: string,
    country: string = 'Argentina',
    region: string | null = null
  ) => {
    try {
      // First create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName
          }
        }
      });

      if (authError) {
        return { error: { message: authError.message } };
      }

      if (!authData.user) {
        return { error: { message: 'Error al crear usuario' } };
      }

      // Create company if provided
      let cabañaId = '';
      if (companyName) {
        const { data: cabañaData, error: cabañaError } = await supabase
          .from('cabañas')
          .insert({ name: companyName })
          .select()
          .single();

        if (cabañaError) {
          console.error('Error creating cabaña:', cabañaError);
          return { error: { message: 'Error al crear empresa' } };
        }

        cabañaId = cabañaData.id;

        // Create subscription for the company
        await supabase
          .from('subscriptions')
          .insert({
            cabaña_id: cabañaId,
            plan: 'free',
            max_animals: 50,
            max_users: 2
          });
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          email: email,
          full_name: fullName,
          cabaña_id: cabañaId || null,
          is_active: true,
          is_internal_profile: true
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        return { error: { message: 'Error al crear perfil' } };
      }

      // Assign admin role if creating a company
      if (companyName) {
        await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: 'admin'
          });
      }

      return { error: null };
    } catch (error) {
      console.error("Registration error:", error);
      return { error: { message: "Error de conexión. Intenta nuevamente." } };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUser(null);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        return { error: { message: error.message } };
      }
      
      return { error: null };
    } catch (error) {
      console.error('Error in resetPassword:', error);
      return { error: { message: 'Error de conexión' } };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        currentUser,
        user,
        session,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};