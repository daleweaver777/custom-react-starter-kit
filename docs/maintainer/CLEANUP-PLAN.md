# Starter kit cleanup progress

Updated September 17, 2026. Baseline: `cbae6ea` on `main`. Implementation was explicitly authorized after the initial audit and plan.

## Agreed contract

- Only registration and account email verification are installable options; both default on.
- 2FA, passkeys, password confirmation, and secure email-change verification always ship. Preserve their runtime configuration.
- Teams must not ship. Source, routes, schema, and dependency review found no teams implementation to remove.
- Installed applications receive a small test suite and basic README. Maintainer regressions, browser/installer tooling, CI configuration, and documentation stay in source and are removed during installation.
- Preserve appearance and functionality. Keep Base UI/Nova, Inter, focus geometry, notifications, loading behavior, and Laravel installer compatibility.
- Deployment target is Laravel Cloud **Business**. No staging URL is available. Additional account/action rate limits are **review-only**, not authorized for implementation.
- Preserve the pre-existing changes to `PRODUCTION-AUDIT-2026-09-14.md`.

## Progress

| Phase                             | Status           | Result                                                                                                                                                             |
| --------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Baseline and contract             | Complete         | Isolated original checkout, dependencies, tests/builds, screenshots, Doctor and profiler evidence captured                                                         |
| Maintainer tests and source CI    | Complete         | Intact source job uses deferred hooks; separate maintainer PHPUnit suite, generated-app CI fixture, four-case installer/browser jobs, manual dispatch              |
| Two-feature installer             | Verified locally | Exactly two choices; invalid/stale answers rejected before mutation; all four no-Node and archive installations pass                                               |
| Test simplification and packaging | Complete         | 34 application tests with both options; comprehensive security/installer tests retained privately; maintainer files removed from every variant                     |
| SSR                               | Verified locally | Production rendered HTML/hydration verified; nullable reset email and profile default fixed; durable dev SSR/CSR tests pass                                        |
| React and other cleanup           | Complete         | Doctor errors resolved; redundant commits reduced; follow-up 2FA request races fixed and verified with browser regressions in three engines                        |
| README, maintainer README, AGENTS | Complete         | Short installed README; focused maintainer guide; compact invariants; detailed focus rules kept in maintainer docs                                                 |
| Final artifact/E2E/visual review  | Verified locally | All four variants in three browser engines passed; fresh installation, no-dev boot, visual and independent code reviews passed; external release gates remain open |

## Implementation details

The source CI previously ran `composer setup`, which could trim the checkout before maintainer tests ran. It now installs with `LARAVEL_INSTALLER_DEFER_HOOKS=1`, asserts the source remains intact, and runs application plus maintainer checks separately. Generated applications receive their own simple workflow.

Chisel retains `chisel.php`, `chisel-paths.php`, the installation command, and Composer/Laravel hooks in source. It accepts only a unique list of supported `auth_features`, handles default/explicit answers, and validates before deletion. The 32-case feature matrix is now four cases. Tests examine clean output before restoring private security coverage; the no-Node path actively forbids Node during installation and does not repair formatting during validation.

Follow-up: manifest reads use Laravel's `Filesystem::json` with `JSON_THROW_ON_ERROR`, removing the `string|false` argument diagnostic. `phpstan.maintainer.neon` extends the application's PHPStan configuration at the same level and adds both Chisel files. Run `composer types:check:maintainer` directly; `composer test:maintainer` and source CI include it. Chisel removes the maintainer configuration and commands while preserving the application's PHPStan setup. PHPStan and Pint passed; all 21 installer tests passed with 904 assertions, and the integrated maintainer command passed 187 tests with 2,807 assertions.

Important regressions were moved into `tests/Maintainer`, not deleted with the simplified application examples. Coverage includes session revocation, password policy, signed software WebAuthn, TOTP, confirmation expiry, email ownership/races, reset privacy, query counts, hook deferral, invalid answers, and feature removal. Browser coverage includes real synthetic registration/verification/reset/deletion, settings, confirmations, 2FA/recovery, Chromium virtual passkeys, SSR/hydration, delayed loading, notifications, focus, responsive layout, and injected request failures.

The maintainer README now documents the complete source/installer/browser sequence, individual PHP and frontend checks, filtered runs, all four feature variants, development SSR/production CSR checks, CI dispatch, and evidence locations. Commands were checked against the current scripts and workflow; all shell examples passed Bash and Zsh syntax checks. This documentation-only follow-up did not rerun application tests.

