import { VACCINE_RULES, VaccineRule, AnimalSnapshot } from '@/data/vaccineRules';

export function vaccinesForRanch(ranch: {country_code:string; province_code?:string|null}) {
  return VACCINE_RULES.filter(r => {
    if (r.country !== ranch.country_code) return false;
    if (r.scope === 'province') {
      return ranch.province_code ? r.provinceCodes?.includes(ranch.province_code) : false;
    }
    return true;
  });
}

export function pendingVaccinesForAnimal(a: AnimalSnapshot, ranch: {country_code:string; province_code?:string|null}, today = new Date()) {
  const rules = vaccinesForRanch(ranch);
  const pendings = [];
  for (const r of rules) {
    if (!r.appliesTo(a)) continue;
    const due = r.nextDue(a, { ...ranch, today });
    if (!due) continue;
    if (due <= today) pendings.push({ code: r.code, label: r.label, due });
  }
  return pendings.sort((x,y)=> x.due.getTime()-y.due.getTime());
}