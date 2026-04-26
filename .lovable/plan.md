Plan to make the manual bulk animal entry fit cleanly on mobile and desktop without unwanted horizontal sliding.

1. Replace the desktop bulk table with a responsive layout
- Remove the wide multi-column table that forces horizontal scroll.
- Use compact animal “row cards” that adapt by screen size:
  - Mobile: 1 column stacked fields.
  - Tablet: 2 columns.
  - Desktop: 4–5 columns, wrapping naturally instead of overflowing.
- Keep the same fields, validation, duplicate/delete/detail actions, and batch submit behavior.

2. Improve the desktop dialog container
- Keep the large desktop modal, but ensure it never exceeds viewport width.
- Add `min-w-0`, `overflow-x-hidden`, and responsive width classes so long labels/selects cannot expand the modal.
- Keep vertical scrolling only inside the dialog when content is long.

3. Improve the mobile manual entry screen
- Ensure every card, input, select, header, and action row uses `min-w-0` and wraps properly.
- Make top buttons/labels compact on narrow screens so the header does not create sideways overflow.
- Keep the mobile card flow already implemented, but tighten spacing and button wrapping for small devices.

4. Preserve functionality
- No database/schema changes.
- No changes to routes, plan limits, offline sync, validation, or translations unless a label needs a minor responsive-friendly adjustment.
- Existing “add row”, “duplicate”, “delete”, “complete detail”, defaults, and create-all-at-once flows remain intact.

Technical details
- Main file: `src/components/animals/AnimalFormDialog.tsx`
  - Replace `<Table>` usage in bulk creation mode with responsive card/grid rows.
  - Remove the `overflow-x-auto` wrapper that creates the horizontal scrollbar.
  - Add safer responsive classes to `DialogContent`, defaults grid, row fields, and action buttons.
- Mobile file: `src/components/mobile/flows/ManualAnimalForm.tsx`
  - Add overflow safeguards and responsive wrapping to the fixed mobile form header/cards.
- Optional cleanup: remove unused table imports from `AnimalFormDialog.tsx` after replacing the table.

Acceptance criteria
- On mobile, no horizontal scrollbar appears and all fields/actions are reachable by vertical scroll.
- On desktop, the modal fits within the screen with no page-level horizontal sliding.
- Users can still load multiple animals at once and access the full detail fields for each animal.
- Existing edit-animal modal behavior remains unchanged except for overflow safety.