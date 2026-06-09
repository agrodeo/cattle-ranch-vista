// Shared genetics utilities for breeding-related edge functions.
// Deno-safe: no imports from src/ or the browser supabase client.
//
// - buildAncestryMap(): walks pedigree up to MAX_GEN generations and indexes
//   every ancestor with its shortest path-distance per descendant.
// - wrightsCoefficientOfRelationship(): Wright's R via common ancestors:
//     R(a,b) = Σ_over_common_ancestors (0.5)^(n1+n2)
//   where n1/n2 are path lengths from a/b to that ancestor.
// - inbreedingCoefficient(): F(offspring) ≈ R(parents) / 2.

export const MAX_GEN = 5;

export interface PedigreeAnimal {
  id: string;
  father_id?: string | null;
  mother_id?: string | null;
}

export interface AncestryNode {
  fatherId: string | null;
  motherId: string | null;
  // ancestor_id -> shortest generational distance (1 = parent, 2 = grandparent, ...)
  ancestorGenerations: Map<string, number>;
}

export type AncestryMap = Map<string, AncestryNode>;

/**
 * Generic loader callback used to fetch missing ancestor rows by id batches.
 * Should return an array of {id, father_id, mother_id} (extra props ignored).
 */
export type AncestorLoader = (
  missingIds: string[],
) => Promise<PedigreeAnimal[]>;

/**
 * Builds an ancestry map covering up to MAX_GEN generations for the given
 * animals. Walks parents recursively; when a parent id isn't already known,
 * `loadAncestors` is invoked to fetch the missing rows.
 */
export async function buildAncestryMap(
  animals: PedigreeAnimal[],
  loadAncestors: AncestorLoader,
): Promise<AncestryMap> {
  const known = new Map<string, PedigreeAnimal>();
  for (const a of animals) known.set(a.id, a);

  // Iteratively fetch missing parents up to MAX_GEN levels deep.
  let frontier = new Set<string>();
  for (const a of animals) {
    if (a.father_id) frontier.add(a.father_id);
    if (a.mother_id) frontier.add(a.mother_id);
  }

  for (let gen = 1; gen <= MAX_GEN && frontier.size > 0; gen++) {
    const missing = [...frontier].filter((id) => !known.has(id));
    if (missing.length > 0) {
      try {
        const rows = await loadAncestors(missing);
        for (const r of rows) known.set(r.id, r);
      } catch (err) {
        console.error("genetics.loadAncestors failed:", err);
      }
    }
    const next = new Set<string>();
    for (const id of frontier) {
      const row = known.get(id);
      if (!row) continue;
      if (row.father_id) next.add(row.father_id);
      if (row.mother_id) next.add(row.mother_id);
    }
    frontier = next;
  }

  // BFS per animal to compute shortest distance to each ancestor.
  const ancestryMap: AncestryMap = new Map();
  for (const a of animals) {
    const ancestorGenerations = new Map<string, number>();
    const queue: Array<{ id: string; depth: number }> = [];
    if (a.father_id) queue.push({ id: a.father_id, depth: 1 });
    if (a.mother_id) queue.push({ id: a.mother_id, depth: 1 });

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (depth > MAX_GEN) continue;
      const existing = ancestorGenerations.get(id);
      if (existing !== undefined && existing <= depth) continue;
      ancestorGenerations.set(id, depth);
      const row = known.get(id);
      if (!row) continue;
      if (row.father_id) queue.push({ id: row.father_id, depth: depth + 1 });
      if (row.mother_id) queue.push({ id: row.mother_id, depth: depth + 1 });
    }

    ancestryMap.set(a.id, {
      fatherId: a.father_id ?? null,
      motherId: a.mother_id ?? null,
      ancestorGenerations,
    });
  }

  return ancestryMap;
}

/**
 * Wright's coefficient of relationship between two animals.
 * Uses ALL common ancestors within MAX_GEN; each contributes (0.5)^(n1+n2)
 * where n1/n2 are the path lengths from each animal to that ancestor.
 *
 * Special cases:
 *  - If b is a direct ancestor of a (or vice versa), treat the lineal
 *    relationship as the dominant term: (0.5)^depth.
 *  - Same animal: R = 1.
 */
export function wrightsCoefficientOfRelationship(
  aId: string,
  bId: string,
  ancestry: AncestryMap,
): number {
  if (aId === bId) return 1;
  const A = ancestry.get(aId);
  const B = ancestry.get(bId);
  if (!A || !B) return 0;

  let R = 0;

  // Lineal: b is ancestor of a
  const bAsAncestorOfA = A.ancestorGenerations.get(bId);
  if (bAsAncestorOfA !== undefined) {
    R += Math.pow(0.5, bAsAncestorOfA);
  }
  // Lineal: a is ancestor of b
  const aAsAncestorOfB = B.ancestorGenerations.get(aId);
  if (aAsAncestorOfB !== undefined) {
    R += Math.pow(0.5, aAsAncestorOfB);
  }

  // Collateral: common ancestors
  for (const [ancId, n1] of A.ancestorGenerations) {
    const n2 = B.ancestorGenerations.get(ancId);
    if (n2 === undefined) continue;
    R += Math.pow(0.5, n1 + n2);
  }

  // Clamp (numeric safety)
  if (R > 1) R = 1;
  return R;
}

/**
 * Inbreeding coefficient of the (hypothetical) offspring of two parents.
 * F(offspring) ≈ R(parents) / 2.
 */
export function inbreedingCoefficient(
  parentAId: string,
  parentBId: string,
  ancestry: AncestryMap,
): number {
  return wrightsCoefficientOfRelationship(parentAId, parentBId, ancestry) / 2;
}