The active cleanup tracker now lives in `docs/maintainer/CLEANUP-PLAN.md` alongside the other maintainer documents. Links and installer fixtures were updated; the existing directory-level Chisel deletion and archive exclusion keep it out of installed applications. All four feature-selection packaging checks passed (868 assertions), and the real Git archive check confirmed the tracker remains in source but is excluded from the release.

F11 reproduced before cleanup: array-valued login email and passkey credential IDs caused 500s before validation. Limiter key construction is now type-safe; the existing five/ten-request budgets are unchanged. Twelve focused regressions cover malformed types, controlled JSON/HTML validation, guest state, and continued enforcement of the original login limit. New abuse budgets remain in the [review list](security-review.md).

React changes remove effect-driven redundant state updates, use stable derived recovery visibility, and preserve ActionButton content while loading without relying on memoization for correctness. Confirmation captures its submitter before asynchronous validation so Cancel restores focus. SSR reset-email inputs now handle absent email values without React warnings. The profile name field preserves its mount default, removing a Base UI development warning after saves while retaining edits typed during a pending request. PHP suites explicitly disable SSR to avoid contacting an unrelated running browser-test renderer. Toast content now uses its natural height: `h-full` fed the animated root height back into Base UI’s ResizeObserver. The exact WebKit reproduction went from 10/10 warnings to 0/10; a separate native-observer run went from 5/5 to 0/5. Root dimensions, expanded/collapsed appearance, close behavior, animations, and countdowns remain intact. No error suppression was added.

## Verification record

Evidence root for this execution: `/private/tmp/starter-cleanup-tuLCfM/evidence`. Disposable applications and logs are outside source; this tracker retains the conclusions if temporary files are later removed. Results below are actual local runs, not claims that remote CI has run.

| Check                               | Result                                                                                                                                                                           |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Original baseline                   | 223 PHP tests, 10,304 assertions; formatting/static analysis, TypeScript, client/SSR builds passed                                                                               |
| Current source application suite    | 34 tests, 113 assertions; final integrated run passed                                                                                                                            |
| Current maintainer suite            | 187 tests, 2,807 assertions; latest source run, including maintainer PHPStan, passed without warnings                                                                            |
| Strict no-Node matrix               | All four passed with Node blocked during installation and no formatting fixes during checks                                                                                      |
| Archive Node matrix                 | All four passed; final reset/profile/test-isolation changes rechecked and rebuilt in every artifact                                                                              |
| Generated application tests         | Masks 0/1/2/3: 26/32/28/34, zero skips                                                                                                                                           |
| Generated private security checks   | Masks 0/1/2/3: 149/152/162/166, zero skips                                                                                                                                       |
| Matrix checks                       | Manifest/schema/routes/config caches, feature absence/presence, source-file cleanup, generated helpers, frontend checks/types, client and SSR builds, application/security tests |
| React Doctor 0.9.14                 | Latest scan: 119 files, 0 errors/0 warnings; temporary Form and welcome.tsx exclusions unchanged                                                                                 |
| Shadcn and forbidden APIs           | Base UI / base-nova / b37ZhrNTs verified; no Radix/asChild matches                                                                                                               |
| Browser engines                     | Final matrix: 100 passed across four variants and Chromium/Firefox/WebKit; eight explicit virtual-WebAuthn-only skips; no unexpected client/server/SSR/hydration errors          |
| Visual comparison                   | Baseline/final desktop light/dark and mobile inspected; unchanged layout/content/style. Final dark desktop image is byte-identical; timed toast/progress animation frames differ |
| Fresh install and no-dev production | Fresh Composer create-project with default hooks passed; app tests passed; optimized no-dev boot and cached routes/config passed                                                 |
| Development SSR and explicit CSR    | Both durable Chromium tests passed; mask 3 CI runs development SSR and production CSR explicitly                                                                                 |

The strict no-Node matrix is `/private/tmp/starter-cleanup-no-node-strict-20260917/summary.json`, source snapshot `e0581772c03c5cc287c572322ce8168bc048f01cf5d08fa320abf9d832938776`. The final archive run is `/private/tmp/starter-cleanup-final-archive-node-20260917/summary.json`. Final runtime/test-isolation deltas are recorded in `final-complete-artifact-refresh.json` in both roots, with file hashes and passing check/types/build/application tests for all eight artifacts. Fresh dependencies and optimized no-dev boot are recorded in `/private/tmp/starter-cleanup-fresh-lifecycle-20260917/summary.json`. The final source suite is in `source-release-{ci,build}.log` and `source-final-maintainer.log`; render-mode logs/evidence are `durable-development-ssr` and `durable-production-csr` under the evidence root. The final toast change was separately copied, checked, typechecked, and client/SSR rebuilt in all eight artifacts plus the fresh production app; `toast-artifact-refresh.json` in each evidence root records those results. The latest packaging-only archive is `/private/tmp/starter-cleanup-release-toast-final-20260917/summary.json`. The fresh-install test harness initially inherited `APP_ENV=local`, causing expected CSRF test failures; an isolated PHPUnit environment corrected that harness issue without an app change.

