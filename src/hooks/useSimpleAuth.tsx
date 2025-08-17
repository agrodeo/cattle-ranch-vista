import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SimpleAuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signUp: (companyName: string, ownerName: string, username: string, password: string) => Promise<{ error: any }>;
  signOut: () => void;
  currentUser: {
    id: string;
    username: string;
    fullName: string;
    employeeCode: string;
    position: string;
    department: string;
    cabañaId: string;
    role?: string;
    cabañaName?: string;
  } | null;
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

export const useSimpleAuth = () => {
  const context = useContext(SimpleAuthContext);
  if (!context) {
    throw new Error("useSimpleAuth must be used within a SimpleAuthProvider");
  }
  return context;
};

export const SimpleAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<SimpleAuthContextType['currentUser']>(null);

  useEffect(() => {
    // Verificar si hay una sesión guardada
    const savedAuth = localStorage.getItem('agrodeo_auth');
    if (savedAuth) {
      const authData = JSON.parse(savedAuth);
      if (authData.isAuthenticated && authData.timestamp && authData.currentUser) {
        // Verificar que la sesión no sea muy antigua (24 horas)
        const now = Date.now();
        const sessionAge = now - authData.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 horas en ms
        
        if (sessionAge < maxAge) {
          setIsAuthenticated(true);
          setCurrentUser(authData.currentUser);
        } else {
          localStorage.removeItem('agrodeo_auth');
        }
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      // Verificar credenciales del usuario individual
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
      
      // Obtener rol del usuario
      const { data: roleData } = await supabase.rpc('get_user_role_by_id', {
        user_uuid: userData.id
      });

      // Obtener información de la cabaña
      const { data: cabanaData } = await supabase.rpc('get_internal_user_cabana_info', {
        user_uuid: userData.id
      });

      const currentUser = {
        id: userData.id,
        username: userData.username || '',
        fullName: userData.full_name || '',
        employeeCode: userData.employee_code || '',
        position: userData.position || '',
        department: userData.department || '',
        cabañaId: userData.cabaña_id || '',
        role: roleData || 'employee',
        cabañaName: cabanaData?.[0]?.cabana_name || 'Sin asignar'
      };

      // Guardar sesión
      const authData = {
        isAuthenticated: true,
        timestamp: Date.now(),
        currentUser
      };
      localStorage.setItem('agrodeo_auth', JSON.stringify(authData));
      
      setIsAuthenticated(true);
      setCurrentUser(currentUser);
      
      return { error: null };
    } catch (error) {
      console.error('Error en signIn:', error);
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
      
      // Get user role
      const { data: roleData } = await supabase.rpc('get_user_role_by_id', {
        user_uuid: userData.id
      });

      // Get cabaña info
      const { data: cabanaData } = await supabase.rpc('get_internal_user_cabana_info', {
        user_uuid: userData.id
      });

      const currentUser = {
        id: userData.id,
        username: userData.username || '',
        fullName: userData.full_name || '',
        employeeCode: userData.employee_code || '',
        position: userData.position || '',
        department: userData.department || '',
        cabañaId: userData.cabaña_id || '',
        role: roleData || 'admin',
        cabañaName: cabanaData?.[0]?.cabana_name || 'Sin asignar'
      };

      // Save session
      const authData = {
        isAuthenticated: true,
        timestamp: Date.now(),
        currentUser
      };
      localStorage.setItem('agrodeo_auth', JSON.stringify(authData));
      
      setIsAuthenticated(true);
      setCurrentUser(currentUser);

      return { error: null };
    } catch (error) {
      console.error("Registration error:", error);
      return { error: { message: "Error de conexión. Intenta nuevamente." } };
    }
  };

  const signOut = () => {
    localStorage.removeItem('agrodeo_auth');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  return (
    <SimpleAuthContext.Provider
      value={{
        isAuthenticated,
        loading,
        signIn,
        signUp,
        signOut,
        currentUser,
      }}
    >
      {children}
    </SimpleAuthContext.Provider>
  );
};