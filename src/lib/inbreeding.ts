// Client-side inbreeding utilities (mirrors supabase/functions/_shared/genetics.ts).
// Wright's coefficient of relationship between the parents divided by 2 gives the
// inbreeding coefficient F of the animal.

export const MAX_GEN = 5;

export interface PedigreeNode {
  id: string;
  father_id?: string | null;
  mother_id?: string | null;
}

export type PedigreeIndex = Map<string, PedigreeNode>;

export type InbreedingLevel = "none" | "low" | "moderate" | "high" | "severe";

export interface InbreedingInfo {
  /** Inbreeding coefficient F (0-1) of the animal itself. */
  coefficient: number;
  level: InbreedingLevel;
  /** Points subtracted from the genetics dimension (0-10 scale). */
  penalty: number;
  /** True when both parents are known, so the value is meaningful. */
  parentsKnown: boolean;
}

export function buildPedigreeIndex(rows: PedigreeNode[]): PedigreeIndex {
  const index: PedigreeIndex = new Map();
  rows.forEach((row) => index.set(row.id, row));
  return index;
}

/** Shortest generational distance to every ancestor (1 = parent). */
function ancestorDistances(id: string, index: PedigreeIndex): Map<string, number> {
  const distances = new Map<string, number>();
  const node = index.get(id);
  if (!node) return distances;
  const queue: Array<{ id: string; depth: number }> = [];
  if (node.father_id) queue.push({ id: node.father_id, depth: 1 });
  if (node.mother_id) queue.push({ id: node.mother_id, depth: 1 });

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth > MAX_GEN) continue;
    const existing = distances.get(current.id);
    if (existing !== undefined && existing <= current.depth) continue;
    distances.set(current.id, current.depth);
    const parent = index.get(current.id);
    if (!parent) continue;
    if (parent.father_id) queue.push({ id: parent.father_id, depth: current.depth + 1 });
    if (parent.mother_id) queue.push({ id: parent.mother_id, depth: current.depth + 1 });
  }
  return distances;
}

/** Wright's R between two animals using all common ancestors within MAX_GEN. */
export function coefficientOfRelationship(aId: string, bId: string, index: PedigreeIndex): number {
  if (!aId || !bId) return 0;
  if (aId === bId) return 1;
  const a = ancestorDistances(aId, index);
  const b = ancestorDistances(bId, index);

  let r = 0;
  const bInA = a.get(bId);
  if (bInA !== undefined) r += Math.pow(0.5, bInA);
  const aInB = b.get(aId);
  if (aInB !== undefined) r += Math.pow(0.5, aInB);

  a.forEach((n1, ancestorId) => {
    const n2 = b.get(ancestorId);
    if (n2 === undefined) return;
    r += Math.pow(0.5, n1 + n2);
  });

  return Math.min(1, r);
}

export function inbreedingLevel(coefficient: number): InbreedingLevel {
  if (coefficient >= 0.25) return "severe";
  if (coefficient >= 0.125) return "high";
  if (coefficient >= 0.0625) return "moderate";
  if (coefficient > 0.001) return "low";
  return "none";
}

/** Points subtracted from the genetics dimension for a given F. */
export function inbreedingPenalty(coefficient: number): number {
  const level = inbreedingLevel(coefficient);
  if (level === "severe") return 3.5;
  if (level === "high") return 2.5;
  if (level === "moderate") return 1.5;
  if (level === "low") return 0.5;
  return 0;
}

/**
 * Inbreeding info for an animal, computed from the herd pedigree index.
 * Returns null when the animal is unknown to the index.
 */
export function animalInbreeding(animalId: string, index: PedigreeIndex): InbreedingInfo | null {
  const node = index.get(animalId);
  if (!node) return null;
  const fatherId = node.father_id || null;
  const motherId = node.mother_id || null;
  if (!fatherId || !motherId) {
    return { coefficient: 0, level: "none", penalty: 0, parentsKnown: false };
  }
  const coefficient = coefficientOfRelationship(fatherId, motherId, index) / 2;
  return {
    coefficient,
    level: inbreedingLevel(coefficient),
    penalty: inbreedingPenalty(coefficient),
    parentsKnown: true,
  };
}
