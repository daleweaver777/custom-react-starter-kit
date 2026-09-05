# dropdown-menu

2026-09-04 — golden pair via CLI; migrated dropdown menus from Radix DropdownMenu to Base UI Menu and updated consumers.

## Changed

- `resources/js/components/ui/dropdown-menu.tsx:4` now uses `@base-ui/react/menu` with Base UI Positioner/Popup anatomy.
- Header, sidebar, navigation, and user-menu triggers/items now use `render` rather than `asChild`. The leftover scan `grep -n "radix-ui\|@radix-ui" resources/js/components/ui/dropdown-menu.tsx resources/js/components` is clean.

## Left alone

- Menu destinations, logout behavior, user data, and icons are unchanged.

## Behavior changes

- Base UI checkbox and radio menu items default to staying open on click; add `closeOnClick` only when a future consumer requires Radix-style closing.

## Verify by hand

- Open both user menus, navigate by arrows and typeahead, activate every link/action, and confirm focus returns to the trigger.
