

## Problem
The "Total Animals" KPI uses the `Beef` icon (a piece of meat). The user wants a bovine/cow icon instead.

## Solution
Use `cowHead` from `@lucide/lab` (already installed). Since `ReportKpiCard` expects a `LucideIcon` component but lab icons are `IconNode` arrays, I need to either:

1. **Wrap the lab icon** into a component that matches the `LucideIcon` signature, OR
2. **Update `ReportKpiCard`** to accept both types.

**Chosen approach**: Create a small wrapper component inline in Dashboard.tsx that converts `cowHead` from `@lucide/lab` into a standard React component compatible with the `LucideIcon` prop type. This avoids modifying the shared `ReportKpiCard`.

### Changes

**`src/pages/Dashboard.tsx`**:
- Import `Icon` from `lucide-react` and `cowHead` from `@lucide/lab`
- Remove `Beef` import
- Create a wrapper: `const CowHeadIcon = (props) => <Icon iconNode={cowHead} {...props} />`
- Use `CowHeadIcon` as the icon prop for the Total Animals KPI card

This is a single-file, ~5-line change.

