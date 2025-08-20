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
  signInEmployee: (username: string, password: string) => Promise<{ error: any }>;
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
      // CRITICAL SECURITY FIX: Use maybeSingle and validate user_id strictly
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // Log security event for audit
      try {
        await supabase.rpc('log_security_event', {
          _action: 'profile_fetch_attempt',
          _table_name: 'profiles',
          _details: { requested_user_id: userId, found_profile: !!profile }
        });
      } catch {} // Don't fail if logging fails

      if (error) {
        console.error('Error fetching profile:', error);
        try {
          await supabase.rpc('log_security_event', {
            _action: 'profile_fetch_error',
            _table_name: 'profiles', 
            _details: { user_id: userId, error: error.message }
          });
        } catch {}
        return null;
      }

      // CRITICAL: If no profile found, do not authenticate
      if (!profile) {
        console.warn('No profile found for authenticated user:', userId);
        try {
          await supabase.rpc('log_security_event', {
            _action: 'profile_not_found',
            _table_name: 'profiles',
            _details: { user_id: userId }
          });
        } catch {}
        return null;
      }

      // CRITICAL: Validate that profile belongs to the authenticated user
      if (profile.user_id !== userId) {
        console.error('SECURITY VIOLATION: Profile mismatch detected!', { 
          expected: userId, 
          actual: profile.user_id 
        });
        try {
          await supabase.rpc('log_security_event', {
            _action: 'security_violation_profile_mismatch',
            _table_name: 'profiles',
            _details: { expected_user_id: userId, actual_user_id: profile.user_id }
          });
        } catch {}
        throw new Error('Security violation detected');
      }

      // Get cabaña info separately - SECURITY FIX: Use maybeSingle
      let cabañaName = '';
      if (profile.cabaña_id) {
        const { data: cabañaData, error: cabañaError } = await supabase
          .from('cabañas')
          .select('name')
          .eq('id', profile.cabaña_id)
          .maybeSingle();
        
        if (cabañaError) {
          console.error('Error fetching cabaña:', cabañaError);
          try {
            await supabase.rpc('log_security_event', {
              _action: 'cabana_fetch_error',
              _table_name: 'cabañas',
              _details: { cabana_id: profile.cabaña_id, error: cabañaError.message }
            });
          } catch {}
        }
        
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
          // User is logged in - CRITICAL SECURITY FIX
          try {
            const userProfile = await fetchUserProfile(session.user.id);
            if (userProfile) {
              setCurrentUser(userProfile);
              setIsAuthenticated(true);
              try {
                await supabase.rpc('log_security_event', {
                  _action: 'successful_login',
                  _table_name: 'profiles',
                  _details: { user_id: session.user.id, cabana_id: userProfile.cabañaId }
                });
              } catch {}
            } else {
              // CRITICAL: Profile doesn't exist - DO NOT AUTHENTICATE
              console.error('Authentication failed: No valid profile found for user:', session.user.id);
              try {
                await supabase.rpc('log_security_event', {
                  _action: 'authentication_failed_no_profile',
                  _table_name: 'profiles',
                  _details: { user_id: session.user.id }
                });
              } catch {}
              
              // Force sign out to prevent security breach
              await supabase.auth.signOut();
              setCurrentUser(null);
              setIsAuthenticated(false);
            }
          } catch (error) {
            // CRITICAL: If any error in profile fetching, DO NOT AUTHENTICATE
            console.error('Critical security error during authentication:', error);
            try {
              await supabase.rpc('log_security_event', {
                _action: 'authentication_security_error',
                _table_name: 'profiles',
                _details: { user_id: session.user.id, error: String(error) }
              });
            } catch {}
            
            // Force sign out
            await supabase.auth.signOut();
            setCurrentUser(null);
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
        try {
          await supabase.rpc('log_security_event', {
            _action: 'signup_auth_error',
            _table_name: 'auth.users',
            _details: { email, error: authError.message }
          });
        } catch {}
        return { error: { message: authError.message } };
      }

      if (!authData.user) {
        try {
          await supabase.rpc('log_security_event', {
            _action: 'signup_no_user_created',
            _table_name: 'auth.users',
            _details: { email }
          });
        } catch {}
        return { error: { message: 'Error al crear usuario' } };
      }

      // Create company if provided - CRITICAL SECURITY FIX
      let cabañaId = '';
      if (companyName) {
        try {
          const { data: cabañaData, error: cabañaError } = await supabase
            .from('cabañas')
            .insert({ name: companyName })
            .select()
            .single();

          if (cabañaError) {
            console.error('Error creating cabaña:', cabañaError);
            try {
              await supabase.rpc('log_security_event', {
                _action: 'signup_cabana_creation_failed',
                _table_name: 'cabañas',
                _details: { user_id: authData.user.id, company_name: companyName, error: cabañaError.message }
              });
            } catch {}
            
            // CRITICAL: If cabaña creation fails, cleanup user
            try {
              await supabase.auth.admin.deleteUser(authData.user.id);
            } catch {}
            return { error: { message: 'Error al crear empresa' } };
          }

          cabañaId = cabañaData.id;
        } catch (error) {
          console.error('Critical error during cabaña creation:', error);
          try {
            await supabase.rpc('log_security_event', {
              _action: 'signup_cabana_creation_exception',
              _table_name: 'cabañas', 
              _details: { user_id: authData.user.id, error: String(error) }
            });
          } catch {}
          
          // Cleanup user
          try {
            await supabase.auth.admin.deleteUser(authData.user.id);
          } catch {}
          return { error: { message: 'Error crítico al crear empresa' } };
        }

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

      // Create user profile - CRITICAL SECURITY FIX  
      try {
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
          try {
            await supabase.rpc('log_security_event', {
              _action: 'signup_profile_creation_failed',
              _table_name: 'profiles',
              _details: { user_id: authData.user.id, error: profileError.message }
            });
          } catch {}
          
          // CRITICAL: Cleanup user and cabaña if profile creation fails
          if (cabañaId) {
            try {
              await supabase.from('cabañas').delete().eq('id', cabañaId);
            } catch {}
          }
          try {
            await supabase.auth.admin.deleteUser(authData.user.id);
          } catch {}
          return { error: { message: 'Error al crear perfil' } };
        }
      } catch (error) {
        console.error('Critical error during profile creation:', error);
        try {
          await supabase.rpc('log_security_event', {
            _action: 'signup_profile_creation_exception',
            _table_name: 'profiles',
            _details: { user_id: authData.user.id, error: String(error) }
          });
        } catch {}
        
        // Cleanup
        if (cabañaId) {
          try {
            await supabase.from('cabañas').delete().eq('id', cabañaId);
          } catch {}
        }
        try {
          await supabase.auth.admin.deleteUser(authData.user.id);
        } catch {}
        return { error: { message: 'Error crítico al crear perfil' } };
      }

      // Assign admin role if creating a company - CRITICAL SECURITY FIX
      if (companyName) {
        try {
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: authData.user.id,
              role: 'admin'
            });
            
          if (roleError) {
            console.error('Error assigning admin role:', roleError);
            try {
              await supabase.rpc('log_security_event', {
                _action: 'signup_role_assignment_failed',
                _table_name: 'user_roles',
                _details: { user_id: authData.user.id, error: roleError.message }
              });
            } catch {}
            
            // CRITICAL: Full cleanup if role assignment fails
            try {
              await supabase.from('profiles').delete().eq('user_id', authData.user.id);
            } catch {}
            if (cabañaId) {
              try {
                await supabase.from('cabañas').delete().eq('id', cabañaId);
              } catch {}
            }
            try {
              await supabase.auth.admin.deleteUser(authData.user.id);
            } catch {}
            return { error: { message: 'Error al asignar permisos de administrador' } };
          }
        } catch (error) {
          console.error('Critical error during role assignment:', error);
          try {
            await supabase.rpc('log_security_event', {
              _action: 'signup_role_assignment_exception',
              _table_name: 'user_roles',
              _details: { user_id: authData.user.id, error: String(error) }
            });
          } catch {}
          
          // Full cleanup
          try {
            await supabase.from('profiles').delete().eq('user_id', authData.user.id);
          } catch {}
          if (cabañaId) {
            try {
              await supabase.from('cabañas').delete().eq('id', cabañaId);
            } catch {}
          }
          try {
            await supabase.auth.admin.deleteUser(authData.user.id);
          } catch {}
          return { error: { message: 'Error crítico al asignar permisos' } };
        }
      }

      // Log successful registration
      try {
        await supabase.rpc('log_security_event', {
          _action: 'successful_signup',
          _table_name: 'profiles',
          _details: { user_id: authData.user.id, cabana_id: cabañaId, has_company: !!companyName }
        });
      } catch {}

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

  const signInEmployee = async (username: string, password: string) => {
    try {
      const { data, error } = await supabase.rpc('verify_user_login', {
        input_username: username,
        input_password: password
      });
      
      if (error) {
        console.error('Employee login error:', error);
        return { error: { message: 'Error al verificar credenciales' } };
      }
      
      if (!data || !Array.isArray(data) || data.length === 0 || !data[0].success || !data[0].user_data) {
        return { error: { message: 'Usuario o contraseña incorrectos' } };
      }
      
      // Manually set the current user for employees
      const userData = data[0].user_data as any;
      const employeeUser: AuthUser = {
        id: userData.id,
        email: userData.email || '',
        fullName: userData.full_name || '',
        employeeCode: userData.employee_code,
        position: userData.position,
        department: userData.department,
        cabañaId: userData.cabaña_id || '',
        role: 'employee',
        cabañaName: '',
        username: userData.username,
        isActive: userData.is_active ?? true
      };
      
      setCurrentUser(employeeUser);
      setIsAuthenticated(true);
      setLoading(false);
      
      return { error: null };
    } catch (error: any) {
      console.error('Error in signInEmployee:', error);
      return { error: { message: 'Error al iniciar sesión, verifica tus credenciales' } };
    }
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
        signInEmployee,
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