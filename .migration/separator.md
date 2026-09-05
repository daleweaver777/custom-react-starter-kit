# separator

2026-09-04 — golden pair via CLI; migrated separators to the callable Base UI primitive with Nova styling.

## Changed

- `resources/js/components/ui/separator.tsx:3` now uses `@base-ui/react/separator`. The leftover scan `grep -n "radix-ui\|@radix-ui" resources/js/components/ui/separator.tsx` is clean.

## Left alone

- Separator placement and orientation in application layouts are unchanged.

## Behavior changes

- Base UI does not expose Radix's `decorative` prop; no starter consumer depended on it.

## Verify by hand

- Inspect horizontal and vertical separators and confirm decorative separators are not announced unexpectedly by a screen reader.
