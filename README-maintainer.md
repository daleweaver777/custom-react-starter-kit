# Starter Kit Maintenance

This guide is for the source repository. [README.md](README.md) ships with installed applications. [AGENTS.md](AGENTS.md) defines coding invariants; [CLEANUP-PLAN.md](docs/maintainer/CLEANUP-PLAN.md) tracks current work and evidence. The [production audit](PRODUCTION-AUDIT-2026-09-14.md) preserves earlier findings and decisions.

## Source setup

Keep completed work on `main`, your hosted repository as `origin`, and `https://github.com/laravel/react-starter-kit.git` as `upstream`. Check existing remotes before changing them.

Never run `composer setup` or `install:features` in this checkout: Chisel deletes source-only files. Explicit `--answers` bypasses hook deferral. Install dependencies with:

```bash
[ -f .env ] || cp .env.example .env
LARAVEL_INSTALLER_DEFER_HOOKS=1 composer install
npm install --no-package-lock
php artisan wayfinder:generate --with-form --no-interaction
```

Set the deferral variable in the Composer process environment on non-POSIX shells too. If `APP_KEY` in `.env` is empty, run `php artisan key:generate` before running tests or development; preserve an existing key. For development, configure the database, create the SQLite file if needed, and run migrations before `composer run dev`.

Do not commit source dependency lockfiles, `vendor`, `node_modules`, or generated Wayfinder helpers. Preserve pre-existing work; remove only artifacts you created during verification. Installed applications should commit their resolved lockfiles.

## Running all tests

Run commands from the source repository root after the setup above. Use PHP with SQLite support and the extensions required by Composer, Node 22.18 or later in the 22.x series, Python 3, and Git. The shell examples use Bash or Zsh. Both installer paths require installed source `vendor` and `node_modules`; the no-Node path blocks Node during installation, then uses it for frontend validation.

### Source checks

Run this block first, then the installer/browser block below to cover the complete automated suite:

```bash
npx shadcn@latest info --json
npm run build:ssr
composer run ci:check
composer run test:maintainer
npm run doctor
```

The preset must remain Base UI / `base-nova` / `b37ZhrNTs`. `composer ci:check` runs frontend formatting/lint, TypeScript, PHP formatting, application PHPStan, and application PHP tests. `composer test:maintainer` adds maintainer PHPStan and the Security/Installer PHPUnit suites; it does not run the full installation matrix or browser tests. Review React Doctor diagnostics and measure performance before changing render behavior; `npm run doctor` uses the version specified in `package.json`.

### Individual checks and focused PHP tests

| Check                                                          | Command                                                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Application PHP tests, PHP formatting, and application PHPStan | `composer test`                                                                                   |
| Application PHP tests only                                     | `php artisan test`                                                                                |
| All maintainer PHP tests and maintainer PHPStan                | `composer test:maintainer`                                                                        |
| Maintainer security regressions only                           | `php vendor/bin/phpunit --configuration=phpunit.maintainer.xml --testsuite=Security`              |
| Maintainer installer regressions only                          | `php vendor/bin/phpunit --configuration=phpunit.maintainer.xml --testsuite=Installer`             |
| One maintainer test class or method                            | `php vendor/bin/phpunit --configuration=phpunit.maintainer.xml --filter=ChiselFeatureCleanupTest` |
| Application PHPStan only                                       | `composer types:check`                                                                            |
| Application and installer PHPStan                              | `composer types:check:maintainer`                                                                 |
| PHP formatting without changing files                          | `composer lint:check`                                                                             |
| Frontend formatting/lint without changing files                | `npm run check`                                                                                   |
| TypeScript                                                     | `npm run types:check`                                                                             |
| React Doctor                                                   | `npm run doctor`                                                                                  |
| Client production build                                        | `npm run build`                                                                                   |
| Client and SSR production builds                               | `npm run build:ssr`                                                                               |

Application tests live in `tests/Feature` and use `phpunit.xml`. Security regressions, installer tests, helpers, and browser tests live in `tests/Maintainer` and are removed from installed apps. Run `php artisan config:clear` before direct PHP test commands if configuration has been cached; the Composer test commands already do this. PHPUnit uses an in-memory SQLite database. To filter an application test, use `php artisan test --filter=AuthenticationTest`. For maintainer tests, pass `phpunit.maintainer.xml` directly to PHPUnit as shown above; do not pass a second configuration through `artisan test`.

`composer types:check:maintainer` runs static analysis alone. Its `phpstan.maintainer.neon` extends the application configuration with `chisel.php` and `chisel-paths.php`; it uses the same rules and level. Use this configuration in your editor when maintaining the starter kit. Chisel removes it and both maintainer Composer commands from installed applications, which keep `phpstan.neon` and `composer types:check`.

