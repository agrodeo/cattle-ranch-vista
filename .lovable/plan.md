

## Plan: Remove Dashboard Title and Subtitle on Mobile

**File: `src/pages/Dashboard.tsx`**

Add `hidden lg:block` classes to the header `<div>` containing the title ("Panel de Control") and subtitle ("Resumen de tu operación ganadera") so they only show on desktop. The "Registrar actividad" button section already has `hidden lg:block`, so the entire header row can be hidden on mobile.

Specifically, wrap the title/subtitle `<div>` with `hidden lg:block` or apply it to the parent flex container and restructure so the button still works on desktop.

