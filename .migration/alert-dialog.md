# alert-dialog

2026-09-09 — manual quality review of the existing Base UI Nova wrapper; responsive bounds verified.

## Changed

- `resources/js/components/ui/alert-dialog.tsx:60` constrains height to the dynamic viewport, enables internal scrolling, and retains horizontal margins at 320px.
- Account deletion, passkey removal, and two-factor confirmation dialogs retain Base UI focus trapping and their existing form behavior.
- The Radix import scan is clean for this wrapper and its consumers.

## Left alone

- Base UI primitive composition, installer feature regions, and destructive action handlers remain in place.

## Behavior changes

- Long dialog content scrolls inside the viewport instead of hiding controls beyond the screen edges.

## Verify by hand

- Open deletion and two-factor dialogs at 320px and in landscape; reach the actions, Cancel, and confirm focus returns to the trigger.
