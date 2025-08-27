/**
 * Status normalization utilities for animals
 * Converts between UI display values and database standard values
 */

export type AnimalStatus = 'active' | 'sold' | 'dead';

/**
 * Normalizes animal status from various input formats to standard DB format
 */
export function normalizeAnimalStatus(value: string | null | undefined): AnimalStatus {
  if (!value) return 'active'; // Default to active if no status provided
  
  const normalized = value.toLowerCase().trim();
  
  // Map common variations to standard values
  switch (normalized) {
    case 'activo':
    case 'active':
      return 'active';
    
    case 'vendido':
    case 'sold':
      return 'sold';
    
    case 'muerto':
    case 'dead':
    case 'muerte':
      return 'dead';
    
    default:
      return 'active'; // Default fallback
  }
}

/**
 * Converts standard DB status to display format for UI
 */
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

/**
 * Gets the CSS class for status badges
 */
export function getStatusBadgeClass(status: AnimalStatus): string {
  switch (status) {
    case 'active':
      return 'status-activo';
    case 'sold':
      return 'status-vendido';
    case 'dead':
      return 'status-muerto';
    default:
      return 'status-activo';
  }
}