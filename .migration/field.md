# field

2026-09-04 — added the Base UI Nova shadcn field wrapper and migrated starter-kit forms to its composition model.

## Changed

- Added `resources/js/components/ui/field.tsx` from the Base UI Nova registry while retaining the existing compatible label wrapper.
- Authentication, profile, security, passkey, delete-account, and two-factor forms now use `FieldGroup`, `Field`, and `FieldLabel`.
- Controls set `aria-invalid` and their containing fields set `data-invalid`; the shared `InputError` now renders `FieldError` with the semantic destructive token.

## Left alone

- Inertia form actions, input names, tab order, autocomplete attributes, focus refs, and Chisel feature markers remain intact.

## Behavior changes

- Validation messages now have `role="alert"`, and invalid labels and controls share shadcn's semantic destructive styling.

## Verify by hand

- Submit each authentication and settings form with invalid data; verify its label, control, and error state are announced and styled together.
- Run Chisel with email verification, registration, passkeys, and 2FA both enabled and disabled; confirm no unused imports remain.