### Installer and browser matrix

Only `email-verification` and `registration` are optional; both are selected by default. The `auth_features` answer must be a list of unique supported names. Unknown questions, stale options, and malformed answers fail before trimming. Passkeys, 2FA, password confirmation, pending-email verification, and shared account/security UI remain in all four cases.

| Mask | Retained optional features |
| ---: | -------------------------- |
|    0 | Neither                    |
|    1 | Account email verification |
|    2 | Registration               |
|    3 | Both                       |

The following block runs both installation paths for all four selections, production SSR browser tests in Chromium/Firefox/WebKit for each selection, and the separate development SSR/client-rendering checks. It creates disposable apps outside the source checkout and stops on the first failed command:

```bash
starter_test_run="$(mktemp -d "${TMPDIR:-/tmp}/starter-tests.XXXXXX")"
printf 'Test output: %s\n' "$starter_test_run"
(
    set -e
    python3 scripts/test-chisel.py --output "$starter_test_run/no-node"
    python3 scripts/test-chisel.py --node-installer --archive --keep-success --output "$starter_test_run/node"
    npx playwright install chromium firefox webkit

    for starter_case in 00 01 02 03; do
        STARTER_TEST_APP="$starter_test_run/node/${starter_case}-node/app" \
        STARTER_BROWSER_OUTPUT="$starter_test_run/browser/$starter_case/production-ssr" \
        STARTER_TEST_RENDER_MODE=production-ssr npm run test:browser
    done

    for starter_mode in development-ssr production-csr; do
        STARTER_TEST_APP="$starter_test_run/node/03-node/app" \
        STARTER_BROWSER_OUTPUT="$starter_test_run/browser/03/$starter_mode" \
        STARTER_TEST_RENDER_MODE="$starter_mode" npm run test:browser
    done
)
```

On Linux, use `npx playwright install --with-deps chromium firefox webkit` for browser system dependencies. No manual PHP, SSR, or Vite server startup is needed. Run browser cases sequentially: they share PHP port 8125 and SSR port 13714; development mode also uses Vite port 5179. `STARTER_TEST_PORT` and `STARTER_TEST_VITE_PORT` override the PHP/Vite ports. Stop conflicting local servers before running.

Both installer paths check application output, schema, cached routes/configuration, frontend checks/builds, application tests, and maintainer security regressions. The archive path also checks release export rules. The runner snapshots current source changes and isolates dependencies, environment, and SQLite. Normal Node installation uses the populated npm cache offline; run source `npm install --no-package-lock` first, or use `--npm-cache /path/to/cache` to select another populated cache. A missing cached package fails the run rather than downloading it.

Each `--output` must be new or empty. `--keep-success` retains generated apps for browser testing; otherwise successful apps are removed. Failed copies, per-case logs, `result.json`, PHPUnit XML reports, and the matrix `summary.json` remain in the output directory. The block assigns each browser run a distinct output directory so later runs preserve earlier failure screenshots and traces. Browser progress appears in the terminal. Inspect a retained trace with `npx playwright show-trace /path/to/trace.zip`.

Production SSR browser tests cover the application flows in all three engines. Virtual WebAuthn tests explicitly skip Firefox/WebKit because those engines lack the equivalent authenticator automation used here. The separate development SSR and production CSR modes run focused Chromium checks of raw guest/authenticated HTML, hydration or client rendering, profile saves, native reset, and edits typed while a save is pending. Development mode starts Vite; production CSR disables SSR and starts no SSR worker.

### Focused installer and browser runs

For a quicker installer run, select one mask; for example, both optional features:

```bash
python3 scripts/test-chisel.py --masks 3
python3 scripts/test-chisel.py --masks 3 --node-installer --archive --keep-success
```

Without `--output`, the runner prints its temporary output directory. Multiple selections use `--masks 0,3`; `python3 scripts/test-chisel.py --help` lists all options. Repeat all four masks when changing optional features or packaging.

To rerun browser checks against the retained mask-3 app from the full run above, choose one command:

```bash
STARTER_TEST_APP="$starter_test_run/node/03-node/app" npm run test:browser
STARTER_TEST_APP="$starter_test_run/node/03-node/app" npm run test:browser -- --project=chromium
STARTER_TEST_APP="$starter_test_run/node/03-node/app" STARTER_TEST_RENDER_MODE=development-ssr npm run test:browser
STARTER_TEST_APP="$starter_test_run/node/03-node/app" STARTER_TEST_RENDER_MODE=production-csr npm run test:browser
```

If using a focused installation instead, replace `STARTER_TEST_APP` with its printed `03-node/app` path. Without `STARTER_BROWSER_OUTPUT`, browser artifacts go to the disposable app's `storage/framework/testing/browser-results` and are replaced on the next run; set a fresh output path when retaining evidence.

