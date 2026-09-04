# select

2026-09-04 — golden pair via CLI; migrated selects to Base UI Nova anatomy and positioning.

## Changed

- `resources/js/components/ui/select.tsx:2` now uses `@base-ui/react/select`, including Positioner/Popup/List and Base UI item parts. The leftover scan `grep -n "radix-ui\|@radix-ui" resources/js/components/ui/select.tsx` is clean.

## Left alone

- Application option values and labels remain unchanged.

## Behavior changes

- Base UI may pass `null` to `onValueChange` when a value is cleared; future controlled consumers must allow or wrap that value.

## Verify by hand

- Open each select, use arrow keys and typeahead, choose an item, and confirm its value is submitted and focus returns to the trigger.
