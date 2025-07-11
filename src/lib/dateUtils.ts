/**
 * Utility functions for converting Excel date formats to ISO YYYY-MM-DD format
 */

/**
 * Converts Excel serial date to JavaScript Date object
 * Excel serial dates use 1900-01-01 as day 1 (but Excel incorrectly treats 1900 as a leap year)
 * @param serial Excel serial number (e.g., 42770)
 * @returns Date object
 */
export function excelSerialToDate(serial: number): Date {
  // Excel epoch starts at 1900-01-01, but Excel incorrectly treats 1900 as a leap year
  // So we need to subtract 1 day for dates after 1900-02-28 to compensate
  const excelEpoch = new Date(1900, 0, 1); // January 1, 1900
  
  // Excel serial 1 = January 1, 1900, but we need to adjust for the leap year bug
  // For serial numbers >= 60 (March 1, 1900), subtract 1 to account for the non-existent Feb 29, 1900
  let adjustedSerial = serial;
  if (serial >= 60) {
    adjustedSerial = serial - 1;
  }
  
  // Convert to milliseconds and add to epoch
  const date = new Date(excelEpoch.getTime() + (adjustedSerial - 1) * 24 * 60 * 60 * 1000);
  return date;
}

/**
 * Detects if a value is an Excel serial date number
 * @param value Any value from Excel
 * @returns true if the value appears to be an Excel serial date
 */
export function isExcelSerialDate(value: any): boolean {
  // Check if it's a number
  if (typeof value !== 'number' || isNaN(value)) {
    return false;
  }
  
  // Excel serial dates are typically between 1 (1900-01-01) and ~50000 (for reasonable dates)
  // We'll be more generous and allow up to 100000 (which would be around year 2174)
  return value >= 1 && value <= 100000 && value % 1 === 0; // Must be a whole number
}

/**
 * Parses various date string formats and normalizes them
 * @param dateStr Date string in various formats
 * @returns Date object or null if parsing fails
 */
export function parseDateString(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }
  
  const trimmed = dateStr.trim();
  
  // Try different date formats
  const formats = [
    // ISO format (YYYY-MM-DD)
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // DD/MM/YYYY or DD-MM-YYYY
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
    // MM/DD/YYYY or MM-DD-YYYY  
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
    // YYYY/MM/DD or YYYY-MM-DD
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/,
  ];
  
  // Try to parse as is first (handles many formats automatically)
  let date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  // Try manual parsing for DD/MM/YYYY format (common in Excel exports)
  const ddMmYyyy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddMmYyyy) {
    const day = parseInt(ddMmYyyy[1], 10);
    const month = parseInt(ddMmYyyy[2], 10);
    const year = parseInt(ddMmYyyy[3], 10);
    
    // Try DD/MM/YYYY first
    date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime()) && day <= 31 && month <= 12) {
      return date;
    }
    
    // If that doesn't work, try MM/DD/YYYY
    if (day <= 12) { // Could be month
      date = new Date(year, day - 1, month);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  return null;
}

/**
 * Converts any date value (Excel serial, date string, etc.) to ISO YYYY-MM-DD format
 * @param value Any value that might represent a date
 * @returns ISO date string (YYYY-MM-DD) or null if conversion fails
 */
export function convertToISODate(value: any): string | null {
  if (!value) {
    return null;
  }
  
  let date: Date | null = null;
  
  // If it's already a Date object
  if (value instanceof Date) {
    date = value;
  }
  // If it's an Excel serial number
  else if (isExcelSerialDate(value)) {
    date = excelSerialToDate(value);
  }
  // If it's a string, try to parse it
  else if (typeof value === 'string') {
    date = parseDateString(value);
  }
  // If it's a number that's not an Excel serial, try converting to string first
  else if (typeof value === 'number') {
    date = parseDateString(value.toString());
  }
  
  // Validate the date and convert to ISO format
  if (date && !isNaN(date.getTime())) {
    // Check if date is reasonable (not too far in past or future)
    const year = date.getFullYear();
    if (year >= 1900 && year <= 2100) {
      return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    }
  }
  
  return null;
}

/**
 * Validates that a date is not in the future and is reasonable
 * @param dateStr ISO date string (YYYY-MM-DD)
 * @returns true if date is valid and not in the future
 */
export function isValidBirthDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return false;
  }
  
  const now = new Date();
  const year = date.getFullYear();
  
  // Date should not be in the future and should be reasonable (after 1900)
  return date <= now && year >= 1900;
}