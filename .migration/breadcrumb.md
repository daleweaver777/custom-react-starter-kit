# breadcrumb

2026-09-04 — golden pair via CLI; migrated breadcrumb links from Radix Slot to Base UI `useRender` and updated consumers.

## Changed

- `resources/js/components/ui/breadcrumb.tsx:2` uses Base UI render utilities.
- `resources/js/components/breadcrumbs.tsx` passes custom links through `render` rather than `asChild`. The leftover scan `grep -n "radix-ui\|@radix-ui" resources/js/components/ui/breadcrumb.tsx resources/js/components/breadcrumbs.tsx` is clean.

## Left alone

- Breadcrumb data construction and Inertia navigation targets are unchanged.

## Behavior changes

## Verify by hand

- Open a nested settings page, tab through its breadcrumbs, and confirm each link navigates once with the expected label.
