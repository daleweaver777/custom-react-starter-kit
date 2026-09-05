# dialog

2026-09-04 — golden pair via CLI; migrated dialogs and all starter-kit trigger/close consumers to Base UI Nova.

## Changed

- `resources/js/components/ui/dialog.tsx:4` uses `@base-ui/react/dialog`, with `Backdrop` and `Popup` replacing Radix Overlay and Content.
- Delete-user and passkey dialogs now use trigger/close `render` props. The leftover scan `grep -n "radix-ui\|@radix-ui" resources/js/components/ui/dialog.tsx resources/js/components/delete-user.tsx resources/js/components/passkey-item.tsx` is clean.

## Left alone

- Destructive actions, Inertia form handlers, and Chisel-controlled passkey files remain functionally unchanged.

## Behavior changes

- Base UI supplies focus targets through `initialFocus` / `finalFocus` rather than Radix event callbacks; the starter wrappers did not expose custom focus callbacks.

## Verify by hand

- Open, cancel, confirm, and Escape-close account and passkey dialogs; verify focus returns to the trigger and Tab remains trapped while open.
