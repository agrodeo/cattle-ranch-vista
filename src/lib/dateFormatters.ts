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
  if (!filters) return {};
  
  const formatted: any = {};
  
  // Only copy defined values to prevent undefined pollution
  Object.keys(filters).forEach(key => {
    const value = filters[key];
    if (value !== undefined && value !== null) {
      if (key === 'date_from' || key === 'date_to') {
        const formattedDate = formatDateForDB(value);
        if (formattedDate) {
          formatted[key] = formattedDate;
        }
      } else {
        formatted[key] = value;
      }
    }
  });
  
  return formatted;
};