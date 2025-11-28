import { TFunction } from 'i18next';
import { normalizeAnimalStatus, AnimalStatus } from './statusUtils';

/**
 * Translation helper utilities for animal-related data
 * These helpers map Spanish database values to translated UI display text
 */

/**
 * Get translated animal category from Spanish category key
 */
export function getTranslatedCategory(
  categoryKey: string | null | undefined, 
  t: TFunction
): string {
  // Handle null/undefined/empty
  if (!categoryKey || categoryKey.trim() === '') {
    return t('animals:categories.unknown');
  }

  const categoryMap: Record<string, string> = {
    'Ternero': 'animals:categories.maleCalf',
    'Ternera': 'animals:categories.femaleCalf',
    'Torito': 'animals:categories.youngBull',
    'Vaquillona': 'animals:categories.heifer',
    'Novillo': 'animals:categories.steer',
    'Toro': 'animals:categories.bull',
    'Vaca': 'animals:categories.cow',
    'Desconocido': 'animals:categories.unknown',
    'Sin clasificar': 'animals:categories.unknown'
  };
  
  // If we have a translation key for this category, use it
  if (categoryMap[categoryKey]) {
    return t(categoryMap[categoryKey]);
  }
  
  // Otherwise, return the original category value from database
  // This helps identify categories that need to be added to the mapping
  return categoryKey;
}

/**
 * Get translated sex from Spanish sex value
 */
export function getTranslatedSex(sex: string, t: TFunction): string {
  if (sex === 'Macho') return t('animals:sex.male');
  if (sex === 'Hembra') return t('animals:sex.female');
  return sex;
}

/**
 * Get translated status from Spanish or normalized status value
 */
export function getTranslatedStatus(status: string, t: TFunction): string {
  const normalized = normalizeAnimalStatus(status);
  return t(`animals:status.${normalized}`);
}

/**
 * Get all available categories as translated options for selects
 */
export function getCategoryOptions(t: TFunction): Array<{ value: string; label: string }> {
  return [
    { value: 'Ternero', label: t('animals:categories.maleCalf') },
    { value: 'Ternera', label: t('animals:categories.femaleCalf') },
    { value: 'Torito', label: t('animals:categories.youngBull') },
    { value: 'Vaquillona', label: t('animals:categories.heifer') },
    { value: 'Novillo', label: t('animals:categories.steer') },
    { value: 'Toro', label: t('animals:categories.bull') },
    { value: 'Vaca', label: t('animals:categories.cow') },
  ];
}

/**
 * Get sex options as translated options for selects
 */
export function getSexOptions(t: TFunction): Array<{ value: string; label: string }> {
  return [
    { value: 'Macho', label: t('animals:sex.male') },
    { value: 'Hembra', label: t('animals:sex.female') },
  ];
}

/**
 * Get status options as translated options for selects
 */
export function getStatusOptions(t: TFunction): Array<{ value: string; label: string }> {
  return [
    { value: 'active', label: t('animals:status.active') },
    { value: 'sold', label: t('animals:status.sold') },
    { value: 'dead', label: t('animals:status.dead') },
  ];
}
