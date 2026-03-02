import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { setCabañaId, cleanupAutoSync } from "@/services/autoSync";
import { fullSync } from "@/services/dataSync";
import { db, CachedUserProfile, clearAllCaches } from "@/services/db";
import { clearCachedEntitlement } from "@/services/entitlementCache";

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
  isOffline: boolean;
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
  isOffline: false,
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

// Cache user profile to IndexedDB for offline access
async function cacheUserProfile(profile: AuthUser): Promise<void> {
  try {
    const cachedProfile: CachedUserProfile = {
      id: profile.id,
      user_id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      employeeCode: profile.employeeCode,
      position: profile.position,
      department: profile.department,
      cabañaId: profile.cabañaId,
      cabañaName: profile.cabañaName,
      role: profile.role,
      username: profile.username,
      isActive: profile.isActive,
      cached_at: new Date().toISOString()
    };
    await db.user_profile.put(cachedProfile);
    console.log('✅ User profile cached for offline access');
  } catch (error) {
    console.warn('⚠️ Failed to cache user profile:', error);
  }
}

// Load user profile from IndexedDB for offline access
async function loadCachedUserProfile(): Promise<AuthUser | null> {
  try {
    const profiles = await db.user_profile.toArray();
    if (profiles.length > 0) {
      const cached = profiles[0];
      console.log('📦 Loaded cached user profile for offline access');
      return {
        id: cached.user_id,
        email: cached.email,
        fullName: cached.fullName,
        employeeCode: cached.employeeCode,
        position: cached.position,
        department: cached.department,
        cabañaId: cached.cabañaId,
        cabañaName: cached.cabañaName,
        role: cached.role,
        username: cached.username,
        isActive: cached.isActive
      };
    }
    return null;
  } catch (error) {
    console.warn('⚠️ Failed to load cached user profile:', error);
    return null;
  }
}


export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Back online');
      setIsOffline(false);
    };
    const handleOffline = () => {
      console.log('📴 Gone offline');
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    console.log('👤 Fetching user profile for:', userId);
    try {
      console.log('[fetchUserProfile] Querying profiles table...');
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching profile:', error);
        return null;
      }

      if (!profile) {
        console.warn('⚠️ No profile found for authenticated user:', userId);
        return null;
      }

      console.log('[fetchUserProfile] Profile found, fetching cabaña & role...');

      // Fetch cabaña name and role IN PARALLEL for speed
      const cabañaPromise = profile.cabaña_id 
        ? supabase.from('cabañas').select('name').eq('id', profile.cabaña_id).maybeSingle()
        : Promise.resolve({ data: null });
      
      const rolePromise = (async () => {
        try {
          const { data } = await supabase.rpc('get_user_role', { _user_id: userId });
          return data || 'employee';
        } catch {
          return 'employee';
        }
      })();

      const [cabañaResult, userRole] = await Promise.all([cabañaPromise, rolePromise]);
      console.log('[fetchUserProfile] Done. Role:', userRole, 'Cabaña:', cabañaResult?.data?.name);

      return {
        id: userId,
        email: profile.email || '',
        fullName: profile.full_name || '',
        employeeCode: profile.employee_code,
        position: profile.position,
        department: profile.department,
        cabañaId: profile.cabaña_id || '',
        role: userRole,
        cabañaName: cabañaResult?.data?.name || '',
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
        .maybeSingle();
      
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
        phone: ownerData.phone,
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

  // Initialize auth with offline support
  useEffect(() => {
    let mounted = true;

    // ALWAYS register the auth listener so sign-in/sign-out events are captured
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log('🔐 Auth state change:', event, session ? 'session exists' : 'no session');
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('👤 User authenticated, fetching profile...');
          
          // Use setTimeout to avoid deadlocking Supabase internals
          setTimeout(async () => {
            if (!mounted) return;
            
            try {
              if (event === 'SIGNED_IN') {
                await handlePendingCabanaCreation(session.user.id);
              }
              
              const userProfile = await fetchUserProfile(session.user.id);
              if (userProfile && mounted) {
                console.log('✅ Profile loaded successfully:', userProfile.fullName);
                setCurrentUser(userProfile);
                setIsAuthenticated(true);
                setLoading(false);
                
                await cacheUserProfile(userProfile);
                
                if (userProfile.cabañaId) {
                  setCabañaId(userProfile.cabañaId);
                  fullSync(userProfile.cabañaId).catch(console.warn);
                }
              } else if (mounted) {
                console.warn('⚠️ Profile fetch returned null');
                // Still mark as authenticated if we have a session — profile may load later
                setIsAuthenticated(true);
                setLoading(false);
              }
            } catch (error) {
              console.error('💥 Error in auth state change handler:', error);
              // Session is valid, don't de-auth
              setIsAuthenticated(true);
              setLoading(false);
            }
          }, 0);
        } else {
          console.log('👤 No user session');
          setCurrentUser(null);
          setIsAuthenticated(false);
          setLoading(false);
        }
      }
    );

    const initializeAuth = async () => {
      const currentlyOffline = !navigator.onLine;
      console.log(`🔐 Initializing auth (offline: ${currentlyOffline})`);

      // If offline, try to load cached profile for immediate UI
      if (currentlyOffline) {
        const cachedProfile = await loadCachedUserProfile();
        if (cachedProfile && mounted) {
          console.log('📦 Offline: using cached profile');
          setCurrentUser(cachedProfile);
          setIsAuthenticated(true);
          setLoading(false);
          if (cachedProfile.cabañaId) {
            setCabañaId(cachedProfile.cabañaId);
          }
          return;
        }
      }

      // Online: Supabase will read session from IndexedDB via custom storage adapter
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('🔍 Initial session check:', session ? 'session exists' : 'no session', sessionError ? `error: ${sessionError.message}` : '');
        
        // If there's a session error (e.g. stale/corrupt token), clear everything and go to login
        if (sessionError) {
          console.warn('⚠️ Stale session detected, clearing caches...');
          try {
            await db.auth_storage.clear();
            await db.user_profile.clear();
            localStorage.removeItem('cached_subscription_status');
          } catch (e) {
            console.warn('Could not clear caches:', e);
          }
          await supabase.auth.signOut().catch(() => {});
          if (mounted) {
            setIsAuthenticated(false);
            setCurrentUser(null);
            setUser(null);
            setSession(null);
            setLoading(false);
          }
          return;
        }
        
        // If no session, stop loading
        if (!session && mounted) {
          setLoading(false);
        }
        // If session exists, onAuthStateChange callback handles the rest
      } catch (error) {
        console.error('❌ Failed to get session:', error);
        // Clear potentially corrupt session data
        try {
          await db.auth_storage.clear();
        } catch (_) {}
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
    // Cleanup auto-sync before signing out
    cleanupAutoSync();
    
    // Clear ALL local caches on logout for security
    try {
      await clearAllCaches();
      await db.outbox.clear();
      await db.id_map.clear();
      await db.user_profile.clear();
      await db.auth_storage.clear();
      // Clear entitlement cache so next user doesn't inherit subscription
      await clearCachedEntitlement();
      // Clear cached subscription status from localStorage
      localStorage.removeItem('cached_subscription_status');
      console.log('🧹 Cleared all local caches on logout');
    } catch (error) {
      console.warn('⚠️ Error clearing caches:', error);
    }
    
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
    isOffline,
    signIn,
    signOut,
    resetPassword,
    currentUser,
    user,
    session,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