The subsequent maintainer PHPStan command passed in `phpstan-maintainer-command.log` under the evidence root. Its archive and Chisel packaging checks are recorded in `/private/tmp/starter-cleanup-maintainer-types-boundary-20260917/summary.json`; these structural checks stubbed external installation commands and verified that the application's PHPStan configuration remained byte-identical. This tooling-only follow-up did not repeat the runtime matrix.

Final browser evidence: `browser-release-summary.json` and `browser-release-{0,1,2,3}.log` under the evidence root. Each mask passed 25 checks with two explicit unsupported virtual-authenticator skips. Two additional durable Chromium checks passed for development SSR and production CSR. The final run includes the toast fix and waits for entrance animations before checking errors. Earlier diagnostic failures remain in the evidence directory; they are not counted as passing acceptance. The complete source/CI/mode/packaging changes received independent review.

### React findings and measurements

A focused React Profiler comparison used isolated Vite/Chromium with the project compiler, disabled HMR, and identical interactions. These are commit counts, not whole-app performance claims:

| Interaction                                      | Before | After |
| ------------------------------------------------ | -----: | ----: |
| ActionButton label changes over eight keystrokes |     16 |     8 |
| ActionButton pending completion                  |      2 |     1 |
| Show recovery codes                              |      5 |     3 |
| Hide recovery codes                              |      2 |     1 |
| Forced recovery-code expiry                      |      3 |     1 |

Nested effect commits disappeared in these cases. The spinner remained delayed, and expiry removed secrets. Both profiler runs had zero browser console/page errors. The isolated profiler did not include every compiled Tailwind utility, so its dimension comparison is not a production-layout measurement; the separate application browser suite checks actual button dimensions and final screenshots.

The password-confirmation component-size advisory was resolved by the provider/dialog split described below. The temporary upstream Form copy is excluded at the maintainer’s explicit request. An earlier scan with `resources/js/pages/welcome.tsx` excluded passed with zero errors and 10 warnings; evidence is `react-doctor-welcome-excluded.log` under the evidence root. The maintainer subsequently removed that exclusion intentionally. The maintainer has now requested excluding welcome again. The scan after restoring those exclusions reported zero errors and one warning across 118 files; evidence is `/private/tmp/starter-form-deps-20260917/doctor-welcome-ignored.log`. The dependency cleanup was evaluated as an upstream proposal and is not applied locally. The [latest Doctor review](react-doctor-review.md) assesses every warning and documents the fixed 2FA setup/recovery request races. The full-file exclusion replaces the three redundant compiler-rule exceptions. Remove its exact path from `doctor.config.json` → `ignore.files` when switching `Form`/`useFormContext` imports back to upstream and deleting the local file, after the installed release includes PR #3262 and regression checks pass. The maintainer README and file header carry this reminder. This changes only analysis scope and documentation; the Form implementation remains unchanged. A known upstream Inertia Vite sourcemap warning remains during builds.

The 2FA follow-up clears obsolete setup promises, protects newer requests from old finalizers, and ignores stale failures. The old implementation failed the new browser regressions; the fixed implementation passed all nine regression runs across three engines. The full production-SSR browser suite on a fresh both-features app passed 34 tests with two existing virtual-WebAuthn skips and no unexpected browser/server errors. Thirteen supplemental request-ordering checks passed, with five deliberate mutations detected. Source frontend/types/builds and PHP checks passed; maintainer tests now have 2,803 assertions after removing a stale fixture reference to the externally removed historical audit file. Evidence is `/private/tmp/starter-two-factor-fix-20260917/browser-summary.json` and the accompanying installer/source logs. Other installation variants were not repeated for this shared-hook-only fix.

The scoped password-confirmation cleanup consolidates processing resets in a promise finalizer guarded by the current request. The exact requested `npx react-doctor@latest --verbose` confirms `react-doctor/no-loading-flag-reset-outside-finally` is gone, with every other diagnostic unchanged and no new suppression. Thirty-nine before/after control-flow comparisons passed. Production-SSR application/security/loading browser checks passed 28 cases with two existing virtual-WebAuthn skips; the six focused regressions passed again across three engines. Frontend formatting/lint, types, client/SSR builds, fixture formatting, and browser/server error checks passed. Evidence is `/private/tmp/starter-loading-finally-20260917/doctor-comparison.json`, `control-flow-summary.json`, and `browser-summary.json`.

