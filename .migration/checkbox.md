# checkbox

2026-09-04 — golden pair via CLI; migrated the checkbox wrapper to Base UI Nova.

## Changed

- `resources/js/components/ui/checkbox.tsx:3` now uses `@base-ui/react/checkbox` and Base UI state attributes. The leftover scan `grep -n "radix-ui\|@radix-ui" resources/js/components/ui/checkbox.tsx` is clean.

## Left alone

- Form state ownership and labels remain in existing Laravel pages.

## Behavior changes

- Base UI represents indeterminate state with a separate `indeterminate` boolean rather than the Radix string value; current starter consumers use booleans.

## Verify by hand

- Toggle each authentication/settings checkbox with pointer and Space; confirm its submitted value and visual checked state.
