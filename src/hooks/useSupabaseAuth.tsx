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
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching profile:', error);
        // Don't fail completely - try to create a basic profile
        console.log('⚠️ Creating basic profile for user:', userId);
        
        const { data: basicProfile, error: createError } = await supabase
          .from('profiles')
          .upsert({
            user_id: userId,
            email: '', // Will be updated later
            full_name: 'Usuario',
            is_active: true,
            is_internal_profile: true,
          })
          .select()
          .single();
          
        if (createError) {
          console.error('❌ Failed to create basic profile:', createError);
          return null;
        }
        
        return {
          id: userId,
          email: basicProfile.email || '',
          fullName: basicProfile.full_name || 'Usuario',
          employeeCode: basicProfile.employee_code,
          position: basicProfile.position,
          department: basicProfile.department,
          cabañaId: basicProfile.cabaña_id || '',
          role: 'employee',
          cabañaName: '',
          username: basicProfile.username,
          isActive: basicProfile.is_active ?? true
        };
      }

      if (!profile) {
        console.warn('⚠️ No profile found for authenticated user, creating one:', userId);
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            email: '',
            full_name: 'Usuario',
            is_active: true,
            is_internal_profile: true,
          })
          .select()
          .single();
          
        if (createError) {
          console.error('❌ Failed to create profile:', createError);
          return null;
        }
        
        return {
          id: userId,
          email: newProfile.email || '',
          fullName: newProfile.full_name || 'Usuario',
          employeeCode: newProfile.employee_code,
          position: newProfile.position,
          department: newProfile.department,
          cabañaId: newProfile.cabaña_id || '',
          role: 'employee',
          cabañaName: '',
          username: newProfile.username,
          isActive: newProfile.is_active ?? true
        };
      }

      // Get cabaña info
      let cabañaName = '';
      if (profile.cabaña_id) {
        try {
          const { data: cabañaData } = await supabase
            .from('cabañas')
            .select('name')
            .eq('id', profile.cabaña_id)
            .maybeSingle();
          
          cabañaName = cabañaData?.name || '';
        } catch (cabañaError) {
          console.warn('⚠️ Could not fetch cabaña info:', cabañaError);
        }
      }

      // Get user role safely
      let userRole = 'employee';
      try {
        const { data: roleData } = await supabase.rpc('get_user_role', {
          _user_id: userId
        });
        userRole = roleData || 'employee';
      } catch (roleError) {
        console.warn('⚠️ Could not fetch user role:', roleError);
      }

      return {
        id: userId,
        email: profile.email || '',
        fullName: profile.full_name || '',
        employeeCode: profile.employee_code,
        position: profile.position,
        department: profile.department,
        cabañaId: profile.cabaña_id || '',
        role: userRole,
        cabañaName: cabañaName,
        username: profile.username,
        isActive: profile.is_active ?? true
      };
    } catch (error) {
      console.error('💥 Critical error in fetchUserProfile:', error);
      return null;
    }
  };

  // Handle pending cabaña creation after email confirmation
  const handlePendingCabanaCreation = async (userId: string) => {
    try {
      const pendingCabana = localStorage.getItem('pending_cabana');
      const pendingOwnerData = localStorage.getItem('pending_owner_data');
      
      if (!pendingCabana || !pendingOwnerData) return;
      
      const cabanaData = JSON.parse(pendingCabana);
      const ownerData = JSON.parse(pendingOwnerData);
      
      // Check if user already has a cabaña
      const { data: existingCabana } = await supabase
        .from('cabañas')
        .select('id')
        .eq('owner_id', userId)
        .single();
      
      if (existingCabana) {
        // User already has a cabaña, cleanup pending data
        localStorage.removeItem('pending_cabana');
        localStorage.removeItem('pending_owner_data');
        return;
      }
      
      // Create the cabaña
      cabanaData.owner_id = userId;
      const { data: newCabana, error: cabanaError } = await supabase
        .from('cabañas')
        .insert(cabanaData)
        .select()
        .single();
      
      if (cabanaError) throw cabanaError;
      
      // Create subscription
      await supabase.from('subscriptions').insert({
        cabaña_id: newCabana.id,
        plan: 'free',
        max_animals: 50,
        max_users: 2,
      });
      
      // Create/update profile
      await supabase.from('profiles').upsert({
        user_id: userId,
        cabaña_id: newCabana.id,
        full_name: ownerData.full_name,
        email: ownerData.email,
        is_active: true,
        is_internal_profile: true,
      });
      
      // Assign admin role
      await supabase.from('user_roles').insert({
        user_id: userId,
        role: 'admin',
      });
      
      // Cleanup pending data
      localStorage.removeItem('pending_cabana');
      localStorage.removeItem('pending_owner_data');
      
      console.log('✅ Completed pending cabaña creation');
      
    } catch (error) {
      console.error('❌ Error creating pending cabaña:', error);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 Auth state change:', event, session ? 'session exists' : 'no session');
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('👤 User authenticated, fetching profile...');
          
          // Handle async operations in setTimeout to avoid blocking auth state
          setTimeout(async () => {
            try {
              // Handle pending cabaña creation on first sign in
              if (event === 'SIGNED_IN') {
                await handlePendingCabanaCreation(session.user.id);
              }
              
              const userProfile = await fetchUserProfile(session.user.id);
              if (userProfile) {
                console.log('✅ Profile loaded successfully:', userProfile.fullName);
                setCurrentUser(userProfile);
                setIsAuthenticated(true);
              } else {
                console.error('❌ Failed to load profile, but keeping user signed in for now');
                setCurrentUser(null);
                setIsAuthenticated(false);
                // Don't auto-sign out anymore - let user troubleshoot
              }
            } catch (error) {
              console.error('💥 Error in auth state change handler:', error);
              setCurrentUser(null);
              setIsAuthenticated(false);
            }
          }, 0);
        } else {
          console.log('👤 No user session');
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔍 Initial session check:', session ? 'session exists' : 'no session');
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
      
      return { error };
    } catch (error) {
      console.error('Error in signIn:', error);
      return { error: { message: 'Error de conexión' } };
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
      
      return { error };
    } catch (error) {
      console.error('Error in resetPassword:', error);
      return { error: { message: 'Error de conexión' } };
    }
  };

  const value = {
    isAuthenticated,
    loading,
    signIn,
    signOut,
    resetPassword,
    currentUser,
    user,
    session,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};