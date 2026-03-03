import { useTranslation } from 'react-i18next';
import { forwardRef } from 'react';
import achievementBg from '@/assets/achievement-story-bg.png';

export type StoryItemKey = 'animals' | 'vaccinations' | 'weights' | 'births' | 'treatments';

interface AchievementStoryCardProps {
  userName: string;
  amount: number;
  itemKey: StoryItemKey;
}

/**
 * Renders a 1080×1920 Instagram Story composition.
 * Uses the static background image + 3 dynamic text overlays.
 * Meant to be rendered off-screen and captured via html2canvas.
 */
export const AchievementStoryCard = forwardRef<HTMLDivElement, AchievementStoryCardProps>(
  ({ userName, amount, itemKey }, ref) => {
    const { t } = useTranslation(['common']);

    const headerText = t('common:achievements.story.header', { userName });
    const itemLabel = t(`common:achievements.story.items.${itemKey}`);

    // Auto-size: shrink font for long names or large numbers
    const headerFontSize = userName.length > 20 ? '56px' : '72px';
    const amountStr = String(amount);
    const amountFontSize =
      amountStr.length >= 5 ? '220px' :
      amountStr.length >= 4 ? '280px' :
      amountStr.length >= 3 ? '320px' : '380px';
    const itemFontSize = itemLabel.length > 14 ? '100px' : '140px';

    return (
      <div
        ref={ref}
        style={{
          width: '1080px',
          height: '1920px',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
            padding: '0 80px',
            textAlign: 'center',
          }}
        >
          {/* A) Header sentence */}
          <div
            style={{
              fontSize: headerFontSize,
              fontWeight: 800,
              fontStyle: 'italic',
              color: '#16a34a',
              lineHeight: 1.15,
              marginBottom: '60px',
              maxWidth: '900px',
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
              gap: '0px',
              marginBottom: '10px',
            }}
          >
            <span
              style={{
                fontSize: '320px',
                fontWeight: 900,
                color: '#16a34a',
                lineHeight: 0.85,
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
                color: '#6b7280',
                lineHeight: 0.85,
                textShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              {amount}
            </span>
            <span
              style={{
                fontSize: '320px',
                fontWeight: 900,
                color: '#16a34a',
                lineHeight: 0.85,
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
              color: '#16a34a',
              lineHeight: 1,
              marginBottom: '80px',
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