The harness prepares synthetic accounts, log mail, and its own `database/browser.sqlite`. Never point it at a real application; it refuses the maintained checkout. Browser automation does not certify real hardware passkeys, screen readers, mail delivery, or a Cloud deployment; record those checks separately.

Composer/Laravel installer hooks, no-Node support, and migration ordering are part of the contract. Chisel removes maintainer tests/config/scripts/docs and replaces source CI with the application workflow fixture. `README.md` remains. Check a clean artifact **before** restoring the private security-test harness, so source files cannot hide missing dependencies.

### Running in CI

The [tests workflow](.github/workflows/tests.yml) runs on pull requests and pushes to `main`. To run it on demand, open the repository's **Actions → tests → Run workflow**, select the branch, and run it. The branch must contain the changes you want to test.

The source job runs source checks, application tests, React Doctor, and maintainer analysis/tests. Four installer jobs each check one selection with and without Node and exercise the archive installation in all three browsers. Mask 3 also runs development SSR and production CSR checks. CI uses PHP 8.3 and Node 22.

Download `source-tests` and `installer-0` through `installer-3` artifacts from the workflow run for available JUnit reports, installer logs/summaries, and browser evidence; artifacts are retained for seven days. CI configuration describes intended coverage; only a completed run establishes a pass.

## UI and active compatibility notes

Follow the exact [focus and theme rules](docs/maintainer/focus-styles.md) for UI changes. Preserve Base UI/Nova, bundled Inter, notification animations/countdowns, reduced motion, dialog cancellation, and delayed loading feedback. Keep explicit outside-click dismissal behavior on shared dialogs.

Forms currently import `Form` and `useFormContext` from `@/components/inertia-form`. The local MIT-licensed copy forwards callbacks missing from the installed Inertia release. Replace it only after the installed release includes [Inertia PR #3262](https://github.com/inertiajs/inertia/pull/3262) and submission/reset/ref/Precognition/modal-error regressions pass. Then remove unused direct dependencies; retain `laravel-precognition` while application validation uses it. Keep this compatibility copy close to upstream. Evaluate additional behavior or dependency changes as upstream proposals unless the maintainer explicitly requests local changes.

React Doctor ignores `resources/js/components/inertia-form.ts` while this temporary upstream copy is needed. In the same change that switches `Form`/`useFormContext` imports back to `@inertiajs/react` and deletes the local copy, remove that path from `doctor.config.json` → `ignore.files`, then rerun `npm run doctor`.

Session revocation depends on Laravel's login-time fingerprint fix from laravel/framework#61594. The current development-branch constraint must not be replaced with a stable minimum that predates that fix; track stable-release verification in the production audit.

Laravel Cloud Business is the target. Preserve existing application limits and rely on verified Cloud controls for aggregate IP protection. Extra account/action budgets remain in the [security review](docs/maintainer/security-review.md); do not silently add them as cleanup. The Cloud plan alone does not establish enabled settings or successful deployed verification.

## Upstream synchronization

1. Start with a clean working tree on `main`; verify both remotes.
2. Enable `git config rerere.enabled true` and `git config rerere.autoupdate true`, then fetch `upstream`.
3. Create a unique dated backup branch and merge `upstream/main` with `--no-ff`. Do not rebase published history.
4. Prefer upstream for non-UI conflicts unless they overlap a local customization. Resolve UI conflicts individually, combining upstream behavior with Base UI/Nova and the two-feature installer contract. Never use a bulk overwrite, directory-wide `--ours`, or an `ours` merge driver.
5. For material wrapper changes, use the shadcn and migration skills. Run `shadcn info` first; inspect component-level `--dry-run` and `--diff` output. Maintain `.migration/<component>.md` and `.migration/project.md` reports.
6. Check that the merge has not reintroduced Radix imports or `asChild` patterns with the scan below. It must return no matches (exit status 1).
7. Review `git diff upstream/main -- chisel.php chisel-paths.php` and marker changes deliberately; upstream's feature choices differ from this kit. Run verification, installer/browser checks appropriate to the changes, and inspect the final diff before finishing the merge.

```bash
rg -n 'radix-ui|@radix-ui|\basChild\b' resources/js package.json
```

## Publishing

Publish `daleweaver777/custom-react-starter-kit` through your hosted `origin` and Packagist. Keep Composer's project type and installer hooks intact. Verify the actual release archive and a fresh Laravel-installer installation before announcing a release; copied development dependencies alone do not prove clean dependency resolution.

Release only with current evidence for source checks, all four generated variants, production SSR/hydration, and essential browser flows. Review pending audit/Cloud/device checks and record any limitation explicitly. Keep maintainer files in source, omit them from installed applications, and ensure the shipped README has no links to removed files.
