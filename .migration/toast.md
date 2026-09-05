# toast

2026-09-04 — replaced the Sonner notification surface with shadcn's Base UI Nova toast manager.

## Changed

- Added `resources/js/components/ui/toast.tsx` from the Base UI Nova registry.
- Added `FlashToaster` to connect Inertia's Laravel flash events to `toast.add` while keeping the registry wrapper application-agnostic.
- Removed the Sonner wrapper and dependency.

## Left alone

- The Laravel `FlashToast` payload remains `{ type, message }`, and the existing Inertia flash event subscription remains the source of notifications.

## Behavior changes

- Toast layout, stacking, swipe dismissal, icons, and timing now follow Base UI rather than Sonner.

## Verify by hand

- Trigger success, info, warning, and error flash messages; confirm each appears once with the expected icon and can be dismissed by button and swipe.
