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

## Installer Behavior and Testing

The Laravel installer uses `extra.laravel.installer.post-create-project` in `composer.json` to run `install:features`. The same command also appears in Composer's `post-update-cmd` for non-deferred dependency setup. These are distinct from Composer's own `post-create-project-cmd`, which generates the application key and creates the SQLite file if absent. Its migration step waits while `chisel.php` is present: Chisel runs initial migrations only after removing unselected feature migrations, so the generated database matches the selected features. After trimming, ordinary Composer project creation can safely run its migration step again.

Feature selection can retain email verification, registration, two-factor authentication, passkeys, and password confirmation. The installer trims unselected features, removes retained-feature markers, formats PHP, and regenerates Wayfinder helpers. Unless `LARAVEL_INSTALLER_NO_NODE=1`, it also installs JavaScript dependencies, removes unused feature packages, runs the frontend fixer, and builds assets.

After Chisel's transformations, formatting, and initial migrations succeed, cleanup removes `AGENTS.md`, `README-maintainer.md`, the maintainer-only `InstallerMigrationHookTest`, the feature-install command, and both Chisel scripts. `README.md` remains. The frontend build follows this cleanup when Node steps are enabled.

In separate disposable copies with dependencies available, test these selections:

```bash
php artisan install:features --no-interaction --answers='{"auth_features":["email-verification","registration","2fa","passkeys","password-confirmation"]}'
php artisan install:features --no-interaction --answers='{"auth_features":[]}'
php artisan install:features --no-interaction --answers='{"auth_features":["registration","passkeys"]}'
```

Run one command per copy; successful trimming deletes the installer itself. Verify feature files and markers, confirm `README.md` survives and both maintainer documents are removed, and run the relevant application checks. Also test the no-Node path when changing installation behavior. Passing explicit `--answers` intentionally bypasses the deferral flag, so it must only be used in the disposable installation.

## Publishing

The Composer package name is `daleweaver777/custom-react-starter-kit`. To publish it, host the repository as `origin` and register the package on Packagist.

After your package and an installable release are available, users with the Laravel installer can create an app using:

```bash
laravel new my-app --using=daleweaver777/custom-react-starter-kit
```

Keep `type: "project"`, Composer hooks, and Laravel installer metadata intact. Verify a fresh installation from the published package before announcing a release.

`README.md` is included in release archives. `README-maintainer.md` and `AGENTS.md` are removed by Chisel from generated applications; retain them in the source repository. Keep the end-user guide self-contained, without links to those removed files. Review README commands and runtime requirements whenever package scripts or dependencies change.
