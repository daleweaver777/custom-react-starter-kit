# Frontend quality review — 2026-09-09

The source audit and browser regression pass found and fixed functional, accessibility, responsive-layout, and installer defects. No blocking issue remained in the exercised flows. Changes are uncommitted on the existing `main` checkout.

## Fixes

- Moved the login error-focus import outside the registration Chisel region. Disabling registration now preserves login compilation and error focus.
- Close mobile sidebar/header menus after Inertia navigation, with subscription cleanup. Removed the obsolete pointer-events cleanup hook and the inactive Search button in the alternate header.
- Restore focus to Add passkey on Cancel/success; disable edits while registration is pending; guard browser globals for SSR. Long passkey names wrap, and removal buttons identify their passkey.
- Synchronize system and cross-tab appearance changes; validate stored preferences; tolerate unavailable storage; avoid duplicate system listeners and rerenders when the resolved theme has not changed.
- Deduplicate concurrent two-factor setup requests; prevent continuation before setup is available; offer retry after setup errors. Recovery-code loading displays immediately and prevents repeated clicks. Removed redundant manual memoization and kept the handler compatible with React Compiler.
- Control setup OTP state so invalid submissions clear the displayed digits, restore focus, and disable Confirm. Editing password confirmation clears the corresponding server password-mismatch error.
- Bound dialogs to the dynamic viewport with internal scrolling and narrow-screen margins. Scale the QR panel to 320px, and render SVG as an image with alternative text rather than injecting HTML. Copy feedback is announced, including a manual-copy fallback.
- Add a keyboard skip link, authentication main landmarks, descriptive home/account/menu labels, a dashboard heading, current-page navigation semantics, and reduced-motion styles. Use theme text for readable authentication status messages and consistent logo contrast.
- Preserve the Base UI toast wrapper, Nova theme, Inter font source, Laravel source directives, and installer hooks. Unused reusable UI primitives and alternate layout templates remain available as starter-kit building blocks.

## Verification

| Check                                          | Result                                                                                                                                                                                                                                                                            |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clean PHP dependency install                   | Passed with installer hooks deferred to preserve source features.                                                                                                                                                                                                                 |
| Clean npm install without a lockfile           | Passed; npm reported zero vulnerabilities. Existing pnpm dependency tree was moved to a temporary backup because npm could not process it.                                                                                                                                        |
| Frontend formatting/lint and TypeScript        | Passed.                                                                                                                                                                                                                                                                           |
| Production client and SSR builds               | Passed. SSR emits one non-blocking Inertia plugin sourcemap warning.                                                                                                                                                                                                              |
| Pint, PHPStan, PHPUnit                         | Passed: 43 tests, 152 assertions.                                                                                                                                                                                                                                                 |
| Full React Doctor source/maintainability audit | Zero errors, zero warnings, no skipped checks. Run against a clean source snapshot because the tool tried to read a deleted, still-tracked hook in the working tree.                                                                                                              |
| Focused React runtime tests                    | Passed: theme subscriptions, unchanged-snapshot render counts, system/cross-tab changes, listener reuse, invalid/blocked storage, form error focus order, concurrent setup request deduplication, and state clearing. Temporary harness; no test dependency added to the starter. |
| Browser console                                | No warnings or errors in the tested main application or configured UI fixtures.                                                                                                                                                                                                   |
| Radix scan                                     | No Radix imports, packages, or legacy child-composition API under frontend source/package manifest.                                                                                                                                                                               |
| shadcn configuration                           | `base=base`, `style=base-nova`, preset `b37ZhrNTs`.                                                                                                                                                                                                                               |

## Chisel compatibility

Compared with freshly fetched `upstream/main` at `87cce8705d712629ebddd70ccfbb06592ecbaac2`. Both Chisel scripts match upstream exactly; all 102 marker tokens are retained with matching per-file counts. The login import needed relocation even though the marker counts already matched, illustrating why the installer executions matter.

Actual `install:features` executions ran only in disposable copies with:

- All five authentication features retained.
- No optional features retained.
- Registration and two-factor authentication retained; the other optional features removed.

Each variant completed Chisel, deleted its installer scripts as designed, and passed formatting/lint, TypeScript, and production build. The previously documented no-feature TypeScript failure no longer reproduces. Generated lockfiles and Wayfinder source are removed after verification to preserve starter-kit packaging.

## Browser coverage

A browser subagent inspected all 12 page components at desktop and mobile sizes, including 320px narrow layouts and 844×390 landscape dialogs. Checks covered light/dark/system appearance, labels/error relationships, invalid submissions, keyboard focus, sidebar/menu interaction, profile success toast, passkey form cancellation, OTP/recovery errors, and dialog cancellation. The mobile sidebar, passkey focus, QR overflow, and short-viewport findings were fixed and retested.

| Page/flow                                                                  | How tested                                                                                                                                                              |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Welcome, login, registration, forgot/reset password, password confirmation | Actual application; validation and relevant navigation. Login, forgot-password request and password confirmation succeeded using disposable users.                      |
| Dashboard, profile, security, appearance                                   | Actual application; desktop/mobile, theme changes, profile save, destructive-dialog open/error/Cancel, recovery reveal/hide.                                            |
| Two-factor challenge                                                       | Actual backend with a disposable preseeded account; invalid OTP/recovery errors and successful recovery-code login.                                                     |
| Email verification                                                         | Actual page component rendered in an isolated UI fixture, initial and sent states. The stock User does not implement MustVerifyEmail, so this route normally redirects. |
| Two-factor setup                                                           | Actual component in an isolated UI fixture, mock QR/key and invalid confirmation response; initial, retry, verification, error, Back and narrow/landscape states.       |
| Passkeys                                                                   | Actual empty/form states plus a long-name component fixture; no native credential registered.                                                                           |

## Limits and follow-up

- Native WebAuthn authentication/registration and hardware/OS prompts need a physical-device check. Browser QA did not execute successful account deletion, password changes, or two-factor disable/regeneration. Backend tests cover their applicable server behavior.
- Browser testing used Chromium; it was not an automated axe audit, screen-reader session, or Safari/Firefox/device matrix. Alternate unused auth layouts were source-reviewed, not individually browser-rendered.
- React Compiler/static checks and focused hook render counters found no remaining issue in their coverage. No whole-application React Profiler trace was captured; this is not a claim that every render is necessary.
- The SSR sourcemap warning concerns debug source mapping in `@inertiajs/vite`, not a browser runtime error. Keep it visible when evaluating future dependency updates.
- The repository currently has only `upstream` configured and is on `main`; the documented customization branch and user-owned `origin` were not changed during this quality review.

## Local evidence

Temporary evidence is retained outside the repository:

- Browser report and screenshots: `/private/tmp/starter-kit-browser-qa/`.
- Final feature-selection results: `/private/tmp/starter-kit-final-chisel-qa/summary.json`.
- Full React diagnostic report: `/private/tmp/starter-kit-doctor-clean.json`.
- Runtime checks: `/private/tmp/starter-kit-runtime-qa.cjs`.
- PHP verification: `/private/tmp/starter-kit-tests.log`.

Browser tests used an isolated SQLite database, and fixture routes/pages existed only in a disposable project. QA servers were stopped after verification.