The scoped effect-state cleanup removes both `react-hooks-js/set-state-in-effect` findings without suppressions or new diagnostics. Server expiry changes and 2FA security resets reconcile state before children commit; timer callbacks retain wall-clock expiry behavior. The associated hook rejects obsolete request results and keeps request-ref invalidation separate from state clearing. Actual-source isolated React Profiler checks measured two commits becoming one for both affected paths, with no stale child commit. Twelve controlled hook-race checks passed, including a mutation proving the reset guard is necessary. Evidence is `/private/tmp/starter-effect-cleanup-20260917/doctor-comparison.json`, `provider-profiler-summary.json`, `manage-profiler-summary.json`, and `hook-race-summary.json`. The fresh both-features archive passed its installation checks; final source and generated-app formatting/lint/types/client+SSR builds passed. The full production-SSR browser suite passed 46 tests with two existing virtual-WebAuthn skips. After simplifying the new transition guard, the final affected suite passed 25 tests with two existing skips across three engines, and development SSR/production CSR passed one check each. No unexpected client/hydration/server errors were found in accepted runs; desktop light and dark mobile views were inspected. Final condensed tests ran each engine with fresh disposable fixture/cache state after an initial combined run reached the existing aggregate confirmation limit; the app limit was preserved. Test-only clock skew after fast-forwarding was corrected before reauthentication. Full details and final source hashes are in `browser-summary.json` under the same evidence root. Other feature combinations were not repeated for this shared frontend-only change.

The password-confirmation maintainability follow-up separates the controlled dialog view into `password-confirmation-dialog.tsx`. The provider retains state, expiry synchronization, request ownership, cancellation, and verification; all five main controller functions remain unchanged. The always-mounted dialog preserves close-animation completion, focus restoration, labels, styles, and busy dismissal behavior. The exact Doctor command now scans 119 files with **zero errors and zero warnings**, with existing exclusions unchanged. Independent review passed 39 submit/lifecycle and 21 passkey before/after comparisons, including stale callbacks after cancellation/replacement; a request-guard mutation still triggers 18 expected failures. Source formatting/lint, TypeScript, client/SSR builds, 34 application PHP tests, and 187 maintainer tests (2,807 assertions) pass. A fresh both-features archive installation passed packaging, cache/route, frontend, application, and private-security checks. The full production-SSR browser suite passed 46 tests with two existing virtual-WebAuthn skips across three engines; development SSR and production CSR each passed. Nine additional navigation/late-request/fatal-error/focus probes passed before and after extraction. No unexpected client, hydration, or server errors were found. Desktop light, mobile dark, and failure-notification screenshots were inspected; all nine baseline/final PNG pairs were pixel-identical after fixing pointer position. Evidence: `/private/tmp/starter-confirmation-refactor-20260917`, including `source-verification.json` and `browser-summary.json`. Other optional-feature combinations were not repeated for this shared frontend-only extraction.

The form dependency request was evaluation-only, to judge a possible upstream PR. Applying the candidate locally was an error; `inertia-form.ts` has been restored byte-for-byte from `/private/tmp/starter-form-deps-20260917/inertia-form.before.ts`, retaining the existing PR #3262 callback fix. Other authorized cleanup remains. The candidate is kept only as `inertia-form-proposal.patch` outside the repository. Review found no demonstrated stale-data or performance defect in installed Inertia 3.7.0, so the recommendation is to preserve the local copy and keep any optional dependency-maintenance PR separate from #3262. Both original and candidate passed 36 focused scenarios; candidate-only browser/build evidence remains available but is not evidence of a change still applied to source. See `restoration.json` and the [proposal evaluation](react-doctor-review.md).

The tracked source `composer.lock` was deliberately removed to restore the repository/upstream packaging policy. Its original content is preserved in the baseline copy; installed applications should keep their own resolved lockfiles. Local runtime: PHP 8.5.8 and Node 22.23.2.

### CI mail-link investigation (2026-09-17)

