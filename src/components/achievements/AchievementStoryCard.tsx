import { useTranslation } from 'react-i18next';
import { type MedalTier, getTierNumberColor } from '@/lib/achievements';
import { forwardRef } from 'react';

interface AchievementStoryCardProps {
  achievementCode: string;
  nameKey: string;
  descriptionKey: string;
  medalTier: MedalTier;
  unlockedAt: string;
  progressValue: number;
  threshold: number;
  userName: string;
  cabañaName: string;
}

const getTierLabel = (tier: MedalTier, t: any) => t(`common:achievements.tiers.${tier}`);

export const AchievementStoryCard = forwardRef<HTMLDivElement, AchievementStoryCardProps>(({
  achievementCode,
  nameKey,
  descriptionKey,
  medalTier,
  unlockedAt,
  threshold,
  userName,
  cabañaName,
}, ref) => {
  const { t } = useTranslation(['common']);
  const numberColor = getTierNumberColor(medalTier);

  const congratsText = t(`common:achievements.congrats.${achievementCode}`, {
    user: userName,
    cabana: cabañaName,
    count: threshold,
  });

  return (
    <div
      ref={ref}
      id={`story-${achievementCode}-${medalTier}`}
      style={{
        width: '1080px',
        height: '1920px',
        background: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Top accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '6px',
        background: 'linear-gradient(90deg, #16a34a, #22c55e, #16a34a)',
      }} />

      {/* Bottom accent */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '6px',
        background: 'linear-gradient(90deg, #16a34a, #22c55e, #16a34a)',
      }} />

      {/* Content */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '120px 80px',
        gap: '0',
      }}>
        {/* Brand */}
        <div style={{ fontSize: '52px', fontWeight: 800, color: '#16a34a', letterSpacing: '4px', marginBottom: '16px' }}>
          agrodeo
        </div>
        <div style={{ fontSize: '22px', color: '#94a3b8', letterSpacing: '6px', textTransform: 'uppercase' as const, marginBottom: '100px' }}>
          {t('common:achievements.branding_tagline')}
        </div>

        {/* Decorative line */}
        <div style={{ width: '80px', height: '3px', backgroundColor: '#e2e8f0', marginBottom: '80px' }} />

        {/* Big Number */}
        <div style={{
          fontSize: '280px', fontWeight: 900, color: numberColor, lineHeight: 1, marginBottom: '20px',
        }}>
          {threshold}
        </div>

        {/* Tier label */}
        <div style={{
          fontSize: '28px', fontWeight: 600, color: numberColor, letterSpacing: '8px',
          textTransform: 'uppercase' as const, marginBottom: '80px',
        }}>
          {getTierLabel(medalTier, t)}
        </div>

        {/* Decorative line */}
        <div style={{ width: '80px', height: '3px', backgroundColor: '#e2e8f0', marginBottom: '80px' }} />

        {/* Congrats message */}
        <div style={{
          fontSize: '38px', fontWeight: 500, color: '#334155', lineHeight: 1.5,
          maxWidth: '800px', marginBottom: '60px',
        }}>
          {congratsText}
        </div>

        {/* Date */}
        <div style={{ fontSize: '26px', color: '#94a3b8', fontWeight: 400, marginBottom: '100px' }}>
          {t('common:achievements.unlocked_on')} {new Date(unlockedAt).toLocaleDateString('es-ES', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </div>

        {/* Bottom branding */}
        <div style={{ fontSize: '28px', fontWeight: 600, color: '#16a34a', letterSpacing: '2px' }}>
          agrodeo.com
        </div>
      </div>
    </div>
  );
});

AchievementStoryCard.displayName = 'AchievementStoryCard';
