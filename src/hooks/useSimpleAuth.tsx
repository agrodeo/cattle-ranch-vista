import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SimpleAuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => void;
  sistemaInfo: { email: string; sistemaLabel: string } | null;
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
  const [sistemaInfo, setSistemaInfo] = useState<{ email: string; sistemaLabel: string } | null>(null);

  useEffect(() => {
    // Verificar si hay una sesión guardada
    const savedAuth = localStorage.getItem('agrodeo_auth');
    if (savedAuth) {
      const authData = JSON.parse(savedAuth);
      if (authData.isAuthenticated && authData.timestamp) {
        // Verificar que la sesión no sea muy antigua (24 horas)
        const now = Date.now();
        const sessionAge = now - authData.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 horas en ms
        
        if (sessionAge < maxAge) {
          setIsAuthenticated(true);
          setSistemaInfo(authData.sistemaInfo || null);
        } else {
          localStorage.removeItem('agrodeo_auth');
        }
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Verificar credenciales del sistema usando la función de la base de datos
      const { data, error } = await supabase.rpc('verify_sistema_login', {
        input_email: email,
        input_password: password
      });

      if (error) {
        return { error: { message: 'Error al verificar credenciales' } };
      }

      if (!data) {
        return { error: { message: 'Credenciales incorrectas' } };
      }

      // Obtener información del sistema
      const { data: sistemaData } = await supabase.rpc('get_sistema_credenciales');
      const sistemaInfo = sistemaData?.[0] ? {
        email: sistemaData[0].email,
        sistemaLabel: sistemaData[0].sistema_nombre
      } : null;

      // Guardar sesión
      const authData = {
        isAuthenticated: true,
        timestamp: Date.now(),
        sistemaInfo
      };
      localStorage.setItem('agrodeo_auth', JSON.stringify(authData));
      
      setIsAuthenticated(true);
      setSistemaInfo(sistemaInfo);
      
      return { error: null };
    } catch (error) {
      console.error('Error en signIn:', error);
      return { error: { message: 'Error de conexión' } };
    }
  };

  const signOut = () => {
    localStorage.removeItem('agrodeo_auth');
    setIsAuthenticated(false);
    setSistemaInfo(null);
  };

  return (
    <SimpleAuthContext.Provider
      value={{
        isAuthenticated,
        loading,
        signIn,
        signOut,
        sistemaInfo,
      }}
    >
      {children}
    </SimpleAuthContext.Provider>
  );
};