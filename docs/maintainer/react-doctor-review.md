# React Doctor review

September 17, 2026. The latest `npx react-doctor@latest --verbose` reports **119 files scanned, zero errors, zero warnings** with React Doctor 0.9.14. The maintainer explicitly requested excluding the temporary upstream `resources/js/components/inertia-form.ts` copy. Its former three per-rule exceptions were replaced with one exact file exclusion; its implementation is unchanged.

Remove `resources/js/components/inertia-form.ts` from `doctor.config.json` → `ignore.files` in the same change that restores `Form`/`useFormContext` imports to `@inertiajs/react` and deletes the local copy, after the installed Inertia release includes PR #3262 and the documented regression checks pass. The reminder is also in the file header and maintainer README. This is a temporary, maintainer-authorized exclusion; the earlier dependency proposal remains unapplied.

The maintainer also requested excluding `resources/js/pages/welcome.tsx`. Both existing exclusions remain unchanged. The password-confirmation size warning is now resolved by extracting a controlled dialog view; no suppression was added. Verification is saved in `/private/tmp/starter-confirmation-refactor-20260917/doctor-after.log`.

## Password-confirmation maintainability

`PasswordConfirmationProvider` retains confirmation state, server expiry synchronization, pending-request ownership, navigation cancellation, password/passkey verification, and deferred failure reporting. `PasswordConfirmationDialog` owns the existing dialog/form markup, input ID, and UI event adaptation. This keeps request handling separate from presentation without introducing another stateful hook or changing the context API.

The dialog stays mounted through closing so failure notifications still appear after its exit animation. The provider retains stable input/focus refs and captures the request associated with a passkey callback, preventing a late result from completing a newer request. The five main controller functions are unchanged. This is a maintainability improvement, not a demonstrated rendering-performance fix.

Independent review passed, including 39 before/after submit/lifecycle comparisons and 21 passkey comparisons. Removing the finalizer's request-identity guard still causes 18 expected failures, showing the checks exercise that protection. Formatting/lint, TypeScript, client/SSR builds, 34 application PHP tests, and 187 maintainer tests pass. A fresh both-features archive installation passed its packaging, route/cache, frontend, application, and private-security checks. The full production-SSR browser suite passed 46 tests across Chromium, Firefox, and WebKit, with two existing virtual-WebAuthn skips. Development SSR and production CSR passed one check each. Nine supplemental browser probes passed against both original and extracted implementations, covering navigation during pending requests, busy dismissal, late results, fatal-notification timing, focus restoration, and reopening. No unexpected client, hydration, or server errors were found. Desktop light, mobile dark, and failure-notification screenshots were inspected; all nine baseline/final PNG pairs were pixel-identical after fixing pointer position. Evidence is in `/private/tmp/starter-confirmation-refactor-20260917`, including `independent-review-summary.json`, `control-flow-summary.json`, and `passkey-review-summary.json`.

The clean Doctor scan is a static-analysis result, not proof that every runtime interaction is defect-free.

## Form dependency evaluation — proposal only

