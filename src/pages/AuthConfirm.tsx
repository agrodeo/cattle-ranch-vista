import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const AuthConfirm = () => {
  const { t } = useTranslation(['auth']);
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const hashParams = new URLSearchParams(location.hash.startsWith("#") ? location.hash.slice(1) : location.hash);

    return {
      tokenHash: searchParams.get("token_hash") ?? hashParams.get("token_hash"),
      token: searchParams.get("token") ?? hashParams.get("token"),
      type: searchParams.get("type") ?? hashParams.get("type"),
    };
  }, [location.search, location.hash]);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      const { tokenHash, token, type } = params;

      if (!type || (!tokenHash && !token)) {
        setError(t('auth:messages.invalidLink'));
        return;
      }

      try {
        const payload = tokenHash
          ? ({ type: type as any, token_hash: tokenHash } as const)
          : ({ type: type as any, token: token as string } as const);

        const { error: verifyError } = await supabase.auth.verifyOtp(payload as any);

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
          setError(err.message || t('auth:messages.invalidLink'));
        }
      }
    };

    verify();
    return () => { cancelled = true; };
  }, [navigate, params, t]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('auth:messages.invalidLink')}</CardTitle>
            <CardDescription>{t('auth:messages.requestNew')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/forgot-password" className="text-primary hover:underline">
              {t('auth:forgotPassword.backToReset')}
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
