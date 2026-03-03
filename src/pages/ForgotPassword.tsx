import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const ForgotPassword = () => {
  const { t } = useTranslation(['auth', 'common']);
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Recuperar contraseña | agrodeo"; // SEO title
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(identifier, {
        redirectTo: window.location.origin
      });
      
      if (error) throw error;
      
      toast({
        title: t('auth:messages.passwordResetSent'),
        description: t('auth:messages.checkEmail', 'Si el email existe, recibirás instrucciones para restablecer tu contraseña.'),
      });
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: t('common:errors.generic'),
        description: t('auth:messages.passwordResetError'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold">{t('auth:forgotPassword.title')}</CardTitle>
          <CardDescription>{t('auth:forgotPassword.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">{t('auth:forgotPassword.email')}</Label>
              <Input
                id="identifier"
                type="email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={t('auth:login.emailPlaceholder', 'tu@email.com')}
                required
              />
            </div>
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              <p className="font-medium mb-1">{t('auth:forgotPassword.employeeQuestion', '¿Eres empleado?')}</p>
              <p>{t('auth:forgotPassword.employeeNote', 'Los empleados deben contactar al administrador para cambiar su contraseña.')}</p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('common:status.loading') : t('auth:forgotPassword.submit')}
            </Button>
            <div className="text-center text-sm">
              <Link to="/auth" className="text-primary hover:underline">{t('auth:forgotPassword.backToLogin')}</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
