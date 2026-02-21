import { useTranslation } from 'react-i18next';
import { getMedalIcon, type MedalTier } from '@/lib/achievements';
import { forwardRef } from 'react';

interface AchievementStoryCardProps {
  achievementCode: string;
  nameKey: string;
  descriptionKey: string;
  medalTier: MedalTier;
  unlockedAt: string;
  progressValue: number;
}

const getTierColors = (tier: MedalTier) => {
  switch (tier) {
    case 'gold':
      return {
        bg: 'linear-gradient(180deg, #92400e 0%, #78350f 30%, #451a03 70%, #1c0f00 100%)',
        accent: '#fbbf24',
        accentLight: '#fde68a',
        glow: 'rgba(251, 191, 36, 0.4)',
        glowStrong: 'rgba(251, 191, 36, 0.6)',
        text: '#fef3c7',
        textMuted: '#fde68a',
        ring: '#f59e0b',
        sparkle: '#fbbf24',
      };
    case 'silver':
      return {
        bg: 'linear-gradient(180deg, #374151 0%, #1f2937 30%, #111827 70%, #030712 100%)',
        accent: '#9ca3af',
        accentLight: '#d1d5db',
        glow: 'rgba(156, 163, 175, 0.4)',
        glowStrong: 'rgba(156, 163, 175, 0.6)',
        text: '#f3f4f6',
        textMuted: '#d1d5db',
        ring: '#6b7280',
        sparkle: '#9ca3af',
      };
    case 'bronze':
      return {
        bg: 'linear-gradient(180deg, #78350f 0%, #451a03 30%, #292524 70%, #0c0a09 100%)',
        accent: '#d97706',
        accentLight: '#fbbf24',
        glow: 'rgba(217, 119, 6, 0.4)',
        glowStrong: 'rgba(217, 119, 6, 0.6)',
        text: '#fef3c7',
        textMuted: '#fde68a',
        ring: '#b45309',
        sparkle: '#d97706',
      };
  }
};

export const AchievementStoryCard = forwardRef<HTMLDivElement, AchievementStoryCardProps>(({
  achievementCode,
  nameKey,
  descriptionKey,
  medalTier,
  unlockedAt,
  progressValue,
}, ref) => {
  const { t } = useTranslation(['common']);
  const colors = getTierColors(medalTier);
  const medalEmoji = getMedalIcon(medalTier);
  const tierName = t(`common:achievements.tiers.${medalTier}`);

  return (
    <div
      ref={ref}
      id={`story-${achievementCode}-${medalTier}`}
      style={{
        width: '360px',
        height: '640px',
        background: colors.bg,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Decorative sparkles */}
      {[
        { top: '60px', left: '30px', size: '8px', opacity: 0.6 },
        { top: '120px', right: '40px', size: '6px', opacity: 0.4 },
        { top: '200px', left: '50px', size: '5px', opacity: 0.3 },
        { top: '380px', right: '60px', size: '7px', opacity: 0.5 },
        { top: '450px', left: '40px', size: '6px', opacity: 0.35 },
        { top: '500px', right: '30px', size: '5px', opacity: 0.25 },
        { top: '160px', left: '280px', size: '4px', opacity: 0.3 },
        { top: '320px', left: '20px', size: '5px', opacity: 0.2 },
      ].map((sparkle, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: sparkle.top,
            left: sparkle.left,
            right: (sparkle as any).right,
            width: sparkle.size,
            height: sparkle.size,
            backgroundColor: colors.sparkle,
            opacity: sparkle.opacity,
            transform: 'rotate(45deg)',
            borderRadius: '1px',
          }}
        />
      ))}

      {/* Subtle radial glow behind medal */}
      <div style={{
        position: 'absolute',
        top: '180px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '280px',
        height: '280px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
      }} />

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 30px 30px',
      }}>
        {/* Brand */}
        <div style={{
          fontSize: '24px',
          fontWeight: '800',
          color: colors.accent,
          letterSpacing: '2px',
          marginBottom: '8px',
        }}>
          agrodeo
        </div>
        <div style={{
          fontSize: '10px',
          color: colors.textMuted,
          opacity: 0.6,
          letterSpacing: '3px',
          textTransform: 'uppercase',
          marginBottom: '40px',
        }}>
          {t('common:achievements.branding_tagline')}
        </div>

        {/* Medal */}
        <div style={{
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${colors.accent}, ${colors.ring})`,
          padding: '4px',
          boxShadow: `0 0 40px ${colors.glowStrong}, 0 0 80px ${colors.glow}`,
          marginBottom: '8px',
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${colors.ring}, ${colors.accent})`,
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ fontSize: '64px' }}>{medalEmoji}</span>
            </div>
          </div>
        </div>

        {/* Tier label */}
        <div style={{
          fontSize: '13px',
          fontWeight: '700',
          color: colors.accent,
          letterSpacing: '4px',
          textTransform: 'uppercase',
          marginTop: '20px',
          marginBottom: '24px',
        }}>
          {t('common:achievements.medal')} {t('common:achievements.of')} {tierName}
        </div>

        {/* Divider */}
        <div style={{
          width: '60px',
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${colors.accent}, transparent)`,
          marginBottom: '24px',
        }} />

        {/* Achievement name */}
        <div style={{
          fontSize: '22px',
          fontWeight: '700',
          color: '#ffffff',
          textAlign: 'center',
          lineHeight: '1.3',
          marginBottom: '12px',
          maxWidth: '280px',
        }}>
          {t(nameKey)}
        </div>

        {/* Description */}
        <div style={{
          fontSize: '14px',
          color: colors.textMuted,
          textAlign: 'center',
          lineHeight: '1.5',
          marginBottom: '28px',
          maxWidth: '260px',
          opacity: 0.8,
        }}>
          {t(descriptionKey)}
        </div>

        {/* Stat pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 20px',
          borderRadius: '999px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          border: `1px solid rgba(255,255,255,0.15)`,
          marginBottom: '12px',
        }}>
          <span style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff' }}>
            {progressValue}
          </span>
          <span style={{ fontSize: '13px', color: colors.textMuted }}>
            {t('common:achievements.achievements_count')}
          </span>
        </div>

        {/* Date */}
        <div style={{
          fontSize: '12px',
          color: colors.textMuted,
          opacity: 0.5,
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
          width: '100%',
          borderTop: `1px solid rgba(255,255,255,0.08)`,
          paddingTop: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: colors.accent,
            letterSpacing: '1px',
          }}>
            agrodeo.com
          </div>
          <div style={{
            fontSize: '10px',
            color: 'rgba(255,255,255,0.3)',
          }}>
            {t('common:achievements.branding_tagline')}
          </div>
        </div>
      </div>
    </div>
  );
});

AchievementStoryCard.displayName = 'AchievementStoryCard';