The maintainer requested a suggestion to assess whether `react-doctor/exhaustive-deps` cleanup merits an upstream PR. Applying it locally was an error. `inertia-form.ts` has been restored byte-for-byte from the pre-evaluation snapshot, preserving the existing callback-forwarding compatibility fix for [Inertia PR #3262](https://github.com/inertiajs/inertia/pull/3262). The candidate is retained outside the repository as `/private/tmp/starter-form-deps-20260917/inertia-form-proposal.patch`; it is not part of the starter kit. Do not apply additional Form changes locally without explicit authorization.

The canonical recipe was fetched with cache bypass headers before evaluation. Assessment: **Observation**. No stale-data bug was established in installed Inertia 3.7.0. Mount-time `setDefaults` and `cancel` are stable callbacks; recreated validation wrappers access the same persistent validator; the original imperative handle already refreshes every render.

The evaluated proposal stabilizes DOM readers, moves the dirty-state handler inside its effect, declares the stable mount dependencies, depends directly on the persistent validator, and makes the imperative handle's existing per-render refresh explicit. It removes the five warnings without introducing another diagnostic, but demonstrates no runtime or performance improvement. Blindly depending on the whole changing `form` object could instead recapture defaults and cancel active requests during rerenders.

**Recommendation:** keep this out of PR #3262 and preserve the local compatibility copy. A separate upstream maintenance PR is reasonable only if maintainers want stricter dependency declarations; it should not be presented as a demonstrated bug fix. The existing render-time validation-timeout configuration remains unchanged by the proposal, so it does not establish improved debounce behavior either.

Evaluation evidence (the candidate is now reverted):

- Both the original and proposed versions passed 36 focused actual Form/React/Inertia/Precognition scenarios across three browsers and production/development builds. Transport boundaries were simulated. Coverage included dirty/default/reset behavior, listener cleanup and StrictMode replay, current ref methods/options, validation configuration, and cancellation on unmount. A deliberately frozen ref failed the stale-action check.
- The candidate passed source checks/builds, a fresh both-features archive installation, 46 production-SSR browser tests with two existing WebAuthn skips, and one check each for development SSR and production CSR. Those results support the proposal's tested compatibility; they do not mean it remains installed in source.
- Restoration is recorded in `restoration.json`; the maintained Form matches `inertia-form.before.ts` exactly. Prior authorized fixes in other files were not reverted. The restored source passed client/SSR builds, and a fresh exact Doctor scan matches all eight original diagnostics.

Evidence root: `/private/tmp/starter-form-deps-20260917`, including the proposal patch, `dependency-independent-review.md`, `harness-summary.json`, `browser-summary.json`, and the original/candidate Doctor scans.

## Scoped effect-state cleanup

The maintainer requested only `react-hooks-js/set-state-in-effect`. Both flagged paths now reconcile changed React inputs during a guarded render, following React's [state adjustment guidance](https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes), before children commit stale values.

The confirmation provider tracks the last server deadline separately from local status-request updates. A changed server deadline replaces the local expiry; an unchanged deadline preserves it, including server values that later return to an earlier value. Confirmation revocation closes 2FA setup and clears its sensitive data; disabling 2FA also clears the data. Its wall-clock expiry timer still clears data from its callback. The associated hook groups the data for an atomic reset and rejects old request results using reset/request identities. A layout effect only invalidates external request refs and the cached promise; it performs no state updates. This preserves setup retries and recovery requests that await fresh password confirmation without moving state setters into another effect or adding a suppression.

Verification:

- The exact requested Doctor command reports both findings absent, zero errors, and eight existing warnings. No new rule warning, ignore entry, or compiler opt-out was added.
- Actual-source React Profiler fixtures measured **two commits before versus one after** for server expiry updates and confirmation revocation with recovery codes visible. The final child commit contains the new expiry or cleared codes. These fixtures stub transport/UI and measure commits, not whole-app performance.
- Twelve controlled actual-hook checks passed, including stale success/failure responses before request invalidation commits, retry/cache ownership, and recovery awaiting reauthentication across a reset. Removing the response reset guard caused the expected stale-secret failure.
- Browser coverage includes setup secret clearing/reopening, recovery expiry, unchanged versus changed server deadlines, and a server deadline returning to its earlier value after a local refresh. The full production-SSR suite passed **46 tests with two existing virtual-WebAuthn skips**. After simplifying the new transition guard, all affected checks passed again against the final source: **25 passed, two existing skips**, across three engines. Development SSR and production CSR also passed. Accepted runs had no unexpected client, hydration, or server errors. Frontend formatting/lint, TypeScript, client/SSR builds, and fixture formatting passed.

Evidence: `/private/tmp/starter-effect-cleanup-20260917/doctor-comparison.json`, `provider-profiler-summary.json`, `manage-profiler-summary.json`, `hook-race-summary.json`, `browser-summary.json`, and `source-final.log`.

## Scoped loading-reset cleanup

The maintainer requested only `react-doctor/no-loading-flag-reset-outside-finally`. Its [canonical fix and false-positive recipe](https://react.doctor/docs/rules/react-doctor/no-loading-flag-reset-outside-finally) was fetched with `curl --location` and both `Cache-Control: no-cache` and `Pragma: no-cache` headers before editing.

The reported statement was already inside a catch that reset processing, so the alleged stuck-spinner defect was not reproduced. The requested structural fix consolidates four duplicated resets across the two submit paths into one promise `.finally()` callback. It clears processing only when the same confirmation request is still active, preserving protection against an obsolete request clearing a newer request's busy state. Success, validation errors, fatal errors, cancellation, and focus behavior are preserved. The promise callback also avoids the installed React Compiler's unsupported `try/finally` syntax. No rule suppression or compiler opt-out was added.

Verification:

- The exact requested Doctor command reports the target rule absent, zero errors, and the other ten diagnostics unchanged.
- Frontend formatting/lint, TypeScript, client/SSR builds, and the changed PHP fixture's formatting passed.
- **39 before/after control-flow comparisons** passed, including success, rejection, synchronous throws, cancellation, and overlapping requests. Removing only the finalizer's request guard caused 18 expected failures. These controlled stubs supplement the browser checks.
- Production-SSR application/security/loading browser checks passed across Chromium, Firefox, and WebKit: **28 passed, two existing virtual-WebAuthn skips**. Both new cases verify that controls recover after expired or rejected confirmation checks and that real password confirmation completes the action. The six focused regression runs passed again after tightening their expected-error filter. No unexpected browser, hydration, or server errors were found.

Evidence: `/private/tmp/starter-loading-finally-20260917/doctor-comparison.json`, `control-flow-summary.json`, `browser-summary.json`, and `source-final.log`.

## Fixed 2FA request lifecycle issue

Reviewing the 2FA effects found a request lifecycle bug in `resources/js/hooks/use-two-factor-auth.ts`. Before the fix:

1. Start fetching the QR code and setup key.
2. Close setup before the requests settle; `clearSetupData` invalidates their generation.
3. Reopen setup before those requests finish. `fetchSetupData` reuses the obsolete `setupRequest` instead of starting fresh requests.
4. The old successful responses are discarded, leaving both values null. The reopened dialog has no automatic replacement fetch.

The initial hook-level reproduction was subsequently confirmed in a real browser: the old hook issued only two setup requests instead of a fresh pair after reopening. A separate browser case confirmed that a failed recovery request could restore an obsolete error after confirmation expired.

Clearing setup now invalidates the cached promise as well as its response generation. An old request's finalizer may only clear its own cache entry. QR-code, setup-key, and recovery-code failure handlers now discard stale results just like their success handlers. Recovery requests capture their generation after successful password confirmation, preserving legitimate reauthentication after expiry. This fixes a usability/async cleanup issue; no authentication bypass was demonstrated.

- [x] Invalidate the cached setup promise when clearing; ensure an old promise cannot clear a newer request's cache.
- [x] Apply generation checks to stale failure handlers as well as success handlers.
- [x] Add delayed-response browser regressions for closing/reopening setup, stale successes/failures, recovery expiry, and successful reauthentication.

Verification:

- The old hook failed the new browser regressions; the fixed hook passed all nine regression runs across Chromium, Firefox, and WebKit.
- The complete maintained production-SSR browser suite passed against a fresh generated app with both optional features: **34 passed, two existing Firefox/WebKit virtual-WebAuthn skips**, no unexpected browser/server errors.
- **13 deterministic request-ordering checks** passed, including old-finalizer ownership, deduplication, retries, stale failures, and renewed confirmation. Five deliberate code mutations were detected. This supplemental harness uses controlled hook/request stubs; the browser suite establishes actual rendering/transport behavior.
- Frontend formatting/lint, TypeScript, client/SSR builds, PHP formatting, PHPStan, **34 application tests**, and **187 maintainer tests / 2,803 assertions** passed. A stale installer-test reference to the removed historical audit file was removed; the file was not restored.
- The fresh archive installer check passed with both features retained. Other feature combinations were not repeated for this shared-hook-only change.

The 2FA fix itself left the 11 reviewed Doctor advisories unchanged. The subsequent scoped loading-reset cleanup reduced that count to ten; the effect-state cleanup reduced it to eight. The dependency proposal is not applied locally. The maintainer subsequently authorized excluding the temporary upstream copy, leaving two visible component-size advisories.

Evidence: `/private/tmp/starter-two-factor-fix-20260917/browser-summary.json`, `browser-after.log`, `source-final.log`, and `installer/summary.json`; supplemental request-ordering evidence is `/private/tmp/starter-react-doctor-review-20260917/two-factor-request-lifecycle-review.md`. Final raw Doctor diagnostics are `/var/folders/ng/s5m6bsyj1szf697l67vqqtq00000gn/T/react-doctor-e0f40d9b-42c0-4e43-b006-d0699fbd9fed/diagnostics.json`.
