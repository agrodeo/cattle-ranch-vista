

## Plan: Add "Registro de Partos" to the Activity Creation Flow

### Problem
The calving registration activity exists in the ReproductivasTab but is not accessible from the mobile "Add Activity" flow (`ActivityCreationFlow.tsx`), where all other activities (vaccination, weighing, insemination, etc.) are listed.

### Changes

**1. Modify `src/components/mobile/flows/ActivityCreationFlow.tsx`**
- Add `"calving"` to the `ActivityType` union
- Add a new card entry: icon `Baby` (from lucide-react), title from `t('activityCreation.calving.title')`, green color (`bg-green-600`)
- When selected, navigate to a full-screen view rendering `<CalvingRegistrationManager />` (the existing component) instead of opening a dialog
- Add back button + close handling for the calving flow

**2. Add i18n strings to all 3 locale files**
- `src/i18n/locales/es/activities.json` — add `activityCreation.calving.title`: "Registro de Partos", `description`: "Registrar nacimientos y partos"
- `src/i18n/locales/en/activities.json` — add `activityCreation.calving.title`: "Calving Registration", `description`: "Register births and calvings"
- `src/i18n/locales/pt/activities.json` — add `activityCreation.calving.title`: "Registro de Partos", `description`: "Registrar nascimentos e partos"

### Technical Notes
- CalvingRegistrationManager is a standalone component (not a dialog), so when selected it will render inline in a full-screen container with a back/close button, similar to how other full-screen flows work in mobile
- The existing CalvingRegistrationManager already has mobile optimization, so no additional responsive work needed

