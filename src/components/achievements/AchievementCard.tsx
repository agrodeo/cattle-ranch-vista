import { useTranslation } from 'react-i18next';
import { Share2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getMedalColor, getMedalIcon, type MedalTier } from '@/lib/achievements';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

interface AchievementCardProps {
  achievementCode: string;
  nameKey: string;
  descriptionKey: string;
  medalTier: MedalTier;
  unlockedAt: string;
  progressValue: number;
  onShare?: () => void;
}

export function AchievementCard({
  achievementCode,
  nameKey,
  descriptionKey,
  medalTier,
  unlockedAt,
  progressValue,
  onShare
}: AchievementCardProps) {
  const { t } = useTranslation(['common']);
  
  const medalGradient = getMedalColor(medalTier);
  const medalEmoji = getMedalIcon(medalTier);
  const tierName = medalTier === 'gold' ? 'Oro' : medalTier === 'silver' ? 'Plata' : 'Bronce';

  const handleDownload = async () => {
    const element = document.getElementById(`achievement-${achievementCode}`);
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      
      const link = document.createElement('a');
      link.download = `agrodeo-medalla-${medalTier}-${achievementCode}.png`;
      link.href = canvas.toDataURL();
      link.click();
      
      toast.success('Imagen descargada');
    } catch (error) {
      toast.error('Error al descargar la imagen');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Agrodeo - Medalla de ${tierName}`,
          text: `¡Desbloqueé una medalla de ${tierName} en Agrodeo por ${t(nameKey)}!`,
          url: window.location.origin
        });
        onShare?.();
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      handleDownload();
    }
  };

  return (
    <div className="space-y-4">
      <Card 
        id={`achievement-${achievementCode}`}
        className="relative overflow-hidden p-8 bg-gradient-to-br from-background to-muted"
      >
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent" />
        </div>

        <div className="relative z-10 space-y-6 text-center">
          {/* Logo/Brand */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              AgroDeo
            </span>
          </div>

          {/* Medal */}
          <div className="flex justify-center">
            <div className={`relative w-32 h-32 rounded-full bg-gradient-to-br ${medalGradient} p-1 animate-scale-in`}>
              <div className="w-full h-full rounded-full bg-background/95 flex items-center justify-center">
                <span className="text-6xl">{medalEmoji}</span>
              </div>
              
              {/* Shine effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/20 to-transparent animate-pulse" />
            </div>
          </div>

          {/* Achievement Text */}
          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-foreground">
              Medalla de {tierName}
            </h3>
            <p className="text-lg text-muted-foreground font-medium">
              {t(nameKey)}
            </p>
            <p className="text-sm text-muted-foreground">
              {t(descriptionKey)}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground pt-4 border-t border-border/50">
            <div>
              <span className="font-semibold text-foreground">{progressValue}</span>
              <span className="ml-1">logros</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div>
              Desbloqueado {new Date(unlockedAt).toLocaleDateString('es-ES', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric' 
              })}
            </div>
          </div>

          {/* Message */}
          <div className="pt-4">
            <p className="text-base font-medium text-primary">
              AgroDeo te otorga la medalla de {tierName} por conseguir {t(nameKey)}
            </p>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleShare}
          className="flex-1"
          size="lg"
        >
          <Share2 className="mr-2 h-4 w-4" />
          Compartir en Redes
        </Button>
        <Button
          onClick={handleDownload}
          variant="outline"
          size="lg"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}