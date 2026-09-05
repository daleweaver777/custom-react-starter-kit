# tooltip

2026-09-04 — golden pair via CLI; migrated tooltips to Base UI Nova positioning and updated the provider/trigger consumers.

## Changed

- `resources/js/components/ui/tooltip.tsx:1` now uses `@base-ui/react/tooltip` with Portal/Positioner/Popup anatomy.
- `resources/js/app.tsx` uses provider `delay`; header triggers use `render`. The leftover scan `grep -n "radix-ui\|@radix-ui" resources/js/components/ui/tooltip.tsx resources/js/app.tsx resources/js/components` is clean.

## Left alone

- Tooltip text and the application's zero-delay preference are unchanged.

## Behavior changes

- Base UI has no direct `disableHoverableContent` or skip-delay equivalent; the starter did not use either option.

## Verify by hand

- Hover and keyboard-focus header and collapsed-sidebar triggers; confirm placement, immediate opening, dismissal, and readable arrow alignment.
