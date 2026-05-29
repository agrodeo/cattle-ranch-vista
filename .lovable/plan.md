
# Plan: DEPs for Male Animal Profiles

Add a genetic merit (DEPs / Diferencias Esperadas de Progenie) section to male animal profiles, with manual data entry, breed reference baselines, visual comparison vs breed averages, and optional bull-vs-bull comparison.

## 1. Database — `animal_deps` table

Migration creates the table with these adjustments to fit project conventions:

- Foreign key uses `cabañas(id)` (the existing table name with ñ), not `cabanas`.
- Column named `cabaña_id` to match every other table in the schema (consistent with RLS helpers like `current_user_is_active_in_cabana`).
- Uses existing helpers `current_user_is_active_in_cabana(cabaña_id)` and `current_user_role_in([...])` for RLS, instead of querying a `user_profiles` table (which doesn't exist — the project uses `profiles`).
- Explicit `GRANT` statements for `authenticated` and `service_role` (project rule).
- `UNIQUE(animal_id)` so each animal has one DEP record (latest evaluation).
- All trait columns + accuracy columns + `custom_deps` JSONB exactly as specified.

RLS policies:
- SELECT: any active user in the cabaña.
- INSERT/UPDATE/DELETE: roles `owner`, `manager`, `worker`, `admin`, `employee` active in the cabaña + `can_modify_data(auth.uid())`.

## 2. Breed reference data

`src/data/breedDEPReferences.ts` with `BREED_DEP_REFERENCES` for Angus, Hereford, Braford, Brangus, Limousin (placeholder values from spec — flagged as approximate, easy to update later). Helper `getBreedReference(breed: string)` doing a case-insensitive lookup against the animal's `breed` field.

## 3. Hook — `useAnimalDEPs`

`src/hooks/useAnimalDEPs.ts`

- React Query fetch by `animal_id` (maybeSingle).
- `saveDEPs` mutation: upsert pattern (update if `deps.id` exists, otherwise insert) including `cabaña_id` from current user and `created_by`.
- Invalidates `['animal-deps', animalId]` on success, toast feedback via existing `useToast`.
- Uses translations from new `deps` namespace.

## 4. Display component — `AnimalDEPsSection`

`src/components/deps/AnimalDEPsSection.tsx`

- Card with header, subtitle, and "Editar DEPs" / "Agregar DEPs" button.
- Empty state when no record.
- When DEPs exist: grouped sections (Crecimiento, Aptitud Materna, Reproducción, Carcasa, Comportamiento). Each row shows:
  - Trait label (translated)
  - Value + unit
  - Accuracy dot (green ≥0.7, yellow 0.4–0.7, red <0.4) — only when accuracy present
  - Horizontal bar positioning the value between worse / average / better, using the breed reference (`top10` better edge, average center, mirrored on the worse side). For `lowerIsBetter` traits the bar direction is inverted.
- Skeleton state while loading.
- Source + evaluation date shown under the header when present.

Shared `TRAIT_CONFIG` constant (units, lowerIsBetter, section) used by display, form, and comparison view.

## 5. Edit form — `DEPsEditDialog`

`src/components/deps/DEPsEditDialog.tsx`

- Dialog (existing `Dialog` primitive) with react-hook-form.
- Fields: source (text), evaluation date (date), and each trait as a numeric input (supports negatives) with unit suffix.
- Grouped into the same sections as the display.
- "Mostrar precisiones" toggle reveals accuracy inputs (0–1, step 0.01) for each trait.
- If `getBreedReference(animal.breed)` matches, helper text under each trait: `Promedio raza: 0 | Top 25%: -1.5` (translated).
- Calls `saveDEPs` and closes on success.

## 6. Integration into animal profile

`src/components/animals/profile/AnimalProfileTabs.tsx` already manages tabs. Add a new "Genética" tab (icon `Dna` from lucide) visible only when `animal.sex === 'macho'`. Tab content renders `<AnimalDEPsSection animalId={animal.id} breed={animal.breed} />`. No other tab is moved or removed (respects guardrails).

## 7. Optional comparison — `DEPComparisonView`

`src/components/deps/DEPComparisonView.tsx`

- Triggered from "Comparar con otro toro" button inside `AnimalDEPsSection`.
- Animal picker limited to other male animals in the same cabaña (reuses `useAnimalsData`, filtered by `sex === 'macho'` and excluding current animal).
- Two-column trait comparison; better value highlighted (`bg-primary/10 text-primary`), respecting each trait's `lowerIsBetter`. Missing values render as `—`.

## 8. Translations

Add `deps` namespace files: `src/i18n/locales/{es,en,pt}/deps.json` with all keys from the spec. Register the namespace in `src/i18n/index.ts` alongside the other locale imports.

## Technical notes

- Table name in code/types: after the migration runs, the Supabase types file regenerates and the table is callable via `supabase.from('animal_deps')`.
- The unique constraint on `animal_id` makes the upsert logic safe and matches "one DEPs record per animal".
- Bar positioning math: clamp `value` between `-1.5 × top10` and `+1.5 × top10` (relative to the breed reference) and map to 0–100% width; for `lowerIsBetter` traits invert before mapping. Falls back to centered indicator with neutral coloring when no breed reference is available.
- Accuracy dot uses semantic tokens (`bg-emerald-500`, `bg-amber-500`, `bg-destructive`) — only `bg-destructive` is from the design system; the others are existing Tailwind utilities already used across the app for ranking states.
- No existing routes, components, or RLS policies are renamed or removed (project guardrails respected).

## File summary

| Action | File |
| --- | --- |
| New migration | `animal_deps` table + GRANTs + RLS |
| New | `src/data/breedDEPReferences.ts` |
| New | `src/hooks/useAnimalDEPs.ts` |
| New | `src/components/deps/AnimalDEPsSection.tsx` |
| New | `src/components/deps/DEPsEditDialog.tsx` |
| New | `src/components/deps/DEPComparisonView.tsx` |
| Edit | `src/components/animals/profile/AnimalProfileTabs.tsx` (add Genética tab for males) |
| New | `src/i18n/locales/{es,en,pt}/deps.json` |
| Edit | `src/i18n/index.ts` (register namespace) |
