# avatar

2026-09-04 — golden pair via CLI; migrated the Radix avatar wrapper to the Base UI Nova implementation.

## Changed

- `resources/js/components/ui/avatar.tsx:2` now uses `@base-ui/react/avatar` and Nova parts/styles. The leftover scan `grep -n "radix-ui\|@radix-ui" resources/js/components/ui/avatar.tsx` is clean.

## Left alone

- Application avatar consumers retain the public shadcn wrapper API.

## Behavior changes

- Base UI names the delayed image-loading prop `delay` rather than Radix's `delayMs`; no starter-kit consumer used the old prop.

## Verify by hand

- Load the header and sidebar user menus; confirm the image renders and the fallback initials appear when the image fails.
