

## Plan: Ensure Pregnancy Flow End-to-End Integrity

### Issues Found

After auditing the full reproductive flow (Insemination → Tacto → Calving / Pregnancy Loss), I found these problems:

---

### 1. Pregnancy Loss Dialog: Case-Sensitive Status Filter
**File:** `NewPregnancyLossDialog.tsx` line 93
- Queries `.eq('status', 'activo')` (lowercase only)
- Animals may have `'Activo'` (capitalized), so pregnant animals won't appear
- **Fix:** Use `.ilike('status', 'activo')` or `.or('status.eq.activo,status.eq.Activo')`

### 2. Calving Fallback Missing Reproductive State Update
**File:** `CalvingRegistrationManager.tsx` lines 229-236
- When `registerCalvingEvent` RPC fails and fallback runs, it only clears `esta_preñada` on the `animals` table
- It does NOT update `reproductive_states` or `reproductive_current_state` to `'post_parto'`
- This leaves the animal in a stale reproductive state (`preñez_activa`)
- **Fix:** Add an update to `reproductive_states` and `reproductive_current_state` in the fallback block

### 3. Calving: Missing Query Invalidations
**File:** `CalvingRegistrationManager.tsx` lines 263-264
- After saving, only `animals` and `animals-for-calving` queries are invalidated
- Missing invalidations for `reproductive-alerts`, `reproductive-kpis`, `activities`, and `corrales` queries that other parts of the app depend on
- **Fix:** Add broader query invalidation

### 4. Calving: Non-Successful Results Don't Register Activity Event
**File:** `CalvingRegistrationManager.tsx` lines 238-249
- When result is `aborto`, `stillbirth`, or `neonatal`, no `eventos` record is created
- Other activity types (tacto, insemination) always create an event via `createEvent()`
- This means these losses won't appear in the activity timeline
- **Fix:** Create an evento record for non-successful calvings too, using supabase insert to `eventos` with type `'parto_fallido'`

### 5. Pregnancy Loss Dialog: Missing `preñeces` Record Handling
**File:** `NewPregnancyLossDialog.tsx` line 93
- The dialog also queries `status = 'activo'` which might miss animals — same case-sensitivity bug
- But it already handles the case where no `preñeces` record exists (creates one on the fly) — this part is correct

---

### Implementation Steps

1. **Fix `NewPregnancyLossDialog.tsx`**
   - Change status filter to handle both `'activo'` and `'Activo'` cases

2. **Fix `CalvingRegistrationManager.tsx` fallback**
   - Update `reproductive_states` and `reproductive_current_state` tables to `'post_parto'` / `'sin_actividad'` in the catch block
   - Add query invalidations for `reproductive-alerts`, `reproductive-kpis`, `activities`

3. **Add evento creation for non-successful calving results**
   - Insert into `eventos` table with appropriate type so all reproductive events appear in activity history

### Files to Modify
- `src/components/activities/NewPregnancyLossDialog.tsx` (case-sensitivity fix)
- `src/components/activities/CalvingRegistrationManager.tsx` (fallback state update, query invalidations, evento creation)

