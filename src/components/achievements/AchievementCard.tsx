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
        />
      </div>

      {/* Visible preview card (9:16 ratio) */}
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        <div className="flex flex-col items-center text-center py-8 px-6 space-y-3">
          <p className="text-sm font-extrabold italic text-primary leading-snug max-w-[260px]">
            {t('common:achievements.story.header', { userName: cabañaName })}
          </p>
          <div className="flex items-center gap-0">
            <span className="text-5xl font-black italic text-primary">¡</span>
            <span className="text-6xl font-black text-muted-foreground">{threshold}</span>
            <span className="text-5xl font-black italic text-primary">!</span>
          </div>
          <p className="text-3xl font-extrabold text-primary">{itemLabel}</p>
          <div className="pt-2">
            <p className="text-xs font-bold italic text-primary">agrodeo.farm</p>
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
