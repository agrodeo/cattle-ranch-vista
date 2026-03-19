import type { BreedGrowthParams } from '@/lib/weightEstimation/types';

// Gompertz growth curve parameters by breed and sex
// W(t) = A * exp(-exp(-K * (t - t_inflection)))
const curves: Record<string, Record<string, BreedGrowthParams>> = {
  angus: {
    Macho:  { A: 680, K: 0.0035, t_inflection: 240 },
    Hembra: { A: 520, K: 0.0032, t_inflection: 220 },
  },
  hereford: {
    Macho:  { A: 700, K: 0.0033, t_inflection: 250 },
    Hembra: { A: 530, K: 0.0030, t_inflection: 230 },
  },
  brahman: {
    Macho:  { A: 750, K: 0.0028, t_inflection: 280 },
    Hembra: { A: 550, K: 0.0025, t_inflection: 260 },
  },
  brangus: {
    Macho:  { A: 720, K: 0.0031, t_inflection: 260 },
    Hembra: { A: 540, K: 0.0029, t_inflection: 240 },
  },
  holando: {
    Macho:  { A: 800, K: 0.0030, t_inflection: 270 },
    Hembra: { A: 600, K: 0.0028, t_inflection: 250 },
  },
  nelore: {
    Macho:  { A: 550, K: 0.0025, t_inflection: 300 },
    Hembra: { A: 430, K: 0.0023, t_inflection: 280 },
  },
};

// Normalize breed string to lookup key
function normalizeBreed(breed: string): string {
  return breed.toLowerCase().trim()
    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
    .replace(/ó/g, 'o').replace(/ú/g, 'u');
}

// Average all params for unknown breeds
function getAverageParams(sex: string): BreedGrowthParams {
  const sexKey = sex === 'Hembra' ? 'Hembra' : 'Macho';
  const all = Object.values(curves).map(c => c[sexKey]);
  const n = all.length;
  return {
    A: all.reduce((s, p) => s + p.A, 0) / n,
    K: all.reduce((s, p) => s + p.K, 0) / n,
    t_inflection: all.reduce((s, p) => s + p.t_inflection, 0) / n,
  };
}

export function getBreedGrowthParams(breed: string | null | undefined, sex: string | null | undefined): BreedGrowthParams {
  const sexKey = sex === 'Hembra' ? 'Hembra' : 'Macho';
  if (!breed) return getAverageParams(sexKey);

  const key = normalizeBreed(breed);
  // Try exact match first, then partial
  for (const [bk, sexMap] of Object.entries(curves)) {
    if (key.includes(bk) || bk.includes(key)) {
      return sexMap[sexKey];
    }
  }
  return getAverageParams(sexKey);
}

export function gompertzWeight(ageDays: number, params: BreedGrowthParams): number {
  return params.A * Math.exp(-Math.exp(-params.K * (ageDays - params.t_inflection)));
}
