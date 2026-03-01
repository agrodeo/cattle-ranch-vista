export type MedalTier = 'bronze' | 'silver' | 'gold';

export interface AchievementDefinition {
  code: string;
  category: 'herd' | 'activities' | 'vaccination' | 'finance' | 'streak' | 'corrals';
  nameKey: string;
  descriptionKey: string;
  tiers: {
    bronze: { threshold: number; iconKey: string };
    silver: { threshold: number; iconKey: string };
    gold: { threshold: number; iconKey: string };
  };
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Herd Management
  {
    code: 'herd_starter',
    category: 'herd',
    nameKey: 'common:achievements.herd.starter.name',
    descriptionKey: 'common:achievements.herd.starter.description',
    tiers: {
      bronze: { threshold: 10, iconKey: 'primera_manada' },
      silver: { threshold: 50, iconKey: 'criador_consolidado' },
      gold: { threshold: 100, iconKey: 'ganadero_maestro' }
    }
  },
  
  // Activity Tracking
  {
    code: 'activity_tracker',
    category: 'activities',
    nameKey: 'common:achievements.activities.tracker.name',
    descriptionKey: 'common:achievements.activities.tracker.description',
    tiers: {
      bronze: { threshold: 25, iconKey: 'gestor_activo' },
      silver: { threshold: 100, iconKey: 'gestor_dedicado' },
      gold: { threshold: 500, iconKey: 'gestor_elite' }
    }
  },
  
  // Vaccination
  {
    code: 'health_guardian',
    category: 'vaccination',
    nameKey: 'common:achievements.vaccination.guardian.name',
    descriptionKey: 'common:achievements.vaccination.guardian.description',
    tiers: {
      bronze: { threshold: 10, iconKey: 'protector_inicial' },
      silver: { threshold: 50, iconKey: 'guardian_salud' },
      gold: { threshold: 200, iconKey: 'maestro_sanitario' }
    }
  },
  
  // Finance Management
  {
    code: 'financial_manager',
    category: 'finance',
    nameKey: 'common:achievements.finance.manager.name',
    descriptionKey: 'common:achievements.finance.manager.description',
    tiers: {
      bronze: { threshold: 10, iconKey: 'contador_novato' },
      silver: { threshold: 50, iconKey: 'gestor_financiero' },
      gold: { threshold: 200, iconKey: 'experto_finanzas' }
    }
  },
  
  // Streak
  {
    code: 'consistent_user',
    category: 'streak',
    nameKey: 'common:achievements.streak.consistent.name',
    descriptionKey: 'common:achievements.streak.consistent.description',
    tiers: {
      bronze: { threshold: 7, iconKey: 'consistente' },
      silver: { threshold: 30, iconKey: 'dedicado' },
      gold: { threshold: 90, iconKey: 'imparable' }
    }
  },
  
  // Corral Management
  {
    code: 'corral_organizer',
    category: 'corrals',
    nameKey: 'common:achievements.corrals.organizer.name',
    descriptionKey: 'common:achievements.corrals.organizer.description',
    tiers: {
      bronze: { threshold: 3, iconKey: 'organizador_inicial' },
      silver: { threshold: 10, iconKey: 'gestor_espacios' },
      gold: { threshold: 25, iconKey: 'arquitecto_corrales' }
    }
  }
];

export function getMedalColor(tier: MedalTier): string {
  switch (tier) {
    case 'bronze': return 'from-amber-700 to-amber-500';
    case 'silver': return 'from-gray-400 to-gray-200';
    case 'gold': return 'from-yellow-400 to-yellow-200';
  }
}

export function getMedalIcon(tier: MedalTier): string {
  switch (tier) {
    case 'bronze': return '🥉';
    case 'silver': return '🥈';
    case 'gold': return '🥇';
  }
}

export function getThresholdForTier(definition: AchievementDefinition, tier: MedalTier): number {
  return definition.tiers[tier].threshold;
}

export function getTierNumberColor(tier: MedalTier): string {
  switch (tier) {
    case 'bronze': return '#b45309';
    case 'silver': return '#6b7280';
    case 'gold': return '#d97706';
  }
}

export function calculateProgress(value: number, definition: AchievementDefinition): {
  currentTier: MedalTier | null;
  nextTier: MedalTier | null;
  progress: number;
} {
  if (value >= definition.tiers.gold.threshold) {
    return { currentTier: 'gold', nextTier: null, progress: 100 };
  }
  if (value >= definition.tiers.silver.threshold) {
    const remaining = definition.tiers.gold.threshold - definition.tiers.silver.threshold;
    const current = value - definition.tiers.silver.threshold;
    return { currentTier: 'silver', nextTier: 'gold', progress: (current / remaining) * 100 };
  }
  if (value >= definition.tiers.bronze.threshold) {
    const remaining = definition.tiers.silver.threshold - definition.tiers.bronze.threshold;
    const current = value - definition.tiers.bronze.threshold;
    return { currentTier: 'bronze', nextTier: 'silver', progress: (current / remaining) * 100 };
  }
  
  const progress = (value / definition.tiers.bronze.threshold) * 100;
  return { currentTier: null, nextTier: 'bronze', progress };
}