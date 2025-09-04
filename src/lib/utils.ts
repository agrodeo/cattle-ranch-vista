import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  
  // Calculate years and months accurately
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  
  // Adjust if we haven't reached the birth month in the current year
  if (months < 0) {
    years--;
    months += 12;
  }
  
  // Also adjust if we're in the birth month but before the birth day
  if (months === 0 && now.getDate() < birth.getDate()) {
    years--;
    months = 11;
  } else if (now.getDate() < birth.getDate()) {
    months--;
  }
  
  return years * 12 + months;
}
