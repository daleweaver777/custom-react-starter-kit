# navigation-menu

2026-09-04 — golden pair via CLI; migrated the navigation menu to Base UI Nova's Positioner/Popup/Viewport structure.

## Changed

- `resources/js/components/ui/navigation-menu.tsx:1` now uses `@base-ui/react/navigation-menu`, Base UI data hooks, and Nova styles. The leftover scan `grep -n "radix-ui\|@radix-ui" resources/js/components/ui/navigation-menu.tsx` is clean.

## Left alone

- Laravel's header navigation entries and URLs are unchanged.

## Behavior changes

- Base UI's navigation-menu hover delay is shorter than Radix's historical default, so pointer opening may feel faster.

## Verify by hand

- Traverse the desktop navigation with pointer, Tab, arrows, Enter, and Escape; confirm popup placement and focus return.
