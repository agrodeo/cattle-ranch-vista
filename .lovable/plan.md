
# Instagram Stories Achievement Card Redesign

## Goal
Redesign the shareable achievement card to look stunning on Instagram Stories (1080x1920 portrait ratio) with a premium, modern design that users are proud to share.

## Current Problems
1. **Wrong aspect ratio** -- The current card is a small square-ish card, not optimized for Instagram Stories (9:16 portrait).
2. **Bland design** -- White background with a simple circle and emoji; looks like a placeholder, not a social-media-worthy graphic.
3. **No visual richness** -- No background patterns, no tier-specific color themes, no decorative elements.
4. **Small canvas** -- html2canvas captures only the tiny card element; the resulting image is low-res and awkward when pasted into a Story.

## Design Direction

The new shareable card will be a **full 9:16 portrait canvas** (1080x1920 ratio, rendered at 360x640 CSS pixels at scale 3) with:

- **Tier-specific dark gradient backgrounds**: Gold = warm amber-to-brown, Silver = cool slate-to-gray, Bronze = copper-to-dark-brown
- **Large centered medal** with a glowing ring effect (double border + box-shadow)
- **Decorative star/sparkle elements** using CSS-only positioned divs (no external images needed for html2canvas)
- **Bold typography**: Large tier name, achievement name, stat, and date
- **agrodeo branding** at top and bottom with a subtle tagline
- **"Swipe up" / handle prompt** area at the bottom for Instagram UX convention

## Plan

### 1. Create a dedicated Story canvas component

**File:** `src/components/achievements/AchievementStoryCard.tsx` (new)

A separate component specifically designed for the 9:16 share image:

- Fixed 360x640px container (rendered at 3x scale = 1080x1920 output)
- All inline styles (html2canvas compatibility)
- Tier-specific gradient backgrounds:
  - Gold: `linear-gradient(180deg, #92400e 0%, #78350f 40%, #451a03 100%)`
  - Silver: `linear-gradient(180deg, #374151 0%, #1f2937 40%, #111827 100%)`
  - Bronze: `linear-gradient(180deg, #78350f 0%, #451a03 40%, #1c1917 100%)`
- Layout (top to bottom):
  1. **agrodeo** logo in white/gold text
  2. Decorative CSS sparkles (small rotated squares with tier-accent color)
  3. **Large medal circle** (120px) with double-ring glow effect
  4. **Tier label**: "MEDALLA DE ORO" in uppercase, letter-spaced
  5. **Achievement name** in large bold white text
  6. **Achievement description** in lighter text
  7. **Stat pill**: "100 logros" in a rounded pill
  8. **Date** when unlocked
  9. **Bottom bar**: "agrodeo.com" branding + subtle divider

### 2. Update AchievementCard to use the Story canvas for sharing

**File:** `src/components/achievements/AchievementCard.tsx`

- Import the new `AchievementStoryCard` and render it off-screen (position absolute, left -9999px) as the capture target for `html2canvas`.
- The visible card in the dialog stays as-is (or gets a minor visual refresh).
- Update `generateImage` to target the Story card element and use `scale: 3` for crisp 1080x1920 output.
- Add an "Instagram Stories" label/icon on the share button to signal the format.

### 3. Add Instagram-specific share text

**File:** `src/components/achievements/AchievementCard.tsx`

- Update the share payload `title` and `text` to be more social-friendly.
- File name: `agrodeo-story-{tier}-{code}.png`

### 4. Minor gallery visual polish

**File:** `src/components/achievements/AchievementsGallery.tsx`

- Add a subtle shimmer/glow animation on unlocked medals in the grid (CSS keyframe, scoped).
- Add tier-colored ring on the gallery medal circles so they pop more visually.

### 5. Add translation keys

**Files:** `src/i18n/locales/es/common.json`, `src/i18n/locales/en/common.json`, `src/i18n/locales/pt/common.json`

- Add: `achievements.share_story` = "Compartir en Stories" / "Share to Stories" / "Compartilhar nos Stories"
- Add: `achievements.share_instagram` = "Instagram Story"
- Add: `achievements.branding_tagline` = "Gestiona tu ganado como un profesional"

---

## Technical Details

### Story card dimensions
- CSS: 360px x 640px
- html2canvas scale: 3
- Output: 1080px x 1920px (Instagram Stories native resolution)

### Files modified

| File | Change |
|------|--------|
| `src/components/achievements/AchievementStoryCard.tsx` | New: 9:16 portrait share canvas |
| `src/components/achievements/AchievementCard.tsx` | Use Story canvas for image generation, update share flow |
| `src/components/achievements/AchievementsGallery.tsx` | Add glow animation on unlocked medals |
| `src/i18n/locales/es/common.json` | Add story share keys |
| `src/i18n/locales/en/common.json` | Add story share keys |
| `src/i18n/locales/pt/common.json` | Add story share keys |

### Risk assessment
- No database changes
- No routes or flows altered
- html2canvas still used (proven approach), just targeting a larger, better-designed element
- All new styles are inline (scoped to share components) -- no global CSS changes
- Existing gallery card layout preserved
