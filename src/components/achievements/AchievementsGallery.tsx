import { useTranslation } from 'react-i18next';
import { Trophy, Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAchievements } from '@/hooks/useAchievements';
import { ACHIEVEMENT_DEFINITIONS, getMedalIcon, getMedalColor, calculateProgress } from '@/lib/achievements';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AchievementCard } from './AchievementCard';
import { Skeleton } from '@/components/ui/skeleton';

interface AchievementProgress {
  definition: typeof ACHIEVEMENT_DEFINITIONS[0];
  unlockedTiers: Array<{ tier: 'bronze' | 'silver' | 'gold'; data: any }>;
  currentValue: number;
  progress: ReturnType<typeof calculateProgress>;
}

export function AchievementsGallery() {
  const { t } = useTranslation(['common']);
  const { achievements, loading, incrementShareCount } = useAchievements();

  // Calculate progress for all achievements
  const achievementProgress: AchievementProgress[] = ACHIEVEMENT_DEFINITIONS.map(def => {
    const unlockedTiers = achievements.filter(a => a.achievement_code === def.code);
    const currentValue = unlockedTiers[0]?.progress_value || 0;
    const progress = calculateProgress(currentValue, def);

    return {
      definition: def,
      unlockedTiers: unlockedTiers.map(a => ({ tier: a.medal_tier, data: a })),
      currentValue,
      progress
    };
  });

  const totalUnlocked = achievements.length;
  const totalPossible = ACHIEVEMENT_DEFINITIONS.length * 3; // 3 tiers per achievement

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-primary/10">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground">Mis Logros</h2>
            <p className="text-muted-foreground">
              Has desbloqueado {totalUnlocked} de {totalPossible} medallas
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">{totalUnlocked}</div>
            <div className="text-sm text-muted-foreground">Medallas</div>
          </div>
        </div>
      </Card>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievementProgress.map(({ definition, unlockedTiers, currentValue, progress }) => (
          <Card key={definition.code} className="p-6 space-y-4 hover:shadow-lg transition-shadow">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{t(definition.nameKey)}</h3>
              <p className="text-sm text-muted-foreground">{t(definition.descriptionKey)}</p>
            </div>

            {/* Medal Tiers */}
            <div className="flex justify-around py-4">
              {(['bronze', 'silver', 'gold'] as const).map(tier => {
                const unlocked = unlockedTiers.find(u => u.tier === tier);
                const threshold = definition.tiers[tier].threshold;

                return (
                  <Dialog key={tier}>
                    <DialogTrigger asChild>
                      <button
                        disabled={!unlocked}
                        className={`group relative flex flex-col items-center gap-2 transition-all ${
                          unlocked 
                            ? 'cursor-pointer hover:scale-110' 
                            : 'opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <div className={`relative w-16 h-16 rounded-full bg-gradient-to-br ${getMedalColor(tier)} p-0.5`}>
                          <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                            {unlocked ? (
                              <span className="text-3xl">{getMedalIcon(tier)}</span>
                            ) : (
                              <Lock className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {threshold}
                        </Badge>
                      </button>
                    </DialogTrigger>

                    {unlocked && (
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>¡Logro Desbloqueado!</DialogTitle>
                        </DialogHeader>
                        <AchievementCard
                          achievementCode={definition.code}
                          nameKey={definition.nameKey}
                          descriptionKey={definition.descriptionKey}
                          medalTier={tier}
                          unlockedAt={unlocked.data.unlocked_at}
                          progressValue={unlocked.data.progress_value}
                          onShare={() => incrementShareCount(unlocked.data.id)}
                        />
                      </DialogContent>
                    )}
                  </Dialog>
                );
              })}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progreso</span>
                <span className="font-medium">{currentValue} / {definition.tiers.gold.threshold}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
                  style={{ 
                    width: `${(currentValue / definition.tiers.gold.threshold) * 100}%` 
                  }}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}