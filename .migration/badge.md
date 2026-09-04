# badge

2026-09-04 — golden pair via CLI; migrated the Radix Slot-based polymorphism to the Base UI render utility with Nova styles.

## Changed

- `resources/js/components/ui/badge.tsx:1` now uses `mergeProps` and `useRender`; the public polymorphic prop is `render`. The leftover scan `grep -n "radix-ui\|@radix-ui" resources/js/components/ui/badge.tsx` is clean.

## Left alone

- Existing badge variants and consumers remain source-compatible unless they used the removed Radix-only `asChild` prop.

## Behavior changes

## Verify by hand

- Render each badge variant and a badge with a custom `render` element; confirm classes, semantics, and focus behavior.
