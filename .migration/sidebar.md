# sidebar

2026-09-04 — golden pair via CLI; migrated Sidebar's Radix Slot composition to Base UI render utilities and Nova styling.

## Changed

- `resources/js/components/ui/sidebar.tsx:2` uses `mergeProps` / `useRender` for polymorphic menu controls.
- App sidebar, primary/footer navigation, and settings navigation consumers now use `render`. The leftover scan `grep -n "radix-ui\|@radix-ui" resources/js/components/ui/sidebar.tsx resources/js/components resources/js/layouts` is clean.

## Left alone

- Sidebar persistence, keyboard shortcut, responsive state, labels, and navigation targets remain application-owned.

## Behavior changes

- Mobile sidebar width matches the desktop default (`16rem`), capped at the viewport width minus `2rem`. Its inline width overrides the Sheet's side-specific percentage width so resizing across the `sm` breakpoint does not change the drawer width.

## Verify by hand

- Collapse/expand the sidebar on desktop and mobile, use its keyboard shortcut, tab through links, and confirm active and tooltip states.
