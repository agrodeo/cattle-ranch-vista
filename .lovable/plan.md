

# Achievement Story Card — Tier Colors, Layout Fix & Font Upgrade

## Problem
1. **No tier differentiation**: All story cards use the same green color regardless of bronze/silver/gold tier
2. **Text overlapping**: The number, exclamation marks, and item label collide at certain sizes
3. **Generic font**: System font stack looks plain — not share-worthy for social media

## Design

### Tier color palettes (applied to exclamation marks, header, item label, and accents):
- **Bronze**: `#CD7F32` (warm bronze) with number in `#4a3728`
- **Silver**: `#8C8C8C` (cool silver) with number in `#3d3d3d`  
- **Gold**: `#DAA520` (rich gold) with number in `#5c4a00`

### Layout fixes:
- Separate the number and item label with more vertical spacing
- Reduce exclamation mark size relative to the number to prevent overlap
- Cap item label font size more aggressively and add `wordBreak` for long labels
- Move content block slightly upward to leave breathing room at bottom for branding

### Font:
- Use Google Font **Montserrat** (bold, italic) — loaded via `@import` in the off-screen element's inline style. html2canvas captures computed styles so this works if the font is preloaded.
- Fallback: keep system font stack

## Changes

### 1. `src/components/achievements/AchievementStoryCard.tsx`
- Add `medalTier` prop
- Create a `getTierColors(tier)` helper returning `{ accent, number }` colors
- Apply tier colors to header text, exclamation marks, and item label
- Fix layout: reduce `¡` / `!` font size to match number height, increase gap between number row and item label
- Use Montserrat font family

### 2. `src/components/achievements/AchievementCard.tsx`
- Pass `medalTier` to `AchievementStoryCard`
- Update the visible preview card to also reflect tier colors instead of hardcoded green
- Add Montserrat font link in `<head>` via a `useEffect` on mount (ensures font loads before capture)

### 3. `src/lib/achievementStoryImage.ts`
- Add a small delay before capture to ensure fonts are loaded (`document.fonts.ready`)

### 4. `index.html`
- Add `<link>` to preload Montserrat font from Google Fonts (ensures it's available for html2canvas)

## No regressions
- Off-screen rendering approach unchanged
- No global CSS changes (font link only in `<head>`, scoped to story card via inline style)
- Share/download flow unchanged
- Existing achievement definitions, DB, hooks untouched

