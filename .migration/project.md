# Project migration

2026-09-04 — whole-project golden-pair migration using the official shadcn CLI and small-radius preset `b37ZhrNTs`; the Laravel React starter kit now resolves to Base UI Nova.

## Changed

- `components.json` resolves `style` as `base-nova`, `base` as `base`, and the requested small-radius preset as `b37ZhrNTs`.
- `package.json` replaces all Radix packages with `@base-ui/react` and the Nova preset dependencies.
- `resources/css/app.css` contains the Nova neutral/indigo theme, Inter variable font, and Tailwind theme tokens.
- All 17 Radix-backed or Slot-backed UI wrappers and their application consumers were migrated. `grep -RInE "radix-ui|@radix-ui|\\basChild\\b" resources/js package.json` is clean.
- The shadcn audit substitutions add Base UI `field`, `input-group`, `empty`, and `toast` wrappers; forms now expose semantic invalid states, appearance uses `ToggleGroup`, password and 2FA controls use `InputGroup`, and loading placeholders use `Skeleton`.
- Laravel flash notifications now use the Base UI toast manager through `FlashToaster`; Sonner and its wrapper were removed.
- Verification passed for frontend formatting/lint, the main-project TypeScript check and production build, Pint, PHPStan, and 39 PHPUnit tests (136 assertions).
- Chisel completed successfully in disposable all-feature, no-optional-feature, and mixed-feature copies; production builds passed for all three variants, and TypeScript checks passed for the all-feature and mixed variants.

## Left alone

- `cmdk`, `input-otp`, and other non-Radix libraries remain on their existing libraries, as required by the migration rules.
- Laravel backend code, installer hooks, Chisel scripts, Chisel paths, and Chisel-controlled sections remain upstream-compatible.
- The no-optional-feature copy retains an upstream TypeScript defect where Inertia shared page props resolve as `unknown`; the same failure was reproduced from untouched `upstream/main`, while that variant's production build passes.

## Behavior changes

- Navigation menu hover timing follows Base UI's shorter default.
- Dropdown checkbox/radio items do not close on selection unless `closeOnClick` is explicitly requested.
- Base UI controlled callbacks may include event details and nullable values; existing starter consumers have been adapted where needed.

## Verify by hand

- Exercise desktop/mobile navigation, menus, dialogs, selects, checkboxes, tooltips, dark mode, authentication, profile/security pages, and keyboard focus behavior.
- Install disposable starter-kit copies with all auth features, no optional auth features, and a mixed selection; confirm Chisel completes and the resulting frontend builds.

0 wrappers remain on Radix.
