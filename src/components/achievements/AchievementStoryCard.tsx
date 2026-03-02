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

/* Curved concentric quarter-circle lines (top-left / bottom-left style) */
const CurvedLines = ({ style }: { style?: React.CSSProperties }) => (
  <svg width="220" height="220" viewBox="0 0 220 220" fill="none" style={style}>
    {[40, 60, 80, 100, 120, 140, 160, 180, 200, 220].map((r, i) => (
      <path
        key={i}
        d={`M 0 ${r} A ${r} ${r} 0 0 1 ${r} 0`}
        stroke="#16a34a"
        strokeWidth="2.5"
        fill="none"
      />
    ))}
  </svg>
);

/* Straight radiating lines from a corner point */
const RadiatingLines = ({ style }: { style?: React.CSSProperties }) => (
  <svg width="200" height="200" viewBox="0 0 200 200" fill="none" style={style}>
    {Array.from({ length: 12 }, (_, i) => {
      const angle = (i * 90) / 11; // spread across 90 degrees
      const rad = (angle * Math.PI) / 180;
      const x2 = Math.cos(rad) * 190;
      const y2 = Math.sin(rad) * 190;
      return (
        <line
          key={i}
          x1="0"
          y1="0"
          x2={x2.toString()}
          y2={y2.toString()}
          stroke="#16a34a"
          strokeWidth="2"
        />
      );
    })}
  </svg>
);

export const AchievementStoryCard = forwardRef<HTMLDivElement, AchievementStoryCardProps>(({
  nameKey,
  descriptionKey,
  medalTier,
  threshold,
  cabañaName,
  achievementCode,
}, ref) => {
  const { t } = useTranslation(['common']);

  const achievementLabel = t(nameKey).toLowerCase();

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
      {/* Top-left curved lines */}
      <div style={{ position: 'absolute', top: 0, left: 0 }}>
        <CurvedLines />
      </div>

      {/* Top-right radiating lines */}
      <div style={{ position: 'absolute', top: 0, right: 0, transform: 'rotate(180deg)', transformOrigin: 'center' }}>
        <RadiatingLines />
      </div>

      {/* Bottom-left curved lines */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, transform: 'rotate(90deg) scaleX(-1)', transformOrigin: 'bottom left' }}>
        <CurvedLines />
      </div>

      {/* Bottom-right radiating lines */}
      <div style={{ position: 'absolute', bottom: 0, right: 0, transform: 'scaleY(-1)' }}>
        <RadiatingLines />
      </div>

      {/* Main content */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '0 80px',
        gap: '0',
        width: '100%',
      }}>
        {/* Congratulatory headline */}
        <div style={{
          fontSize: '72px',
          fontWeight: 800,
          fontStyle: 'italic',
          color: '#16a34a',
          lineHeight: 1.15,
          marginBottom: '60px',
          maxWidth: '900px',
        }}>
          Agrodeo quiere felicitar a {cabañaName} por registrar
        </div>

        {/* Big number with exclamation marks */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0px',
          marginBottom: '10px',
        }}>
          <span style={{
            fontSize: '320px',
            fontWeight: 900,
            color: '#16a34a',
            lineHeight: 0.85,
            fontStyle: 'italic',
          }}>¡</span>
          <span style={{
          fontSize: '380px',
            fontWeight: 900,
            color: '#6b7280',
            lineHeight: 0.85,
          }}>{threshold}</span>
          <span style={{
            fontSize: '320px',
            fontWeight: 900,
            color: '#16a34a',
            lineHeight: 0.85,
            fontStyle: 'italic',
          }}>!</span>
        </div>

        {/* Achievement label (e.g., "animales") */}
        <div style={{
          fontSize: '140px',
          fontWeight: 800,
          color: '#16a34a',
          lineHeight: 1,
          marginBottom: '80px',
        }}>
          {achievementLabel}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: '80px',
        left: 0,
        right: 0,
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '52px',
          fontWeight: 800,
          color: '#16a34a',
          fontStyle: 'italic',
        }}>
          agrodeo.farm
        </div>
        <div style={{
          fontSize: '28px',
          fontWeight: 500,
          color: '#16a34a',
          fontStyle: 'italic',
          marginTop: '4px',
        }}>
          maneja tu ganado como un profesional
        </div>
      </div>
    </div>
  );
});

AchievementStoryCard.displayName = 'AchievementStoryCard';
