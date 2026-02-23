

# Fix: Tab Overflow on Mobile and Tablet Viewports

## Issues Found

### 1. Settings page -- 5 tabs in 3-column grid on mobile (HIGH RISK)
**File:** `src/pages/Settings.tsx` (line 39)

The `TabsList` uses `grid-cols-3 sm:grid-cols-5`. On mobile, 5 tabs are forced into a 3-column grid, creating a second row with only 2 items. The tab labels (especially "Vacunas", "Usuarios", "General", "Facturación") can overflow or truncate, and the grid layout looks uneven with the orphan row.

**Fix:** On mobile, switch to a horizontally scrollable tab strip using `flex overflow-x-auto` instead of a grid. Add `whitespace-nowrap` and `scrollbar-hide` to prevent wrapping and hide the scrollbar. Alternatively, use `grid-cols-3` for the first 3 and stack the remaining 2 below with a clean `grid-cols-2` second row -- but the scroll approach is cleaner for 5 tabs.

### 2. AnimalProfileTabs -- 8 tabs in grid-cols-8 at ~768px (MEDIUM RISK)
**File:** `src/components/animals/profile/AnimalProfileTabs.tsx` (line 95)

Desktop uses `grid-cols-8` with 8 tabs. At the 768px breakpoint (where `isMobile` flips to false), each tab gets ~85px, but labels like "Reproducción", "Documentos", "Genealogía" are 10-12 characters. The text is already truncated with `hidden sm:inline`, but the icons alone at that size still crowd.

**Fix:** Add `overflow-x-auto` to the `TabsList` wrapper and switch from `grid` to `flex` with `flex-shrink-0` on each trigger, so tabs scroll horizontally rather than crushing. This is already handled on true mobile via `Select`, so this only affects the 768-1024px zone.

### 3. Reports desktop -- 6 tabs in grid-cols-6 on tablets (LOW RISK)
**File:** `src/pages/Reports.tsx` (line 245)

Six tabs in `grid-cols-6` at tablet widths. Labels like "Reproducción", "Producción", "Evolución" can get cramped around 768-900px.

**Fix:** Add `text-xs lg:text-sm` to the TabsTriggers and ensure `truncate` is applied so text clips gracefully rather than overflowing the grid cell.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Settings.tsx` | Replace grid TabsList with scrollable flex layout on mobile |
| `src/components/animals/profile/AnimalProfileTabs.tsx` | Add overflow-x-auto + flex layout for desktop TabsList at narrow widths |
| `src/pages/Reports.tsx` | Add truncate + smaller text on TabsTriggers for tablet safety |

## Risk Assessment
- No database changes
- No routes or flows altered
- Settings tab IDs and values stay the same
- Only CSS/layout changes scoped to TabsList containers
- No global CSS modifications
