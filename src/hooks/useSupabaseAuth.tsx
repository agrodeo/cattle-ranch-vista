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

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  loading: true,
  currentUser: null,
  user: null,
  session: null,
  signIn: async () => ({ error: { message: 'Auth not initialized' } }),
  signUp: async () => ({ error: { message: 'Auth not initialized' } }),
  signOut: async () => {},
  resetPassword: async () => ({ error: { message: 'Auth not initialized' } }),
  
});

export const useSupabaseAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
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
    console.log('👤 Fetching user profile for:', userId);
    try {
      // Use maybeSingle and validate user_id strictly
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
        console.error('❌ Error fetching profile:', error);
        try {
          await supabase.rpc('log_security_event', {
            _action: 'profile_fetch_error',
            _table_name: 'profiles', 
            _details: { user_id: userId, error: error.message }
          });
        } catch (logError) {
          console.warn('Failed to log security event:', logError);
        }
        return null;
      }

      // If no profile found, this might be during signup process
      if (!profile) {
        console.warn('⚠️ No profile found for authenticated user - might be during signup:', userId);
        // Don't log as security event during signup process - this is expected
        return null;
      }

      console.log('✅ Profile found for user:', userId);

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
    console.log('🚀 Starting signup process for:', email);
    
    try {
      // First create the auth user with timeout
      console.log('📝 Creating auth user...');
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Signup timeout - please try again')), 15000); // 15 second timeout
      });
      
      const authPromise = supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName
          }
        }
      });
      
      console.log('⏱️ Waiting for auth response (15s timeout)...');
      const { data: authData, error: authError } = await Promise.race([authPromise, timeoutPromise]) as any;
      console.log('📬 Auth response received:', { authData: !!authData, authError: !!authError });

      if (authError) {
        console.error('❌ Auth error:', authError);
        try {
          await supabase.rpc('log_security_event', {
            _action: 'signup_auth_error',
            _table_name: 'auth.users',
            _details: { email, error: authError.message }
          });
        } catch (logError) {
          console.warn('Failed to log security event:', logError);
        }
        return { error: { message: authError.message } };
      }

      if (!authData.user) {
        console.error('❌ No user created despite success');
        try {
          await supabase.rpc('log_security_event', {
            _action: 'signup_no_user_created',
            _table_name: 'auth.users',
            _details: { email }
          });
        } catch (logError) {
          console.warn('Failed to log security event:', logError);
        }
        return { error: { message: 'Error al crear usuario' } };
      }

      console.log('✅ Auth user created successfully:', authData.user.id);

      // Create company if provided
      let cabañaId = '';
      if (companyName) {
        console.log('🏢 Starting cabaña creation process...');
        try {
          console.log('🏢 Creating cabaña:', companyName);
          console.log('🔍 About to call supabase.from(cabañas).insert...');
          const { data: cabañaData, error: cabañaError } = await supabase
            .from('cabañas')
            .insert({ name: companyName })
            .select()
            .single();
          
          console.log('🔍 Cabaña insert completed. Result:', { cabañaData, cabañaError });

          if (cabañaError) {
            console.error('❌ Error creating cabaña:', cabañaError);
            try {
              await supabase.rpc('log_security_event', {
                _action: 'signup_cabana_creation_failed',
                _table_name: 'cabañas',
                _details: { user_id: authData.user.id, company_name: companyName, error: cabañaError.message }
              });
            } catch (logError) {
              console.warn('Failed to log security event:', logError);
            }
            
            return { error: { message: 'Error al crear empresa: ' + cabañaError.message } };
          }

          cabañaId = cabañaData.id;
          console.log('✅ Cabaña created successfully:', cabañaId);
        } catch (error) {
          console.error('❌ Critical error during cabaña creation:', error);
          try {
            await supabase.rpc('log_security_event', {
              _action: 'signup_cabana_creation_exception',
              _table_name: 'cabañas', 
              _details: { user_id: authData.user.id, error: String(error) }
            });
          } catch (logError) {
            console.warn('Failed to log security event:', logError);
          }
          
          return { error: { message: 'Error crítico al crear empresa: ' + String(error) } };
        }

        // Create subscription for the company
        try {
          console.log('📝 Creating subscription for cabaña:', cabañaId);
          await supabase
            .from('subscriptions')
            .insert({
              cabaña_id: cabañaId,
              plan: 'free',
              max_animals: 50,
              max_users: 2
            });
          console.log('✅ Subscription created successfully');
        } catch (subError) {
          console.error('❌ Error creating subscription:', subError);
          // Continue with signup even if subscription fails
        }
      }

      // Create user profile
      try {
        console.log('👤 Creating user profile for:', authData.user.id);
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
          console.error('❌ Error creating profile:', profileError);
          try {
            await supabase.rpc('log_security_event', {
              _action: 'signup_profile_creation_failed',
              _table_name: 'profiles',
              _details: { user_id: authData.user.id, error: profileError.message }
            });
          } catch (logError) {
            console.warn('Failed to log security event:', logError);
          }
          
          return { error: { message: 'Error al crear perfil: ' + profileError.message } };
        }
        
        console.log('✅ User profile created successfully');
      } catch (error) {
        console.error('❌ Critical error during profile creation:', error);
        try {
          await supabase.rpc('log_security_event', {
            _action: 'signup_profile_creation_exception',
            _table_name: 'profiles',
            _details: { user_id: authData.user.id, error: String(error) }
          });
        } catch (logError) {
          console.warn('Failed to log security event:', logError);
        }
        
        return { error: { message: 'Error crítico al crear perfil: ' + String(error) } };
      }

      // Assign admin role if creating a company
      if (companyName) {
        try {
          console.log('👑 Assigning admin role to user');
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: authData.user.id,
              role: 'admin'
            });

          if (roleError) {
            console.error('❌ Error assigning admin role:', roleError);
            // Continue with signup even if role assignment fails
          } else {
            console.log('✅ Admin role assigned successfully');
          }
        } catch (roleErr) {
          console.error('❌ Exception assigning admin role:', roleErr);
          // Continue with signup even if role assignment fails
        }
      }

      // Log successful registration
      try {
        await supabase.rpc('log_security_event', {
          _action: 'successful_signup',
          _table_name: 'profiles',
          _details: { user_id: authData.user.id, cabana_id: cabañaId, has_company: !!companyName }
        });
      } catch (logError) {
        console.warn('Failed to log security event:', logError);
      }

      console.log('🎉 Signup completed successfully!');
      return { error: null };
    } catch (error) {
      console.error("❌ Registration error:", error);
      return { error: { message: "Error de conexión o timeout. Intenta nuevamente: " + String(error) } };
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