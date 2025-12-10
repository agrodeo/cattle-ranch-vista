import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { setCabañaId, cleanupAutoSync } from "@/services/autoSync";
import { fullSync } from "@/services/dataSync";
import { db, CachedUserProfile } from "@/services/db";

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

// Check if there's a valid cached Supabase session in localStorage
function getCachedSession(): { session: Session | null; user: User | null } {
  try {
    // Supabase stores session in localStorage with key pattern: sb-[project-ref]-auth-token
    const storageKey = 'sb-yjzxbjwewzyhjquhrfzv-auth-token';
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.access_token && parsed.user) {
        // Check if token is not expired (give some buffer)
        const expiresAt = parsed.expires_at ? parsed.expires_at * 1000 : 0;
        const now = Date.now();
        const bufferMs = 5 * 60 * 1000; // 5 minutes buffer
        
        if (expiresAt > now - bufferMs) {
          console.log('📦 Found valid cached session in localStorage');
          return {
            session: parsed as Session,
            user: parsed.user as User
          };
        } else {
          console.log('⏰ Cached session expired');
        }
      }
    }
    return { session: null, user: null };
  } catch (error) {
    console.warn('⚠️ Error reading cached session:', error);
    return { session: null, user: null };
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

    const initializeAuth = async () => {
      const currentlyOffline = !navigator.onLine;
      console.log(`🔐 Initializing auth (offline: ${currentlyOffline})`);

      // If offline, try to load cached auth data
      if (currentlyOffline) {
        console.log('📴 Offline mode - checking for cached credentials');
        const { session: cachedSession, user: cachedUser } = getCachedSession();
        const cachedProfile = await loadCachedUserProfile();

        if (cachedSession && cachedUser && cachedProfile) {
          console.log('✅ Loaded cached auth data for offline access');
          if (mounted) {
            setSession(cachedSession);
            setUser(cachedUser);
            setCurrentUser(cachedProfile);
            setIsAuthenticated(true);
            setLoading(false);

            // Initialize offline sync with cached cabaña
            if (cachedProfile.cabañaId) {
              setCabañaId(cachedProfile.cabañaId);
            }
          }
          return; // Don't try to contact Supabase when offline
        } else {
          console.log('❌ No cached credentials available for offline access');
          if (mounted) {
            setLoading(false);
          }
          return;
        }
      }

      // Online - use normal Supabase auth flow
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (!mounted) return;
          
          console.log('🔐 Auth state change:', event, session ? 'session exists' : 'no session');
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            console.log('👤 User authenticated, fetching profile...');
            
            // Handle async operations in setTimeout to avoid blocking auth state
            setTimeout(async () => {
              if (!mounted) return;
              
              try {
                // Handle pending cabaña creation on first sign in
                if (event === 'SIGNED_IN') {
                  await handlePendingCabanaCreation(session.user.id);
                }
                
                const userProfile = await fetchUserProfile(session.user.id);
                if (userProfile && mounted) {
                  console.log('✅ Profile loaded successfully:', userProfile.fullName);
                  setCurrentUser(userProfile);
                  setIsAuthenticated(true);
                  
                  // Cache profile for offline access
                  await cacheUserProfile(userProfile);
                  
                  // Initialize offline sync with user's cabaña
                  if (userProfile.cabañaId) {
                    console.log('🔄 Initializing offline sync for cabaña:', userProfile.cabañaId);
                    setCabañaId(userProfile.cabañaId);
                    
                    // Trigger initial full sync in background (don't block auth)
                    fullSync(userProfile.cabañaId).then(() => {
                      console.log('✅ Initial full sync completed');
                    }).catch((error) => {
                      console.warn('⚠️ Initial sync failed (will retry):', error);
                    });
                  }
                } else if (mounted) {
                  console.error('❌ Failed to load profile, but keeping user signed in for now');
                  setCurrentUser(null);
                  setIsAuthenticated(false);
                }
              } catch (error) {
                console.error('💥 Error in auth state change handler:', error);
                if (mounted) {
                  setCurrentUser(null);
                  setIsAuthenticated(false);
                }
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

      // Check for existing session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔍 Initial session check:', session ? 'session exists' : 'no session');
        // Auth state change will handle the session
      } catch (error) {
        console.error('❌ Failed to get session (possibly offline):', error);
        // Try offline fallback
        const { session: cachedSession, user: cachedUser } = getCachedSession();
        const cachedProfile = await loadCachedUserProfile();
        
        if (cachedSession && cachedUser && cachedProfile && mounted) {
          console.log('✅ Falling back to cached auth data');
          setSession(cachedSession);
          setUser(cachedUser);
          setCurrentUser(cachedProfile);
          setIsAuthenticated(true);
          setIsOffline(true);
          
          if (cachedProfile.cabañaId) {
            setCabañaId(cachedProfile.cabañaId);
          }
        }
        if (mounted) {
          setLoading(false);
        }
      }

      return () => {
        subscription.unsubscribe();
      };
    };

    initializeAuth();

    return () => {
      mounted = false;
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
    
    // Clear local caches on logout for security
    try {
      await db.animals_cache.clear();
      await db.corrales_cache.clear();
      await db.activities_cache.clear();
      await db.finances_cache.clear();
      await db.outbox.clear();
      await db.id_map.clear();
      await db.user_profile.clear(); // Clear cached user profile
      console.log('🧹 Cleared local caches on logout');
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
