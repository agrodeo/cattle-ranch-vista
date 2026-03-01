

## Simplified Achievement Sharing Cards

### Current State
The achievement cards currently use emoji medals (🥇🥈🥉) inside circular gradient rings, with generic text about "Medal of Gold" etc. The sharing story card (`AchievementStoryCard.tsx`) is a 360x640 canvas-like div rendered off-screen and captured with `html2canvas`.

### New Design

**Visual**: Replace the medal emoji with a **large, bold number** (the threshold value: 10, 50, 100, etc.) styled in the tier color (bronze/silver/gold).

**Text**: A personalized congratulatory message:
- ES: "agrodeo felicita a **[nombre usuario]** de **[cabaña]** por registrar **10** animales"
- EN: "agrodeo congratulates **[user name]** from **[ranch]** for registering **10** animals"
- PT: "agrodeo parabeniza **[nome usuario]** de **[fazenda]** por registrar **10** animais"

The exact message varies per achievement (animals, activities, vaccinations, finances, streak days, corrals).

### Changes

**1. Update `AchievementStoryCard.tsx`**
- Remove the emoji medal circle
- Add a large number (threshold) in tier color as the centerpiece
- Replace generic "Medal of Gold" text with the personalized congratulatory message
- Pass `userName`, `cabañaName`, and `threshold` as new props

**2. Update `AchievementCard.tsx`** (visible preview card)
- Same simplification: big number instead of emoji
- Same congratulatory text
- Pass the new props down to `AchievementStoryCard`

**3. Update `AchievementsGallery.tsx`**
- Pass `userName` and `cabañaName` to each `AchievementCard`

**4. Add i18n keys** (en, es, pt)
- Add per-achievement congratulatory messages:
  - `achievements.congrats.herd_starter`: "agrodeo congratulates {{user}} from {{cabana}} for registering {{count}} animals"
  - `achievements.congrats.activity_tracker`: "...for completing {{count}} activities"
  - `achievements.congrats.health_guardian`: "...for administering {{count}} vaccinations"
  - `achievements.congrats.financial_manager`: "...for recording {{count}} financial movements"
  - `achievements.congrats.consistent_user`: "...for {{count}} consecutive days of use"
  - `achievements.congrats.corral_organizer`: "...for organizing {{count}} corrals"

**5. Update `achievements.ts`**
- Add a helper to get the threshold number for a given tier from a definition

### Technical Details

- The big number will use `fontSize: '96px'` (story) / `fontSize: '64px'` (preview) with `fontWeight: 900`
- Colors: bronze = `#b45309`, silver = `#6b7280`, gold = `#d97706`
- No emoji medals anywhere in the sharing flow
- The `userName` and `cabañaName` come from `useSupabaseAuth().currentUser`
- No changes to achievement unlock logic, DB schema, or routes

