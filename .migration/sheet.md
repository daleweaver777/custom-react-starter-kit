# sheet

2026-09-04 — golden pair via CLI; migrated the sheet wrapper onto Base UI Dialog with Nova slide styling.

## Changed

- `resources/js/components/ui/sheet.tsx:2` uses `@base-ui/react/dialog` with Backdrop/Popup anatomy.
- `resources/js/components/app-header.tsx` migrates the mobile-menu trigger to `render`. The leftover scan `grep -n "radix-ui\|@radix-ui" resources/js/components/ui/sheet.tsx resources/js/components/app-header.tsx` is clean.

## Left alone

- Mobile navigation content and destinations are unchanged.

## Behavior changes

## Verify by hand

- At a mobile viewport, open and close the sheet by trigger, close button, Escape, and outside press; confirm focus return and each side animation.
