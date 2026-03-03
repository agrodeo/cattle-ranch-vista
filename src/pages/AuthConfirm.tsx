import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

type ConfirmParams = {
  tokenHash: string | null;
  type: string | null;
  redirectTo: string | null;
};

const AuthConfirm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const params = useMemo<ConfirmParams>(() => {
    const searchParams = new URLSearchParams(location.search);
    return {
      tokenHash: searchParams.get("token_hash"),
      type: searchParams.get("type"),
      redirectTo: searchParams.get("redirect_to") || searchParams.get("next"),
    };
  }, [location.search]);

  useEffect(() => {
    let active = true;

    const runVerification = async () => {
      if (!params.tokenHash || !params.type) {
        if (active) setError("Enlace inválido o incompleto");
        return;
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({
        type: params.type as any,
        token_hash: params.tokenHash,
      });

      if (verifyError) {
        if (active) setError(verifyError.message);
        return;
      }

      if (params.type === "recovery") {
        navigate("/reset-password", { replace: true });
        return;
      }

      if (params.redirectTo) {
        if (params.redirectTo.startsWith("http")) {
          const url = new URL(params.redirectTo);
          if (url.origin === window.location.origin) {
            navigate(`${url.pathname}${url.search}${url.hash}`, { replace: true });
          } else {
            window.location.replace(params.redirectTo);
          }
        } else {
          navigate(params.redirectTo, { replace: true });
        }
        return;
      }

      navigate("/dashboard", { replace: true });
    };

    runVerification();

    return () => {
      active = false;
    };
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
