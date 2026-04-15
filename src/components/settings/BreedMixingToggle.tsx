import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export function BreedMixingToggle() {
  const { t } = useTranslation(['settings']);
  const { currentUser } = useSupabaseAuth();
  const [preventMixing, setPreventMixing] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.cabañaId) return;
    
    const fetch = async () => {
      const { data } = await supabase
        .from('herd_settings')
        .select('prevent_breed_mixing')
        .eq('cabaña_id', currentUser.cabañaId)
        .maybeSingle();
      
      if (data) {
        setPreventMixing(data.prevent_breed_mixing ?? true);
      }
      setLoading(false);
    };
    fetch();
  }, [currentUser?.cabañaId]);

  const handleToggle = async (checked: boolean) => {
    if (!currentUser?.cabañaId) return;
    setPreventMixing(checked);

    const { error } = await supabase
      .from('herd_settings')
      .upsert({
        cabaña_id: currentUser.cabañaId,
        country: 'AR',
        prevent_breed_mixing: checked,
      }, { onConflict: 'cabaña_id' });

    if (error) {
      setPreventMixing(!checked);
      toast.error(t('settings:breedMixing.errorSaving', 'Error al guardar la configuración'));
    } else {
      toast.success(
        checked
          ? t('settings:breedMixing.enabled', 'Protección de mezcla de razas activada')
          : t('settings:breedMixing.disabled', 'Protección de mezcla de razas desactivada')
      );
    }
  };

  if (loading) return null;

  return (
    <Card className="border-0 shadow-sm sm:border sm:shadow-md">
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ShieldAlert className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base sm:text-lg">
              {t('settings:breedMixing.title', 'Protección de Razas')}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-0.5">
              {t('settings:breedMixing.description', 'Evita que el optimizador de corrales mezcle animales de distintas razas')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Label htmlFor="prevent-breed-mixing" className="text-sm font-medium cursor-pointer flex-1 pr-4">
            {t('settings:breedMixing.label', 'No cruzar animales de distintas razas en corrales')}
            <p className="text-xs text-muted-foreground mt-1 font-normal">
              {t('settings:breedMixing.hint', 'Cuando está activado, el optimizador nunca sugerirá mover animales a corrales con otra raza y se generarán alertas si detecta mezcla existente.')}
            </p>
          </Label>
          <Switch
            id="prevent-breed-mixing"
            checked={preventMixing}
            onCheckedChange={handleToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
}
