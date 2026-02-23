
# Fix: Cleanup Bugs and Missing Pieces

## Issues Found

### 1. Debug `console.log` left in SelectTrigger component
**File:** `src/components/ui/select.tsx` (line 22)

Every time any `<Select>` renders, it logs `SelectTrigger render: { forceEnabled, disabled, finalDisabled }` to the console. This fires dozens of times per page load, polluting logs and slightly hurting performance.

**Fix:** Remove the `console.log` statement on line 22.

---

### 2. Missing translation key: `aiChat.history`
**File:** Console warning: `Missing translation key: common:aiChat.history for language: es`

The `AIChatDialog.tsx` component uses `t('aiChat.history', 'Historial')` but the key doesn't exist in any locale file.

**Fix:** Add `"history": "Historial"` to `es/common.json`, `"history": "History"` to `en/common.json`, and `"history": "Historico"` to `pt/common.json` inside the `aiChat` object.

---

### 3. `medal-glow` animation not defined in Tailwind config
**File:** `src/components/achievements/AchievementsGallery.tsx` (line 94)

Uses `animate-[medal-glow_3s_ease-in-out_infinite]` which references a `@keyframes medal-glow` that doesn't exist anywhere. The arbitrary animation syntax in Tailwind requires the `@keyframes` to be defined in CSS. Currently the animation silently does nothing.

**Fix:** Add a `@keyframes medal-glow` rule in `src/index.css` that pulses the box-shadow opacity for a subtle glow effect.

---

### 4. Progress bar can exceed 100% width
**File:** `src/components/achievements/AchievementsGallery.tsx` (line 149)

The progress bar width is calculated as `(currentValue / definition.tiers.gold.threshold) * 100` with no cap. If a user's value exceeds the gold threshold, the bar overflows.

**Fix:** Clamp the width to `Math.min(100, ...)`.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/ui/select.tsx` | Remove debug `console.log` |
| `src/i18n/locales/es/common.json` | Add `aiChat.history` key |
| `src/i18n/locales/en/common.json` | Add `aiChat.history` key |
| `src/i18n/locales/pt/common.json` | Add `aiChat.history` key |
| `src/index.css` | Add `@keyframes medal-glow` |
| `src/components/achievements/AchievementsGallery.tsx` | Cap progress bar at 100% |

## Risk Assessment
- No database changes
- No routes or flows altered
- All changes are scoped fixes (remove log, add translations, add keyframes, cap a number)
- No global CSS side effects
