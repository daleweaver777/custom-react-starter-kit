# toggle-group

2026-09-04 — golden pair via CLI; migrated toggle groups to Base UI Nova.

## Changed

- `resources/js/components/ui/toggle-group.tsx:4` now composes Base UI Toggle and ToggleGroup primitives. The leftover scan `grep -n "radix-ui\|@radix-ui" resources/js/components/ui/toggle-group.tsx` is clean.

## Left alone

- No application-specific toggle-group consumer required changes.

## Behavior changes

- Base UI represents single/multiple selection with a `multiple` boolean and array-shaped values rather than Radix's `type` prop; future consumers must use the Base UI contract.

## Verify by hand

- Test single and multiple groups with mouse and arrow keys; confirm selected values and focus looping.
