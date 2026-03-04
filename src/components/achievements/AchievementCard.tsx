import { useTranslation } from 'react-i18next';
import { Share2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type MedalTier } from '@/lib/achievements';
import { AchievementStoryCard, type StoryItemKey } from './AchievementStoryCard';
import { generateAchievementStoryImage } from '@/lib/achievementStoryImage';
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

/** Map achievement codes to story item keys */
function getItemKey(achievementCode: string): StoryItemKey {
  switch (achievementCode) {
    case 'herd_starter': return 'animals';
    case 'health_guardian': return 'vaccinations';
    case 'activity_tracker': return 'treatments';
    case 'financial_manager': return 'weights';
    default: return 'animals';
  }
}

function getTierAccentColor(tier: MedalTier): string {
  switch (tier) {
    case 'bronze': return '#CD7F32';
    case 'silver': return '#8C8C8C';
    case 'gold':   return '#DAA520';
  }
}

function getTierNumberColor(tier: MedalTier): string {
  switch (tier) {
    case 'bronze': return '#4a3728';
    case 'silver': return '#3d3d3d';
    case 'gold':   return '#5c4a00';
  }
}

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

  const itemKey = getItemKey(achievementCode);
  const itemLabel = t(`common:achievements.story.items.${itemKey}`);
  const accentColor = getTierAccentColor(medalTier);
  const numberColor = getTierNumberColor(medalTier);

  const handleDownload = async () => {
    if (!storyRef.current) return;
    const blob = await generateAchievementStoryImage(storyRef.current);
    if (!blob) {
      toast.error(t('common:fields.errorDownloadingImage'));
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `agrodeo-${achievementCode}-${threshold}.png`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t('common:fields.imageDownloaded'));
  };

  const handleShare = async () => {
    if (!storyRef.current) return;
    const blob = await generateAchievementStoryImage(storyRef.current);
    if (!blob) {
      toast.error(t('common:fields.errorDownloadingImage'));
      return;
    }
    const file = new File([blob], `agrodeo-${achievementCode}-${threshold}.png`, { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'agrodeo',
          text: `¡${threshold} ${itemLabel}!`,
        });
        onShare?.();
      } catch (error: any) {
        if (error.name !== 'AbortError') handleDownload();
      }
    } else {
      handleDownload();
      toast.info(t('common:fields.shareInstructions'));
    }
  };

  return (
    <div className="space-y-4">
      {/* Off-screen Story canvas */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <AchievementStoryCard
          ref={storyRef}
          userName={cabañaName}
          amount={threshold}
          itemKey={itemKey}
          medalTier={medalTier}
        />
      </div>

      {/* Visible preview card */}
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        <div className="flex flex-col items-center text-center py-8 px-6 space-y-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          <p className="text-sm font-extrabold italic leading-snug max-w-[260px]" style={{ color: accentColor }}>
            {t('common:achievements.story.header', { userName: cabañaName })}
          </p>
          <div className="flex items-center gap-0">
            <span className="text-4xl font-black italic" style={{ color: accentColor }}>¡</span>
            <span className="text-6xl font-black" style={{ color: numberColor }}>{threshold}</span>
            <span className="text-4xl font-black italic" style={{ color: accentColor }}>!</span>
          </div>
          <p className="text-3xl font-extrabold" style={{ color: accentColor }}>{itemLabel}</p>
          <div className="pt-2">
            <p className="text-xs font-bold italic" style={{ color: accentColor }}>agrodeo.farm</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleShare} className="flex-1" size="lg">
          <Share2 className="mr-2 h-4 w-4" />
          {t('common:achievements.story.share')}
        </Button>
        <Button onClick={handleDownload} variant="outline" size="lg">
          <Download className="mr-2 h-4 w-4" />
          {t('common:achievements.story.download')}
        </Button>
      </div>
    </div>
  );
}
