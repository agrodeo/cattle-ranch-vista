export type AnimalStatus = 'active' | 'sold' | 'dead';

export function normalizeStatus(raw?: string | null): AnimalStatus | null {
  if (!raw) return null;
  const v = String(raw).trim().toLowerCase();
  if (['active', 'activo', 'activa', 'vivo', 'viva'].includes(v)) return 'active';
  if (['sold', 'vendido', 'vendida'].includes(v)) return 'sold';
  if (['dead', 'muerto', 'muerta', 'fallecido', 'fallecida', 'muerte'].includes(v)) return 'dead';
  return null;
}

export function getDisplayStatus(status: AnimalStatus): string {
  switch (status) {
    case 'active':
      return 'Activo';
    case 'sold':
      return 'Vendido';
    case 'dead':
      return 'Muerto';
    default:
      return 'Activo';
  }
}