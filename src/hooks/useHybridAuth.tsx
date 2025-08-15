import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface HybridUser {
  id: string;
  username?: string;
  email?: string;
  fullName: string;
  employeeCode?: string;
  position?: string;
  department?: string;
  cabañaId: string;
  role?: string;
  cabañaName?: string;
  authType: 'supabase' | 'custom';
}

interface HybridAuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  signInAdmin: (email: string, password: string) => Promise<{ error: any }>;
  signInEmployee: (username: string, password: string) => Promise<{ error: any }>;
  signUp: (companyName: string, ownerName: string, username: string, password: string) => Promise<{ error: any }>;
  signOut: () => void;
  currentUser: HybridUser | null;
  user: User | null;
  session: Session | null;
}

const HybridAuthContext = createContext<HybridAuthContextType | undefined>(undefined);

export const useHybridAuth = () => {
  const context = useContext(HybridAuthContext);
  if (!context) {
    throw new Error("useHybridAuth must be used within a HybridAuthProvider");
  }
  return context;
};

export const HybridAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<HybridUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Set up Supabase auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check if this is a Supabase Auth user with profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
          
          if (profile) {
            // This is a Supabase Auth user
            const hybridUser: HybridUser = {
              id: session.user.id,
              email: session.user.email,
              fullName: profile.full_name || session.user.email || '',
              cabañaId: '', // Will need to get from profiles
              authType: 'supabase',
              role: 'admin' // Default role for Supabase users
            };
            
            setCurrentUser(hybridUser);
            setIsAuthenticated(true);
          }
        } else {
          // Check for custom auth session in localStorage
          const savedAuth = localStorage.getItem('agrodeo_auth');
          if (savedAuth) {
            const authData = JSON.parse(savedAuth);
            if (authData.isAuthenticated && authData.timestamp && authData.currentUser) {
              const now = Date.now();
              const sessionAge = now - authData.timestamp;
              const maxAge = 24 * 60 * 60 * 1000; // 24 hours
              
              if (sessionAge < maxAge) {
                setCurrentUser({ ...authData.currentUser, authType: 'custom' });
                setIsAuthenticated(true);
              } else {
                localStorage.removeItem('agrodeo_auth');
              }
            }
          }
        }
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // Check for custom auth session if no Supabase session
        const savedAuth = localStorage.getItem('agrodeo_auth');
        if (savedAuth) {
          const authData = JSON.parse(savedAuth);
          if (authData.isAuthenticated && authData.timestamp && authData.currentUser) {
            const now = Date.now();
            const sessionAge = now - authData.timestamp;
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            
            if (sessionAge < maxAge) {
              setCurrentUser({ ...authData.currentUser, authType: 'custom' });
              setIsAuthenticated(true);
            } else {
              localStorage.removeItem('agrodeo_auth');
            }
          }
        }
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInAdmin = async (email: string, password: string) => {
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
      console.error('Error en signInAdmin:', error);
      return { error: { message: 'Error de conexión' } };
    }
  };

  const signInEmployee = async (username: string, password: string) => {
    try {
      const { data, error } = await supabase.rpc('verify_user_login', {
        input_username: username,
        input_password: password
      });

      if (error) {
        return { error: { message: 'Error al verificar credenciales' } };
      }

      if (!data || data.length === 0 || !data[0].success) {
        return { error: { message: 'Credenciales incorrectas' } };
      }

      const userData = data[0].user_data as any;
      
      const { data: roleData } = await supabase.rpc('get_user_role_by_id', {
        user_uuid: userData.id
      });

      const { data: cabanaData } = await supabase.rpc('get_user_cabana_info', {
        user_uuid: userData.id
      });

      const hybridUser: HybridUser = {
        id: userData.id,
        username: userData.username || '',
        fullName: userData.full_name || '',
        employeeCode: userData.employee_code || '',
        position: userData.position || '',
        department: userData.department || '',
        cabañaId: userData.cabaña_id || '',
        role: roleData || 'employee',
        cabañaName: cabanaData?.[0]?.cabana_name || 'Sin asignar',
        authType: 'custom'
      };

      const authData = {
        isAuthenticated: true,
        timestamp: Date.now(),
        currentUser: hybridUser
      };
      localStorage.setItem('agrodeo_auth', JSON.stringify(authData));
      
      setIsAuthenticated(true);
      setCurrentUser(hybridUser);
      
      return { error: null };
    } catch (error) {
      console.error('Error en signInEmployee:', error);
      return { error: { message: 'Error de conexión' } };
    }
  };

  const signUp = async (companyName: string, ownerName: string, username: string, password: string) => {
    try {
      const { data, error } = await supabase.rpc('create_company_with_owner', {
        company_name: companyName,
        owner_name: ownerName,
        owner_username: username,
        owner_password: password
      });

      if (error || !data?.[0]?.success) {
        return { error: { message: data?.[0]?.error_message || 'Error al crear la cuenta' } };
      }

      const userData = data[0].user_data as any;
      
      const { data: roleData } = await supabase.rpc('get_user_role_by_id', {
        user_uuid: userData.id
      });

      const { data: cabanaData } = await supabase.rpc('get_user_cabana_info', {
        user_uuid: userData.id
      });

      const hybridUser: HybridUser = {
        id: userData.id,
        username: userData.username || '',
        fullName: userData.full_name || '',
        employeeCode: userData.employee_code || '',
        position: userData.position || '',
        department: userData.department || '',
        cabañaId: userData.cabaña_id || '',
        role: roleData || 'admin',
        cabañaName: cabanaData?.[0]?.cabana_name || 'Sin asignar',
        authType: 'custom'
      };

      const authData = {
        isAuthenticated: true,
        timestamp: Date.now(),
        currentUser: hybridUser
      };
      localStorage.setItem('agrodeo_auth', JSON.stringify(authData));
      
      setIsAuthenticated(true);
      setCurrentUser(hybridUser);

      return { error: null };
    } catch (error) {
      console.error("Registration error:", error);
      return { error: { message: "Error de conexión. Intenta nuevamente." } };
    }
  };

  const signOut = async () => {
    // Sign out from Supabase if there's a session
    if (session) {
      await supabase.auth.signOut();
    }
    
    // Clear custom auth
    localStorage.removeItem('agrodeo_auth');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUser(null);
    setSession(null);
  };

  return (
    <HybridAuthContext.Provider
      value={{
        isAuthenticated,
        loading,
        signInAdmin,
        signInEmployee,
        signUp,
        signOut,
        currentUser,
        user,
        session,
      }}
    >
      {children}
    </HybridAuthContext.Provider>
  );
};