# input-group

2026-09-04 — added the Base UI Nova shadcn input-group wrapper for controls with inline actions.

## Changed

- Added the registry `input-group` wrapper and its `textarea` dependency.
- `PasswordInput` now composes `InputGroupInput`, `InputGroupAddon`, and `InputGroupButton` for its visibility action.
- The two-factor manual setup key now uses the same composition for its copy action and loading state.

## Left alone

- Password visibility remains unfocusable by tab to preserve the starter kit's existing keyboard order.
- Password props and refs still reach the native input, and the two-factor clipboard behavior is unchanged.

## Behavior changes

- Focus and invalid rings are owned by the complete input group instead of independently styled inputs and raw buttons.

## Verify by hand

- Toggle password visibility on all authentication and security forms and confirm focus, autofill, validation, and submission still work.
- Enable 2FA, copy the manual setup key, and confirm the copied-state icon updates.
