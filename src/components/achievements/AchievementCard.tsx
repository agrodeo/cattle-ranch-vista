import { useTranslation } from 'react-i18next';
import { Share2, Download, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getMedalColor, getMedalIcon, type MedalTier } from '@/lib/achievements';
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
  onShare?: () => void;
}

// Simplified colors for the visible preview card
const getMedalSolidColors = (tier: MedalTier) => {
  switch (tier) {
    case 'gold':
      return { bg: '#fbbf24', text: '#92400e', border: '#f59e0b' };
    case 'silver':
      return { bg: '#9ca3af', text: '#374151', border: '#6b7280' };
    case 'bronze':
      return { bg: '#d97706', text: '#78350f', border: '#b45309' };
  }
};

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
  const storyRef = useRef<HTMLDivElement>(null);

  const medalEmoji = getMedalIcon(medalTier);
  const tierName = t(`common:achievements.tiers.${medalTier}`);
  const solidColors = getMedalSolidColors(medalTier);

  const generateStoryImage = async (): Promise<Blob | null> => {
    const element = storyRef.current;
    if (!element) return null;

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: null,
        scale: 3,
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
    link.download = `agrodeo-story-${medalTier}-${achievementCode}.png`;
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

    const file = new File([blob], `agrodeo-story-${medalTier}-${achievementCode}.png`, { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `agrodeo - ${t('common:achievements.medal')} ${tierName}`,
          text: t('common:achievements.awarded_message', {
            tier: tierName,
            achievement: t(nameKey)
          }),
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
      {/* Off-screen Story canvas for capture */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <AchievementStoryCard
          ref={storyRef}
          achievementCode={achievementCode}
          nameKey={nameKey}
          descriptionKey={descriptionKey}
          medalTier={medalTier}
          unlockedAt={unlockedAt}
          progressValue={progressValue}
        />
      </div>

      {/* Visible preview card */}
      <Card
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '16px',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#16a34a' }}>
              agrodeo
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${solidColors.bg}, ${solidColors.border})`,
              padding: '3px',
              boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: '#fefefe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <span style={{ fontSize: '48px' }}>{medalEmoji}</span>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
              {t('common:achievements.medal')} {t('common:achievements.of')} {tierName}
            </h3>
            <p style={{ fontSize: '14px', color: '#475569', fontWeight: '500', marginBottom: '6px' }}>
              {t(nameKey)}
            </p>
            <p style={{ fontSize: '12px', color: '#64748b' }}>
              {t(descriptionKey)}
            </p>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#64748b',
            paddingTop: '12px',
            borderTop: '1px solid #e2e8f0',
          }}>
            <div>
              <span style={{ fontWeight: '600', color: '#1e293b' }}>{progressValue}</span>
              <span style={{ marginLeft: '4px' }}>{t('common:achievements.achievements_count')}</span>
            </div>
            <div>
              {t('common:achievements.unlocked_on')} {new Date(unlockedAt).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          </div>

          <div style={{ paddingTop: '12px' }}>
            <p style={{ fontSize: '14px', fontWeight: '500', color: '#16a34a' }}>
              {t('common:achievements.awarded_message', {
                tier: tierName,
                achievement: t(nameKey),
              })}
            </p>
          </div>
        </div>
      </Card>

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
