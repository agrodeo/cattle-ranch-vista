/**
 * Paginated fetch helper for Supabase/PostgREST.
 *
 * PostgREST caps every response at `max-rows` (1000 by default) WITHOUT raising an
 * error, so any unbounded `.select()` silently truncates data for large ranches.
 * Use this helper instead of relying on a single request.
 *
 * Usage:
 *   const animals = await fetchAllRows<Animal>((from, to) =>
 *     supabase.from('animals').select('*').eq('cabaña_id', id).range(from, to)
 *   );
 */

export const PAGE_SIZE = 1000;
const MAX_PAGES = 100; // safety cap: 100k rows

type RangeQuery<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

export async function fetchAllRows<T = any>(
  buildQuery: (from: number, to: number) => RangeQuery<T>,
  options?: { pageSize?: number; maxPages?: number }
): Promise<T[]> {
  const pageSize = options?.pageSize ?? PAGE_SIZE;
  const maxPages = options?.maxPages ?? MAX_PAGES;

  const all: T[] = [];

  for (let page = 0; page < maxPages; page++) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await buildQuery(from, to);

    if (error) {
      throw new Error(`fetchAllRows: error en la página ${page + 1} (filas ${from}-${to}): ${error.message}`);
    }

    const batch = data ?? [];
    all.push(...batch);

    if (batch.length < pageSize) {
      return all;
    }

    if (page === maxPages - 1) {
      console.warn(
        `fetchAllRows: se alcanzó el tope de ${maxPages} páginas (${maxPages * pageSize} filas). Los datos pueden estar incompletos.`
      );
    }
  }

  return all;
}

/**
 * Exact row count without transferring rows.
 *
 * Usage:
 *   const total = await fetchCount(() =>
 *     supabase.from('animals').select('id', { count: 'exact', head: true }).eq('cabaña_id', id)
 *   );
 */
export async function fetchCount(
  buildQuery: () => PromiseLike<{ count: number | null; error: { message: string } | null }>
): Promise<number> {
  const { count, error } = await buildQuery();
  if (error) throw new Error(`fetchCount: ${error.message}`);
  return count ?? 0;
}
