import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const AuthConfirm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    return {
      tokenHash: sp.get("token_hash"),
      type: sp.get("type"),
    };
  }, [location.search]);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      const { tokenHash, type } = params;

      if (!tokenHash || !type) {
        setError("Enlace inválido o incompleto.");
        return;
      }

      try {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          type: type as any,
          token_hash: tokenHash,
        });

        if (cancelled) return;

        if (verifyError) {
          console.error("verifyOtp error:", verifyError);
          setError(verifyError.message);
          return;
        }

        // Recovery → go to reset-password (session is now set)
        if (type === "recovery") {
          navigate("/reset-password", { replace: true });
          return;
        }

        // All other types (signup confirmation, etc.) → dashboard
        navigate("/dashboard", { replace: true });
      } catch (err: any) {
        if (!cancelled) {
          console.error("AuthConfirm unexpected error:", err);
          setError(err.message || "Error inesperado");
        }
      }
    };

    verify();
    return () => { cancelled = true; };
  }, [navigate, params]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Enlace inválido o expirado</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/forgot-password" className="text-primary hover:underline">
              Volver a recuperar contraseña
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
};

export default AuthConfirm;
