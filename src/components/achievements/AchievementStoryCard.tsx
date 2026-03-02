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
        width: '360px',
        height: '640px',
        background: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Top green accent bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: 'linear-gradient(90deg, #16a34a, #22c55e)',
      }} />

      {/* Bottom green accent bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: 'linear-gradient(90deg, #22c55e, #16a34a)',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 36px',
        textAlign: 'center',
      }}>
        {/* Brand */}
        <div style={{
          fontSize: '22px',
          fontWeight: '800',
          color: '#16a34a',
          letterSpacing: '2px',
          marginBottom: '6px',
        }}>
          agrodeo
        </div>
        <div style={{
          fontSize: '10px',
          color: '#94a3b8',
          letterSpacing: '3px',
          textTransform: 'uppercase',
          marginBottom: '48px',
        }}>
          {t('common:achievements.branding_tagline')}
        </div>

        {/* Decorative line */}
        <div style={{
          width: '40px',
          height: '2px',
          backgroundColor: '#e2e8f0',
          marginBottom: '32px',
        }} />

        {/* Big Number */}
        <div style={{
          fontSize: '96px',
          fontWeight: 900,
          color: numberColor,
          lineHeight: 1,
          marginBottom: '12px',
        }}>
          {threshold}
        </div>

        {/* Decorative line */}
        <div style={{
          width: '40px',
          height: '2px',
          backgroundColor: '#e2e8f0',
          marginTop: '20px',
          marginBottom: '28px',
        }} />

        {/* Congratulatory message */}
        <div style={{
          fontSize: '16px',
          fontWeight: '500',
          color: '#334155',
          lineHeight: '1.6',
          maxWidth: '280px',
          marginBottom: '32px',
        }}>
          {congratsText}
        </div>

        {/* Date */}
        <div style={{
          fontSize: '12px',
          color: '#94a3b8',
          fontWeight: '400',
        }}>
          {t('common:achievements.unlocked_on')} {new Date(unlockedAt).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Bottom branding */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#16a34a',
            letterSpacing: '1px',
          }}>
            agrodeo.com
          </div>
        </div>
      </div>
    </div>
  );
});

AchievementStoryCard.displayName = 'AchievementStoryCard';
