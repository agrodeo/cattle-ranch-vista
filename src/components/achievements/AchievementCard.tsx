import { useTranslation } from 'react-i18next';
import { Share2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { type MedalTier, getTierNumberColor } from '@/lib/achievements';
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
          title: `agrodeo`,
          text: t(`common:achievements.congrats.${achievementCode}`, {
            user: userName,
            cabana: cabañaName,
            count: threshold,
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

  const congratsText = t(`common:achievements.congrats.${achievementCode}`, {
    user: userName,
    cabana: cabañaName,
    count: threshold,
  });

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
          threshold={threshold}
          userName={userName}
          cabañaName={cabañaName}
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

          {/* Big Number */}
          <div style={{
            fontSize: '64px',
            fontWeight: 900,
            color: numberColor,
            lineHeight: 1,
            marginBottom: '16px',
          }}>
            {threshold}
          </div>

          {/* Congratulatory message */}
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '14px', color: '#475569', fontWeight: '500', lineHeight: '1.5' }}>
              {congratsText}
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
              {t('common:achievements.unlocked_on')} {new Date(unlockedAt).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </div>
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
