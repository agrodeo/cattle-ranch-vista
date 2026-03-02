import { useTranslation } from 'react-i18next';
import { type MedalTier, getTierNumberColor, getMedalIcon } from '@/lib/achievements';
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

const getTierCircleColor = (tier: MedalTier): string => {
  switch (tier) {
    case 'bronze': return '#b45309';
    case 'silver': return '#9ca3af';
    case 'gold': return '#d97706';
  }
};

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
  const circleColor = getTierCircleColor(medalTier);
  const numberColor = getTierNumberColor(medalTier);
  const medalEmoji = getMedalIcon(medalTier);
  const tierLabel = getTierLabel(medalTier, t);

  const congratsLine = t('common:achievements.story_congrats', {
    tier: tierLabel,
    name: t(nameKey),
    defaultValue: `agrodeo te otorga la medalla de ${tierLabel} por conseguir ${t(nameKey)}`,
  });

  return (
    <div
      ref={ref}
      id={`story-${achievementCode}-${medalTier}`}
      style={{
        width: '1080px',
        height: '1920px',
        background: '#f8fafb',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Top subtle gradient edge */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
        background: 'linear-gradient(90deg, #d1d5db, #9ca3af, #d1d5db)',
      }} />

      {/* Bottom subtle gradient edge */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px',
        background: 'linear-gradient(90deg, #d1d5db, #9ca3af, #d1d5db)',
      }} />

      {/* Content */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '0 100px',
        gap: '0',
      }}>
        {/* Brand */}
        <div style={{
          fontSize: '56px',
          fontWeight: 700,
          color: '#16a34a',
          fontStyle: 'italic',
          letterSpacing: '2px',
          marginBottom: '60px',
        }}>
          agrodeo
        </div>

        {/* Medal circle */}
        <div style={{
          width: '220px',
          height: '220px',
          borderRadius: '50%',
          border: `6px solid ${circleColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '60px',
          background: 'transparent',
        }}>
          <span style={{ fontSize: '100px', lineHeight: 1 }}>{medalEmoji}</span>
        </div>

        {/* Medalla de [Tier] */}
        <div style={{
          fontSize: '52px',
          fontWeight: 800,
          color: '#1e293b',
          marginBottom: '16px',
        }}>
          {t('common:achievements.medal_of', { tier: tierLabel, defaultValue: `Medalla de ${tierLabel}` })}
        </div>

        {/* Achievement Name */}
        <div style={{
          fontSize: '38px',
          fontWeight: 500,
          color: '#334155',
          marginBottom: '12px',
        }}>
          {t(nameKey)}
        </div>

        {/* Achievement Description */}
        <div style={{
          fontSize: '30px',
          fontWeight: 400,
          color: '#94a3b8',
          marginBottom: '60px',
          maxWidth: '700px',
        }}>
          {t(descriptionKey)}
        </div>

        {/* Separator */}
        <div style={{
          width: '600px',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, #d1d5db, transparent)',
          marginBottom: '50px',
        }} />

        {/* Threshold number + logros */}
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '14px',
          marginBottom: '12px',
        }}>
          <span style={{
            fontSize: '48px',
            fontWeight: 800,
            color: numberColor,
          }}>
            {threshold}
          </span>
          <span style={{
            fontSize: '32px',
            fontWeight: 400,
            color: '#94a3b8',
          }}>
            {t('common:achievements.logros', { defaultValue: 'logros' })}
          </span>
        </div>

        {/* Date */}
        <div style={{
          fontSize: '28px',
          color: '#94a3b8',
          fontWeight: 400,
          marginBottom: '60px',
        }}>
          {t('common:achievements.unlocked_on')} {new Date(unlockedAt).toLocaleDateString('es-ES', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </div>

        {/* Separator */}
        <div style={{
          width: '600px',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, #d1d5db, transparent)',
          marginBottom: '60px',
        }} />

        {/* Green congrats message at bottom */}
        <div style={{
          fontSize: '32px',
          fontWeight: 500,
          color: '#16a34a',
          lineHeight: 1.5,
          maxWidth: '750px',
        }}>
          {congratsLine}
        </div>
      </div>
    </div>
  );
});

AchievementStoryCard.displayName = 'AchievementStoryCard';
