import { useTranslation } from 'react-i18next';
import { Share2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type MedalTier, getTierNumberColor, getMedalIcon } from '@/lib/achievements';
import { AchievementStoryCard } from './AchievementStoryCard';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { useRef } from 'react';

interface AchievementCardProps {
  achievementCode: string;
  nameKey: string;
  descriptionKey: string;
  medalTier: MedalTier;
  unlockedAt: string;
  progressValue: number;
  threshold: number;
  userName: string;
  cabañaName: string;
  onShare?: () => void;
}

const getTierCircleColor = (tier: MedalTier): string => {
  switch (tier) {
    case 'bronze': return '#b45309';
    case 'silver': return '#9ca3af';
    case 'gold': return '#d97706';
  }
};

export function AchievementCard({
  achievementCode,
  nameKey,
  descriptionKey,
  medalTier,
  unlockedAt,
  progressValue,
  threshold,
  userName,
  cabañaName,
  onShare
}: AchievementCardProps) {
  const { t } = useTranslation(['common']);
  const storyRef = useRef<HTMLDivElement>(null);
  const numberColor = getTierNumberColor(medalTier);
  const circleColor = getTierCircleColor(medalTier);
  const medalEmoji = getMedalIcon(medalTier);
  const tierLabel = t(`common:achievements.tiers.${medalTier}`);

  const congratsLine = t('common:achievements.story_congrats', {
    tier: tierLabel,
    name: t(nameKey),
    defaultValue: `agrodeo te otorga la medalla de ${tierLabel} por conseguir ${t(nameKey)}`,
  });

  const generateStoryImage = async (): Promise<Blob | null> => {
    const element = storyRef.current;
    if (!element) return null;

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#f8fafb',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
      });
    } catch (error) {
      console.error('Error generating story image:', error);
      return null;
    }
  };

  const handleDownload = async () => {
    const blob = await generateStoryImage();
    if (!blob) {
      toast.error(t('common:fields.errorDownloadingImage'));
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `agrodeo-${medalTier}-${achievementCode}.png`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t('common:fields.imageDownloaded'));
  };

  const handleShare = async () => {
    const blob = await generateStoryImage();
    if (!blob) {
      toast.error(t('common:fields.errorDownloadingImage'));
      return;
    }

    const file = new File([blob], `agrodeo-${medalTier}-${achievementCode}.png`, { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'agrodeo',
          text: congratsLine,
        });
        onShare?.();
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          handleDownload();
        }
      }
    } else {
      handleDownload();
      toast.info(t('common:fields.shareInstructions'));
    }
  };

  return (
    <div className="space-y-4">
      {/* Off-screen Story canvas — Instagram story size */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <AchievementStoryCard
          ref={storyRef}
          achievementCode={achievementCode}
          nameKey={nameKey}
          descriptionKey={descriptionKey}
          medalTier={medalTier}
          unlockedAt={unlockedAt}
          progressValue={progressValue}
          threshold={threshold}
          userName={userName}
          cabañaName={cabañaName}
        />
      </div>

      {/* Visible preview card — mirrors the story layout */}
      <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
        <div className="flex flex-col items-center text-center py-8 px-6 space-y-4">
          {/* Brand */}
          <p className="text-base font-bold text-primary italic tracking-wide">agrodeo</p>

          {/* Medal circle */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ border: `3px solid ${circleColor}` }}
          >
            <span className="text-3xl">{medalEmoji}</span>
          </div>

          {/* Medalla de [Tier] */}
          <h3 className="text-lg font-extrabold text-foreground">
            {t('common:achievements.medal_of', { tier: tierLabel, defaultValue: `Medalla de ${tierLabel}` })}
          </h3>

          {/* Achievement Name */}
          <p className="text-sm font-medium text-foreground/80">{t(nameKey)}</p>

          {/* Achievement Description */}
          <p className="text-xs text-muted-foreground">{t(descriptionKey)}</p>

          {/* Separator */}
          <div className="w-48 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Threshold + logros */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold" style={{ color: numberColor }}>{threshold}</span>
            <span className="text-sm text-muted-foreground">
              {t('common:achievements.logros', { defaultValue: 'logros' })}
            </span>
          </div>

          {/* Date */}
          <span className="text-xs text-muted-foreground/60">
            {t('common:achievements.unlocked_on')}{' '}
            {new Date(unlockedAt).toLocaleDateString('es-ES', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </span>

          {/* Separator */}
          <div className="w-48 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Green congrats */}
          <p className="text-xs font-medium text-primary leading-relaxed max-w-[280px]">
            {congratsLine}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleShare} className="flex-1" size="lg">
          <Share2 className="mr-2 h-4 w-4" />
          {t('common:achievements.share_story')}
        </Button>
        <Button onClick={handleDownload} variant="outline" size="lg">
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
