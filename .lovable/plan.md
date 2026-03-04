

## Dashboard Visual Redesign

Based on the reference image, the user wants a cleaner, more polished dashboard that matches the style shown: white rounded cards with subtle shadows, prominent KPI cards with icons and trend indicators, and a well-organized grid layout.

### What changes

**1. Enhanced MetricCard (`src/components/ui/metric-card.tsx`)**
- Add a subtle green circle/rounded icon background (matching reference where each KPI has a small green circle with the icon)
- Larger, bolder value numbers
- Add a small trend/subtitle line below (e.g., "Increased from last month") in green text
- Remove gradients from colored variants; keep solid white bg with green accents
- More prominent rounded corners (rounded-2xl) and clean shadow

**2. Dashboard Layout (`src/pages/Dashboard.tsx`)**
- Change KPI grid to always show 4 columns on desktop (already does this)
- Add an "Import Data" secondary button next to the primary action in the header
- Improve spacing between sections
- Make the right sidebar cards feel more like the reference (clean white cards with headers)

**3. SectionCard refinement (`src/components/ui/section-card.tsx`)**
- Slightly bolder header text
- Add a small "+ New" style button option in the header (like the "Project" card in the reference)
- Clean divider between header and content

**4. RecentActivityItem polish (`src/components/dashboard/RecentActivityItem.tsx`)**
- Add colored dot indicators (like the reference project list items) instead of just icons
- Cleaner date formatting underneath
- Remove the redundant badge that duplicates the activity type name

**5. PageHeader update (`src/components/ui/page-header.tsx`)**
- Slightly larger title with the subtitle style matching reference ("Plan, prioritize, and accomplish...")
- Support for multiple action buttons side by side

### Technical scope
- Only scoped CSS/className changes to dashboard-related components
- No database, route, or logic changes
- No global CSS modifications
- Preserves all existing functionality, translations, and data flow

### Files to modify
- `src/components/ui/metric-card.tsx` -- green icon circles, cleaner design
- `src/pages/Dashboard.tsx` -- layout spacing tweaks, add import button
- `src/components/dashboard/RecentActivityItem.tsx` -- remove duplicate badge, add dot indicator
- `src/components/ui/section-card.tsx` -- bolder header, optional inline action
- `src/components/ui/page-header.tsx` -- support multiple actions