[Run 35265399522](https://github.com/daleweaver777/custom-react-starter-kit/actions/runs/35265399522) failed Chromium password recovery in installer masks 0, 1, and 3; the selected reset URL was corrupted before navigation. [Diagnostic run 35283416178](https://github.com/daleweaver777/custom-react-starter-kit/actions/runs/35283416178) retained raw mail showing that the HTML fallback href was malformed while the primary button, fallback label, and plain-text URLs were correct.

A standalone CommonMark probe reproduced the corruption on official PHP 8.3.33 with setup-php's `opcache.jit=1235` and 256 MB JIT buffer. Fixed-token, random-token, and full Markdown probes each ran 1,000 iterations; their first URL was corrupted with that JIT mode and all passed with JIT off while OPcache stayed enabled. PHP 8.5.10 also passed the rendering probes with JIT enabled. CI now explicitly disables JIT, and the browser helper retains mail evidence even if URL parsing throws.

The app now requires PHP `^8.5` and Node `^24.21.0` (the current Node 24 LTS release). Source CI and the installed application workflow both read `.php-version` and `.nvmrc`; PHP setup updates to the latest 8.5 patch. Packaging checks require both manifests to survive archives and every Chisel selection. Node types match the Node 24 series. These repository settings do not configure Herd or deployment runtimes.

Evidence is in `/private/tmp/starter-ci-35265399522`: original failure artifacts under `ci-{0,1,3}`, diagnostic raw mail under `run26-3`, and `php83-jit-comparison.json` / `php8510-jit-comparison.json`. Earlier source checks passed (34 application tests and 187 maintainer tests), as did Base UI/base-nova/b37ZhrNTs verification, four fresh Node archive installations, and all 12 account-lifecycle cases on those installations. Initial local TypeScript errors were missing generated Wayfinder imports; generation restored a passing check. Final local source checks pass on Herd PHP 8.5.8 and Node 24.21.0: 34 application tests / 113 assertions, 187 maintainer tests / 2,815 assertions, formatting, lint, PHPStan, TypeScript, client/SSR builds, and React Doctor. The focused packaging test also passes all four selections (876 assertions). The complete remote installer/browser matrix remains the final acceptance gate.

## Completed local acceptance

- [x] Final source format/lint/types/Pint/PHPStan/application/maintainer/Doctor/build checks.
- [x] Verify final reset-input fix in every artifact, including missing-email SSR regression.
- [x] All four generated variants in Chromium, Firefox, and WebKit; no unexpected browser/server/SSR errors in the final run.
- [x] Inspect final screenshots against baseline and final code/artifact changes independently.
- [x] Fresh release archive installation with no reused vendor/node_modules, followed by optimized no-dev boot/cache checks.
- [x] Runtime development SSR and explicit CSR checks.
- [x] Remove generated source lockfiles and Wayfinder output according to packaging policy; original audit edits verified byte-for-byte against baseline.

## Release gates outside local cleanup

- [ ] Review and decide the additional per-account/action limits in [security-review.md](security-review.md); none added during cleanup.
- [ ] Verify enabled Laravel Cloud Business WAF/rate limits, forwarding/Host behavior, HTTPS mail URLs and blocked/challenged request UX on the final domain. No staging URL exists yet.
- [ ] Confirm actual mail delivery, HTTPS platform/security-key passkeys, screen-reader use, and touch-device behavior. Software authenticators and desktop emulation do not establish these results.
- [ ] Run the configured remote CI, including PHP 8.3/Node 22. Local PHP 8.5 is available; PHP 8.3 is not installed on this machine.
- [ ] Move from `laravel/framework: 13.x-dev` to a stable release containing the login-time session fingerprint fix. September 17 check: latest stable v13.32.0 predates fix `f50c3ce4e04cf9c321a196ee3eac7effff3c8f50` by three commits. Preserve session-revocation tests and the current constraint until a qualifying stable release exists.

These gates prevent an unconditional production-ready claim. See the [security review](security-review.md) for current official sources and the [historical audit](../../PRODUCTION-AUDIT-2026-09-14.md) for earlier findings and decisions.

## Repeatable commands

Safe source setup and full commands are in [README-maintainer.md](../../README-maintainer.md). Never run Chisel or `composer setup` in the maintained checkout.

```bash
LARAVEL_INSTALLER_DEFER_HOOKS=1 composer install
npm install --no-package-lock
php artisan wayfinder:generate --with-form --no-interaction
npm run build:ssr
composer run ci:check
composer run test:maintainer
npm run doctor
python3 scripts/test-chisel.py
python3 scripts/test-chisel.py --node-installer --archive
```

Browser checks require a disposable generated application via `STARTER_TEST_APP`; the harness refuses the maintained checkout. It prepares only synthetic users/log mail and its own SQLite database. Evidence includes screenshots and failure traces. Chromium virtual WebAuthn checks explicitly skip Firefox/WebKit, where equivalent authenticator automation is unavailable; other tests run in all three engines.
