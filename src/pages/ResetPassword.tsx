import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

const ResetPassword = () => {
  const { t } = useTranslation(['auth', 'common']);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Restablecer contraseña | agrodeo";

    // Supabase sends recovery tokens in the URL hash fragment.
    // onAuthStateChange fires PASSWORD_RECOVERY once the session is set.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
        setChecking(false);
      }
    });

    // Also check if session is already set (e.g. page reload after redirect)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      }
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ title: t('common:validation.tooShort'), variant: "destructive" });
      return;
    }

    if (password !== confirm) {
      toast({ title: t('auth:messages.passwordMismatch'), variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({
        title: t('auth:messages.passwordUpdated', 'Contraseña actualizada'),
        description: t('auth:messages.loginWithNew', 'Ahora puedes iniciar sesión con tu nueva contraseña.'),
      });

      await supabase.auth.signOut();
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: t('common:errors.generic'),
        description: t('auth:messages.updateError', 'No se pudo actualizar la contraseña. El enlace puede haber expirado.'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('auth:messages.invalidLink', 'Enlace inválido o expirado')}</CardTitle>
            <CardDescription>{t('auth:messages.requestNew', 'Solicita un nuevo enlace de restablecimiento.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/forgot-password" className="text-primary hover:underline">
              {t('auth:forgotPassword.backToReset', 'Volver a recuperar contraseña')}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold">{t('auth:resetPassword.title', 'Restablecer contraseña')}</CardTitle>
          <CardDescription>{t('auth:resetPassword.subtitle', 'Ingresa tu nueva contraseña')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth:resetPassword.newPassword', 'Nueva contraseña')}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">{t('auth:register.confirmPassword')}</Label>
              <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('common:status.loading') : t('auth:resetPassword.submit', 'Actualizar contraseña')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
