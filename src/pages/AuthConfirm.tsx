import { useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const AuthConfirm = () => {
  const location = useLocation();

  const redirectUrl = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const tokenHash = params.get("token_hash");
    const type = params.get("type");
    const next = params.get("next") || params.get("redirect_to") || `${window.location.origin}/reset-password`;

    if (!tokenHash || !type) {
      return null;
    }

    const verifyUrl = new URL(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/verify`);
    verifyUrl.searchParams.set("token_hash", tokenHash);
    verifyUrl.searchParams.set("type", type);
    verifyUrl.searchParams.set("redirect_to", next);

    return verifyUrl.toString();
  }, [location.search]);

  useEffect(() => {
    if (redirectUrl) {
      window.location.replace(redirectUrl);
    }
  }, [redirectUrl]);

  if (!redirectUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Enlace inválido o expirado</CardTitle>
            <CardDescription>No pudimos validar este enlace de recuperación.</CardDescription>
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
