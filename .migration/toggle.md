# toggle

2026-09-04 — golden pair via CLI; migrated toggles to the Base UI primitive with Nova variants.

## Changed

- `resources/js/components/ui/toggle.tsx:3` now uses `@base-ui/react/toggle`. The leftover scan `grep -n "radix-ui\|@radix-ui" resources/js/components/ui/toggle.tsx` is clean.

## Left alone

- No application-specific toggle consumer required changes.

## Behavior changes

## Verify by hand

- Toggle each size/variant using pointer, Space, and Enter; confirm `aria-pressed` and visual state remain synchronized.
