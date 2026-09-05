# empty

2026-09-04 — added the Base UI Nova shadcn empty-state composition for passkeys.

## Changed

- Added `resources/js/components/ui/empty.tsx` from the Base UI Nova registry.
- The no-passkeys view now uses `Empty`, `EmptyHeader`, `EmptyMedia`, `EmptyTitle`, and `EmptyDescription`.

## Left alone

- Passkey capability checks, registration, deletion, and Chisel-controlled passkey file removal remain unchanged.

## Behavior changes

- The empty state now inherits Nova spacing, typography, icon sizing, and semantic colors.

## Verify by hand

- Open security settings for an account with no passkeys and confirm the empty state and Add passkey action render correctly.
