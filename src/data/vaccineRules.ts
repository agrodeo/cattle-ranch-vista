/**
 * Rule model:
 * - scope: 'national' | 'province'
 * - appliesTo: function that gets animal snapshot and returns boolean (eligible)
 * - due: function that returns next due date (or null if N/A)
 * - label: human readable vaccine name
 */
export type AnimalSnapshot = {
  id: string;
  sex: 'M'|'F';
  dob: string;            // ISO date
  ageMonths: number;
  status: 'activo'|'vendido'|'muerto';
  category?: 'ternero'|'ternera'|'vaquillona'|'vaca'|'toro'|'novillo';
  lastVaccines?: Record<string, string | null>; // code -> last date ISO
};

export type VaccineRule = {
  code: string;           // 'aftosa' | 'brucelosis' | ...
  label: string;
  scope: 'national'|'province';
  country: 'AR'|'UY'|'PY'|'CO'|'MX'|'PE'|'CL'|'BR';
  provinceCodes?: string[];     // only if scope==='province'
  appliesTo: (a: AnimalSnapshot) => boolean;
  nextDue: (a: AnimalSnapshot, ranch: {country_code:string; province_code?:string|null; today: Date}) => Date | null;
};

export const VACCINE_RULES: VaccineRule[] = [
  // Example scaffolds – fill specifics later in admin; structure is ready
  {
    code: 'aftosa',
    label: 'Aftosa (FMD)',
    scope: 'national',
    country: 'AR',
    appliesTo: (a) => a.status === 'activo',
    nextDue: (a, ctx) => {
      // Placeholder cadence example: every 6 months after 2 months old
      if (a.ageMonths < 2) return null;
      const last = a.lastVaccines?.aftosa ? new Date(a.lastVaccines.aftosa) : null;
      const base = last ?? new Date(a.dob);
      const due = new Date(base);
      due.setMonth(due.getMonth() + 6);
      return due;
    }
  },
  {
    code: 'brucelosis',
    label: 'Brucelosis (F)',
    scope: 'national',
    country: 'AR',
    appliesTo: (a) => a.sex === 'F' && a.ageMonths >= 3 && a.ageMonths <= 8 && a.status === 'activo',
    nextDue: (a, ctx) => {
      const last = a.lastVaccines?.brucelosis ? new Date(a.lastVaccines.brucelosis) : null;
      if (last) return null; // one-time in window (example)
      // due at 5 months as default target inside the 3-8 window
      const due = new Date(a.dob);
      due.setMonth(due.getMonth() + 5);
      return due;
    }
  },
  // Province-scoped example (if needed)
  {
    code: 'carbunclo',
    label: 'Carbunclo bacteridiano',
    scope: 'province',
    country: 'AR',
    provinceCodes: ['BA', 'SF', 'ER'], // example subset
    appliesTo: (a) => a.status === 'activo' && a.ageMonths >= 6,
    nextDue: (a) => {
      const last = a.lastVaccines?.carbunclo ? new Date(a.lastVaccines.carbunclo) : null;
      const base = last ?? new Date(a.dob);
      const due = new Date(base);
      due.setFullYear(due.getFullYear() + 1);
      return due;
    }
  },
  // Add scaffolds for UY, PY, CO, MX, PE, CL, BR similarly
  {
    code: 'aftosa',
    label: 'Aftosa (FMD)',
    scope: 'national',
    country: 'UY',
    appliesTo: (a) => a.status === 'activo',
    nextDue: (a, ctx) => {
      if (a.ageMonths < 2) return null;
      const last = a.lastVaccines?.aftosa ? new Date(a.lastVaccines.aftosa) : null;
      const base = last ?? new Date(a.dob);
      const due = new Date(base);
      due.setMonth(due.getMonth() + 6);
      return due;
    }
  },
  {
    code: 'aftosa',
    label: 'Aftosa (FMD)',
    scope: 'national',
    country: 'BR',
    appliesTo: (a) => a.status === 'activo',
    nextDue: (a, ctx) => {
      if (a.ageMonths < 2) return null;
      const last = a.lastVaccines?.aftosa ? new Date(a.lastVaccines.aftosa) : null;
      const base = last ?? new Date(a.dob);
      const due = new Date(base);
      due.setMonth(due.getMonth() + 6);
      return due;
    }
  },
];