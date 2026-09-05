# button

2026-09-04 — golden pair via CLI; migrated the shared button from Radix Slot to the real Base UI Button primitive with Nova variants.

## Changed

- `resources/js/components/ui/button.tsx:1` now wraps `@base-ui/react/button` and exposes Base UI's `render` contract. The leftover scan `grep -n "radix-ui\|@radix-ui" resources/js/components/ui/button.tsx` is clean.
- Button consumers that previously nested a native button via `asChild` now set native button props directly or use `render` on the owning trigger.

## Left alone

- Application-specific button labels, submit behavior, and test selectors are unchanged.

## Behavior changes

## Verify by hand

- Exercise normal, destructive, link-rendered, and submit buttons with mouse and keyboard; confirm disabled and focus-visible states.
