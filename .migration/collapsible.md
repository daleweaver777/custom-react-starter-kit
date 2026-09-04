# collapsible

2026-09-04 — golden pair via CLI; migrated the collapsible wrapper to Base UI Nova.

## Changed

- `resources/js/components/ui/collapsible.tsx:1` uses `@base-ui/react/collapsible`; the public Content wrapper now maps to `Collapsible.Panel`. The leftover scan `grep -n "radix-ui\|@radix-ui" resources/js/components/ui/collapsible.tsx` is clean.

## Left alone

- Sidebar state and disclosure content remain application-owned.

## Behavior changes

## Verify by hand

- Expand and collapse the sidebar disclosure by pointer and keyboard; confirm content visibility and focus order.
