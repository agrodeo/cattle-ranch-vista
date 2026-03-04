import { useTranslation } from 'react-i18next';
import { forwardRef } from 'react';
import { type MedalTier } from '@/lib/achievements';
import achievementBg from '@/assets/achievement-story-bg.png';

export type StoryItemKey = 'animals' | 'vaccinations' | 'weights' | 'births' | 'treatments';

function getTierColors(tier: MedalTier): { accent: string; number: string } {
  switch (tier) {
    case 'bronze': return { accent: '#CD7F32', number: '#4a3728' };
    case 'silver': return { accent: '#8C8C8C', number: '#3d3d3d' };
    case 'gold':   return { accent: '#DAA520', number: '#5c4a00' };
  }
}

interface AchievementStoryCardProps {
  userName: string;
  amount: number;
  itemKey: StoryItemKey;
  medalTier: MedalTier;
}

/**
 * Renders a 1080×1920 Instagram Story composition.
 * Uses the static background image + 3 dynamic text overlays.
 * Meant to be rendered off-screen and captured via html2canvas.
 */
export const AchievementStoryCard = forwardRef<HTMLDivElement, AchievementStoryCardProps>(
  ({ userName, amount, itemKey, medalTier }, ref) => {
    const { t } = useTranslation(['common']);
    const colors = getTierColors(medalTier);

    const headerText = t('common:achievements.story.header', { userName });
    const itemLabel = t(`common:achievements.story.items.${itemKey}`);

    const headerFontSize = userName.length > 20 ? '52px' : '64px';
    const amountStr = String(amount);
    const amountFontSize =
      amountStr.length >= 5 ? '180px' :
      amountStr.length >= 4 ? '240px' :
      amountStr.length >= 3 ? '280px' : '340px';
    // Exclamation marks slightly smaller than the number
    const exclFontSize =
      amountStr.length >= 5 ? '140px' :
      amountStr.length >= 4 ? '180px' :
      amountStr.length >= 3 ? '220px' : '260px';
    const itemFontSize = itemLabel.length > 14 ? '80px' : '110px';

    const fontFamily = "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

    return (
      <div
        ref={ref}
        style={{
          width: '1080px',
          height: '1920px',
          position: 'relative',
          overflow: 'hidden',
          fontFamily,
        }}
      >
        {/* Background image layer */}
        <img
          src={achievementBg}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />

        {/* Text overlay layer */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 100px',
            textAlign: 'center',
            paddingBottom: '160px', // push content up for breathing room
          }}
        >
          {/* A) Header sentence */}
          <div
            style={{
              fontSize: headerFontSize,
              fontWeight: 800,
              fontStyle: 'italic',
              color: colors.accent,
              lineHeight: 1.15,
              marginBottom: '120px',
              maxWidth: '880px',
              textShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            {headerText}
          </div>

          {/* B) Big number with exclamation marks */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '40px',
            }}
          >
            <span
              style={{
                fontSize: exclFontSize,
                fontWeight: 900,
                color: colors.accent,
                lineHeight: 0.9,
                fontStyle: 'italic',
                textShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              ¡
            </span>
            <span
              style={{
                fontSize: amountFontSize,
                fontWeight: 900,
                color: colors.number,
                lineHeight: 0.9,
                textShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              {amount}
            </span>
            <span
              style={{
                fontSize: exclFontSize,
                fontWeight: 900,
                color: colors.accent,
                lineHeight: 0.9,
                fontStyle: 'italic',
                textShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              !
            </span>
          </div>

          {/* C) Item label */}
          <div
            style={{
              fontSize: itemFontSize,
              fontWeight: 800,
              color: colors.accent,
              lineHeight: 1.05,
              marginBottom: '80px',
              maxWidth: '900px',
              wordBreak: 'break-word' as const,
              textShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            {itemLabel}
          </div>
        </div>
      </div>
    );
  }
);

AchievementStoryCard.displayName = 'AchievementStoryCard';
