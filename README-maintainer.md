# Starter Kit Maintainer Guide

This guide covers maintaining and publishing the starter-kit source. [README.md](README.md) is the guide for developers working on an installed application. [AGENTS.md](AGENTS.md) contains the repository invariants, detailed focus/theme rules, and instructions for coding agents.

## Repository Setup

Keep completed custom work on `main`. Configure `origin` to point to your hosted repository and `upstream` to Laravel's official React starter kit. Inspect the existing remotes before adding or changing one:

```bash
git remote -v
```

If `upstream` is missing:

```bash
git remote add upstream https://github.com/laravel/react-starter-kit.git
```

If it points elsewhere, correct it with `git remote set-url upstream https://github.com/laravel/react-starter-kit.git`. If `origin` is missing, add it using `git remote add origin YOUR_REPOSITORY_URL`, replacing the placeholder with your repository's Git URL.

Enable recorded conflict-resolution reuse locally:

```bash
git config rerere.enabled true
git config rerere.autoupdate true
git fetch upstream
```

## Working on the Starter Kit

Use the runtime requirements in [README.md](README.md#requirements). To install PHP dependencies in this source checkout, defer the feature installer:

```bash
LARAVEL_INSTALLER_DEFER_HOOKS=1 composer install
npm install --no-package-lock
```

The environment-variable syntax above is for POSIX shells. On other shells, set `LARAVEL_INSTALLER_DEFER_HOOKS` to `1` in the environment for the Composer process.

This flag matters because dependency resolution without a Composer lockfile can invoke `post-update-cmd`, which includes `install:features`. Without deferral, that command can trim features and delete installer and maintainer files from the checkout. Do not use `composer run setup` directly on the starter-kit source; reserve the installed-app setup workflow for generated applications.

The disposable CI setup workflow creates `.env` before installing Composer dependencies. Keep this order: dependency installation can invoke Chisel, whose initial migrations need the application's configured environment.

For a new local environment, copy `.env.example` to `.env`, configure the database, and generate an application key with `php artisan key:generate`. With SQLite, create `database/database.sqlite` if needed. Then run:

```bash
php artisan migrate
php artisan wayfinder:generate --with-form --no-interaction
composer run dev
```

Never run `install:features` in the maintained checkout to test installation. Use a disposable copy.

## Syncing Laravel Upstream

Start from a clean working tree on `main`:

```bash
git switch main
git status --short
git remote get-url upstream
```

Stop if `git status --short` shows changes. Verify that the upstream URL is Laravel's official repository before proceeding:

```bash
git fetch upstream
git branch backup/pre-upstream-sync-YYYY-MM-DD
git merge --no-ff upstream/main
```

Replace `YYYY-MM-DD` with the sync date and use a unique backup name if syncing more than once that day. Preserve published history by merging rather than rebasing it.

If there are conflicts, list them with:

```bash
git diff --name-only --diff-filter=U
```

Resolve non-UI conflicts in favor of upstream unless they overlap a documented customization. Resolve frontend conflicts individually, combining Laravel's functional changes with the existing Base UI APIs, Nova styles, and Chisel feature boundaries. Never use a whole-directory `--ours` resolution, an `ours` merge driver, or bulk component overwrites.

For changed UI wrappers, inspect the current preset and preview component changes:

```bash
npx shadcn@latest info --json
npx shadcn@latest add <component> --dry-run
npx shadcn@latest add <component> --diff
```

Replace `<component>` with the component being reviewed. Adapt its consumers to the matching Base UI APIs. Agents should follow the installed `shadcn` and `migrate-radix-to-base` skills and update the component and project reports under `.migration/` as required by AGENTS.md.

Preserve these local customizations:

- Base UI, Nova styling, and preset `b37ZhrNTs`.
- The single Tailwind/shadcn/Inter import set, Laravel `@source` directives, semantic theme tokens, and bundled `@fontsource-variable/inter` font. Keep the matching font configuration in `vite.config.ts`.
- Shared focus geometry, theme-color behavior, and accessibility rules described in [AGENTS.md](AGENTS.md#focus-styles-for-new-ui-components).
- The `FlashToaster` bridge, Base UI toasts, request-error alerts, their animations, and timed-notification countdown bars.
- Installer hooks, `chisel.php`, `chisel-paths.php`, `install:features`, and all intentional Chisel feature regions. Markers can share a line with other code or markers.

Run the verification below. If the merge stopped for conflicts, stage the resolved files and use `git merge --continue` after verification. If it completed automatically, commit any subsequent fixes separately. Inspect the final diff and working tree before pushing `main` to your `origin`.

## Verification

The source checkout must retain its installer files throughout these checks:

```bash
npx shadcn@latest info --json
rg -n 'radix-ui|@radix-ui|\basChild\b' resources/js package.json
git diff upstream/main -- chisel.php chisel-paths.php
git diff upstream/main -- resources/js | rg '@(end-)?chisel-'
LARAVEL_INSTALLER_DEFER_HOOKS=1 composer install
php artisan wayfinder:generate --with-form --no-interaction
npm install --no-package-lock
npm run check
npm run types:check
npm run build
composer run test
```

`shadcn info` must report `base: "base"`, `style: "base-nova"`, and preset `b37ZhrNTs`. The Radix/API scan must produce no output; `rg` exits with status 1 when there are no matches. Review Chisel diffs deliberately: upstream may legitimately change feature boundaries, but markers must not disappear accidentally. Resolve all conflicts and check failures before completing a sync.

This source repository follows upstream's packaging convention: do not commit generated Composer or JavaScript lockfiles, `vendor`, `node_modules`, or generated Wayfinder helpers. After verification, remove untracked generated lockfiles and Wayfinder artifacts, and inspect `git status --short`. The frontend development server or build will regenerate Wayfinder helpers when needed. These source-packaging rules do not apply to applications created from the kit.

Modal dialogs use the shared `Dialog` wrapper, which disables outside-click dismissal by default. Keep Cancel/Close and Escape available so identity confirmation, destructive confirmations, and two-factor setup close deliberately. `AlertDialog` already prevents outside dismissal through Base UI. Navigation sheets use their own dismissal behavior. Preserve this default when updating dialog components from shadcn.

## Installer Behavior and Testing

The Laravel installer uses `extra.laravel.installer.post-create-project` in `composer.json` to run `install:features`. The same command also appears in Composer's `post-update-cmd` for non-deferred dependency setup. These are distinct from Composer's own `post-create-project-cmd`, which generates the application key and creates the SQLite file if absent. Its migration step waits while `chisel.php` is present: Chisel runs initial migrations only after removing unselected feature migrations, so the generated database matches the selected features. After trimming, ordinary Composer project creation can safely run its migration step again.

Feature selection can retain email verification, registration, two-factor authentication, passkeys, and password confirmation. The installer trims unselected features, removes retained-feature markers, formats PHP, and regenerates Wayfinder helpers. Unless `LARAVEL_INSTALLER_NO_NODE=1`, it also installs JavaScript dependencies, removes unused feature packages, runs the frontend fixer, and builds assets.

Session revocation is attached to the `auth` middleware alias in `bootstrap/app.php`. `App\Http\Middleware\Authenticate` delegates authentication and guard selection to Laravel, then runs Laravel’s native `AuthenticateSession`. Application and package routes using `auth` or `auth:web` receive both checks; public routes do not need exclusions. Packages using a different authentication middleware or a class directly need separate review. Password updates retain the upstream controller: saving the password changes the fingerprint, so no additional `logoutOtherDevices()` call is needed. The framework must include laravel/framework#61594 to protect sessions left idle immediately after login.

The **Password confirmation** selection controls reauthentication for email-change requests, account deletion, passkey/2FA management, and secret/recovery-code access. Security page views never require confirmation. The shared action dialog reuses Fortify confirmation for five minutes by default (`AUTH_PASSWORD_TIMEOUT=300`); the server enforces the same timeout. Preserve Chisel regions in `confirmation-provider.tsx` so removed password/passkey confirmation routes leave no broken frontend imports. Password changes always require the current password, including when confirmation is disabled. Removing confirmation is an explicit security-policy choice: an authenticated session can perform these other sensitive actions without proving identity again.

Pending-address verification and previous-address notification remain independent of the password-confirmation and registration-verification selections. Keep the email-change migration, pending-address checks, notifications, and UI in every generated application. Existing installations need the `pending_email_changes` migration. Pending requests are limited to one row per user and expire after 30 minutes; expired rows cannot authorize changes and are replaced by subsequent requests or removed when the user cancels or deletes their account.

After Chisel's transformations, formatting, and initial migrations succeed, cleanup removes `AGENTS.md`, `README-maintainer.md`, the maintainer-only `InstallerMigrationHookTest`, the feature-install command, and both Chisel scripts. `README.md` remains. The frontend build follows this cleanup when Node steps are enabled.

In separate disposable copies with dependencies available, test these selections:

```bash
php artisan install:features --no-interaction --answers='{"auth_features":["email-verification","registration","2fa","passkeys","password-confirmation"]}'
php artisan install:features --no-interaction --answers='{"auth_features":[]}'
php artisan install:features --no-interaction --answers='{"auth_features":["registration","passkeys"]}'
```

Run one command per copy; successful trimming deletes the installer itself. Verify feature files and markers, confirm `README.md` survives and both maintainer documents are removed, and run the relevant application checks. Also test the no-Node path when changing installation behavior. Passing explicit `--answers` intentionally bypasses the deferral flag, so it must only be used in the disposable installation.

### Password-confirmation regression record (2026-09-15)

The initial policy checks passed with 90 PHP tests and 831 assertions, PHPStan, Pint, frontend lint/format checks, TypeScript, and a production build. Four fresh disposable applications ran Composer installation, the real Chisel command with Node steps enabled, frontend checks/builds, the full Composer test script, route-cache compilation, and packaging checks. Each application had its own dependency directories and SQLite database.

| Installed selection              | Passed tests | Skipped removed-feature tests | Assertions |
| -------------------------------- | -----------: | ----------------------------: | ---------: |
| All features                     |           89 |                             0 |        828 |
| All except password confirmation |           82 |                             3 |        758 |
| No optional features             |           61 |                             9 |        650 |
| Password confirmation only       |           67 |                             7 |        701 |

Browser checks on the first two selections used newly registered disposable accounts and log-only mail. They covered direct Security access, email-request confirmation/cancellation, incorrect-password feedback, pending-only email panels, verified-link completion, real TOTP setup, recovery-code viewing/hiding/regeneration, 2FA removal, inline old-password validation and successful password changes, and account deletion. The enabled selection also exercised expired confirmation, recent-confirmation reuse, passkey-registration gating, modal focus restoration, and automatic recovery-code clearing with a temporary 20-second timeout. The shipped timeout remains five minutes. Both disposable accounts were deleted successfully at the end.

`PasswordConfirmationPolicyTest` verifies real signed WebAuthn registration, confirmation, and deletion without mocking the credential validation. Native operating-system authenticator prompts were not automated in the browser check.

Email validation now uses Inertia's built-in Precognition support and Laravel's `EmailChangeRequest` rules before opening identity confirmation. The authenticated validation-only request cannot execute the controller, create pending records, or send mail. Real submissions still require confirmation when enabled and repeat validation. Validation has a separate 30-per-minute user budget; sending retains its six-per-minute user budget.

This follow-up passed 94 source tests (888 assertions), frontend checks/builds, and complete checks in two new Chisel installations with password confirmation selected and unselected. Paired browser checks showed Laravel's required, email-format, and uniqueness messages before confirmation and successful pending requests after valid input. Regression tests cover validation without side effects, authentication, protection against forged Precognition headers on other routes, and independent send budgets. Repeat these cases when editing `ConfirmedForm`.

Password confirmation now validates required/string input on the server and displays Laravel/Fortify's returned password error in the modal. Passkey names use the package's existing registration rules through Precognition before confirmation or authenticator registration. Name checks neither consume registration options nor authorize sensitive actions, and use a separate 30-per-minute validation budget. Chisel removes the password validation middleware when confirmation is omitted.

The password/passkey validation follow-up passed 97 source tests (999 assertions), frontend checks, TypeScript, PHPStan, Pint, and production builds. Four fresh Chisel installations passed all application and packaging checks: all features (96 passed, 996 assertions), confirmation omitted (88 passed, 4 skipped, 904 assertions), no optional features (65 passed, 12 skipped, 705 assertions), and confirmation only (72 passed, 9 skipped, 776 assertions). Browser checks verified inline required/maximum-length passkey name errors with confirmation selected and unselected, valid-name gating when enabled, Laravel's blank/incorrect-password errors, cancellation, and successful password confirmation followed by an email-change request. Signed WebAuthn integration tests continue to verify actual registration, confirmation, and deletion; native authenticator enrollment is not automated.

For future changes, repeat the paired all-features/all-except-password-confirmation browser checks in freshly trimmed applications, and run the minimal/mixed selections to catch references to removed routes, components, or model capabilities. Never run Chisel in this source checkout.

## Publishing

The Composer package name is `daleweaver777/custom-react-starter-kit`. To publish it, host the repository as `origin` and register the package on Packagist.

After your package and an installable release are available, users with the Laravel installer can create an app using:

```bash
laravel new my-app --using=daleweaver777/custom-react-starter-kit
```

Keep `type: "project"`, Composer hooks, and Laravel installer metadata intact. Verify a fresh installation from the published package before announcing a release.

`README.md` is included in release archives. `README-maintainer.md` and `AGENTS.md` are removed by Chisel from generated applications; retain them in the source repository. Keep the end-user guide self-contained, without links to those removed files. Review README commands and runtime requirements whenever package scripts or dependencies change.
