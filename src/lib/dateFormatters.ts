/**
 * Utility functions for date formatting in reports
 */

// Helper function to safely format dates for database queries
export const formatDateForDB = (date: Date | string | undefined | null): string | undefined => {
  if (!date) return undefined;
  
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  
  if (typeof date === 'string') {
    // If it's already a date string, return as is
    return date;
  }
  
  return undefined;
};

// Helper function to safely convert date to Date object
export const ensureDateObject = (date: Date | string | undefined | null): Date | undefined => {
  if (!date) return undefined;
  
  if (date instanceof Date) {
    return date;
  }
  
  if (typeof date === 'string') {
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }
  
  return undefined;
};

// Helper to format filters object with proper date strings
export const formatFiltersForDB = (filters: any) => {
  const formatted = { ...filters };
  
  if (formatted.date_from) {
    formatted.date_from = formatDateForDB(formatted.date_from);
  }
  
  if (formatted.date_to) {
    formatted.date_to = formatDateForDB(formatted.date_to);
  }
  
  return formatted;
};