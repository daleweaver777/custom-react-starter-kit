# Production readiness audit — September 14, 2026

**Verdict: address the high-priority findings before production.** The build, existing tests, and Chisel feature combinations are healthy, but the passing suite does not cover several reproducible security and account-recovery problems.

This is a review checklist, not an implementation. No application fixes were made. Source audited: `main`, commit `86e708b` (`Initialize environment before dependency setup hooks`). Testing used disposable copies, databases, accounts, and log-only email. Existing checkout data and configuration were preserved.

**Priority:** P1 = resolve before public deployment; P2 = resolve for a reliable production starter. A conditional finding identifies a deployment dependency rather than asserting that an unseen production server is vulnerable. The numbered items are intended to be reviewed and fixed individually.

## Working list

### F01 — P1 — New passwords are flashed to the session in plaintext

- [x] Prevent new passwords from entering flashed input and diagnostic captures.

**Confirmed:** Submit a password update with an incorrect current password. The validation redirect stores `_old_input.new_password` in the database session payload. Reproduced with `APP_ENV=production` and debug disabled. Base64-encoding a session payload does not encrypt it.

Laravel excludes `password`, `password_confirmation`, and `current_password` by default; this application uses an additional field name. The installed Inertia devtools default redaction list also omits `new_password`, so review diagnostic capture as part of the fix.

**Location:** [PasswordUpdateRequest.php](/Users/dalew/code/php/custom-react-starter-kit/app/Http/Requests/Settings/PasswordUpdateRequest.php:22), [bootstrap/app.php](/Users/dalew/code/php/custom-react-starter-kit/bootstrap/app.php:26).

**Suggested fix:** Add the custom field to Laravel's non-flash exclusions and relevant logging/devtools redaction. Audit OTP, recovery-code, and reset-token handling too. Session encryption is additional protection, not a substitute for excluding passwords.

**Acceptance:** Failed HTML and Inertia submissions never retain any password field in old input, database sessions, application logs, or diagnostic request captures.

**Resolution:** Restored the standard `password` request field throughout the security form, validation, and controller. A validation display name preserves “new password” in messages, including confirmation mismatches. Regression tests cover failed HTML and Inertia submissions, database session payloads, application log events, and the installed Inertia diagnostic request builder. Existing stored sessions and diagnostic records are not rewritten by this change.

### F02 — P1 — Password changes and resets leave other sessions authenticated

- [x] Revoke other sessions when credentials change or are recovered.

**Confirmed:** Log into two independent HTTP sessions. Change the password in session A; session B still gets HTTP 200 from the dashboard. Reset the password through an emailed token; an existing session still gets HTTP 200 from profile settings. This weakens recovery from a stolen session.

**Location:** [SecurityController.php](/Users/dalew/code/php/custom-react-starter-kit/app/Http/Controllers/Settings/SecurityController.php:62), [ResetUserPassword.php](/Users/dalew/code/php/custom-react-starter-kit/app/Actions/Fortify/ResetUserPassword.php:26), [bootstrap/app.php](/Users/dalew/code/php/custom-react-starter-kit/bootstrap/app.php:17).

**Suggested fix:** Define a session-revocation policy, configure Laravel's session authentication protections, invalidate other sessions/remembered authentication appropriately, and rotate the surviving session when appropriate. Do not treat deleting database rows alone as sufficient if remember-me cookies can recreate authentication.

**Acceptance:** Test two browsers, remembered login, ordinary password change, password reset, and the current session. Old sessions and remembered credentials cannot regain access after recovery. See [OWASP session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

**Resolution:** Enabled Laravel’s native `AuthenticateSession` middleware across web routes. The password-update method now matches upstream: it saves the password and returns the existing success response. The middleware refreshes the current session’s fingerprint after the update and rejects other sessions on their next request. Old remember-me cookies, including the current browser’s, cannot restore authentication after the password changes. The current session stays signed in, but its ID and CSRF token are not explicitly rotated. Custom remember-token rotation, re-login, and confirmation-timestamp clearing were removed from the controller. Password resets retain Fortify’s existing behavior. Regression tests cover independent browser sessions, idle sessions, remembered authentication, same-password changes/resets, failed attempts, and database/cookie session drivers.

**Framework dependency (September 16):** The custom login-fingerprint middleware was removed in favor of Laravel’s native `AuthenticateSession`. Login-time fingerprint capture requires a framework version containing [laravel/framework#61594](https://github.com/laravel/framework/pull/61594). The currently installed v13.32.0 does not contain the fix; upgrade to a version containing it before relying on protection for sessions that have not followed the login redirect. The regression tests remain enabled. Validation of the simplified controller against the exact PR head in an isolated copy passed all 180 PHP tests (1,821 assertions), Pint, and PHPStan. The source checkout’s dependencies are unchanged.

### F03 — P1 — Recovery email can be replaced without reauthentication

- [x] Treat email changes as a security-sensitive operation.

**Confirmed:** An authenticated session that had not confirmed the password successfully changed the account email with `PATCH /settings/profile`. The new address immediately became eligible to receive a password-reset link. Combined with a stolen session, this can turn temporary access into control of a password-only account.

**Location:** [ProfileController.php](/Users/dalew/code/php/custom-react-starter-kit/app/Http/Controllers/Settings/ProfileController.php:31), [routes/settings.php](/Users/dalew/code/php/custom-react-starter-kit/routes/settings.php:14).

**Suggested fix:** Require a fresh appropriate authentication factor for email changes, verify a pending address before replacing the recovery address, and notify the previous address. Keep ordinary name edits convenient. Preserve sensible behavior when optional confirmation or verification features are removed; their removal should be an explicit security-policy choice.

**Acceptance:** A session alone cannot redirect password recovery. Test old/new address ownership, duplicate addresses, abandoned changes, expiry, and every relevant Chisel selection. See [OWASP email-change guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#changing-a-users-registered-email-address).

**Resolution:** Split name edits from email changes. Email requests are throttled and require recent identity confirmation when the Password confirmation installer option is selected. A separate pending record keeps the original sign-in/recovery address active until the requesting account confirms a one-use link delivered to the new address. Links expire after 30 minutes; cancellation, replacement, or password changes/resets invalidate them. GET only displays a review page; a CSRF-protected POST completes the change. Completion checks uniqueness again, marks the address verified, clears reset tokens for both addresses, and notifies the previous address. Confirmation mail uses the configured application origin. Pending-address verification remains independent of registration email verification; reauthentication follows the Password confirmation installer option. With that option omitted, a stolen authenticated session can initiate and complete a change to an address it controls, so the F03 takeover protection is conditional on retaining confirmation; unverified users can use it too. The full PHP suite passes (94 tests, 888 assertions), as do frontend checks/builds and four fresh Chisel installations: all features, all except password confirmation, no optional features, and password confirmation only. Paired browser checks cover the enabled/disabled confirmation policies, pending email verification, TOTP setup and recovery codes, password changes, and account deletion. The detailed validation record is in README-maintainer.md. Existing installations need the new `pending_email_changes` migration.

### F04 — P1, conditional — Untrusted Host can poison password-reset links

- [x] Accept verified Laravel Cloud protection as a hosting dependency and document the required protection for other hosts.

**Confirmed locally:** A reset request sent to the local server with `Host: audit-attacker.invalid` succeeded, and the log-mail reset URL used `http://audit-attacker.invalid/reset-password/...`. No external email was sent. Exploitation on a real deployment depends on whether its proxy/web server forwards unknown hosts and whether the recipient follows the poisoned link.

**Location:** [bootstrap/app.php](/Users/dalew/code/php/custom-react-starter-kit/bootstrap/app.php:17).

**Suggested fix:** Configure trusted hosts and correct proxy handling; reject unrecognized hosts at ingress. Consider generating security links from an explicitly trusted canonical origin. `APP_URL` alone did not prevent the observed behavior.

**Acceptance:** Unknown Host headers are rejected, and reset/verification links always use an approved HTTPS origin behind the actual proxy. See [Laravel trusted-host documentation](https://laravel.com/framework/docs/13.x/requests#configuring-trusted-hosts).

**Disposition — accepted hosting dependency, September 15, 2026:** The maintainer chose to retain Laravel's default URL generation and rely on Laravel Cloud for the tested deployment. A fresh stock React starter kit at commit `fa40ffc63695336544af3eb359fdfa2b3313823c`, running Laravel 13.31.0 and Fortify 1.39.0 on its assigned Cloud domain, passed six low-volume HTTP probes with valid guest sessions and CSRF tokens. The normal reset and four forwarded-header variations returned 200; their five logged reset emails all used the correct HTTPS Cloud domain. An altered `Host: audit-attacker.invalid` returned a Cloudflare-branded 403 with no reset email observed. Successful resets were spaced more than 65 seconds apart. Production mode, debug disabled, and log-only mail were confirmed. Application code and Cloud settings were unchanged. This validates the tested password-reset paths; custom domains, other header combinations, and registration verification links were not tested. README.md now requires host-header protection on other hosting and revalidation after domain/proxy changes. No application-level F04 fix is planned for the tested Cloud configuration.

### F05 — P1 — Registration has no abuse budget

- [x] Decide registration abuse protection: rely on Laravel Cloud (accepted hosting dependency).

**Confirmed:** Twelve consecutive invalid registrations from one client all reached validation (422), with no 429. The effective Fortify registration route has guest middleware but no throttle; valid registrations succeeded in separate tests. The audit deliberately avoided mass-creating accounts.

**Location:** [FortifyServiceProvider.php](/Users/dalew/code/php/custom-react-starter-kit/app/Providers/FortifyServiceProvider.php:127), installed Fortify `register.store` route.

**Suggested fix:** Combine IP burst and sustained budgets, recipient/mail budgets, request-size bounds, and escalation for suspicious traffic. Add CAPTCHA only if warranted by observed abuse. Keep the limiter within registration's Chisel feature boundaries.

**Acceptance:** Tests demonstrate that excessive requests are stopped before account creation, password work, or email delivery, while ordinary users behind a shared IP can recover gracefully.

**Disposition — accepted hosting dependency, September 15, 2026:** The maintainer chose to remove the F05 application changes and rely on Laravel Cloud. The registration limiter, request-size/shape middleware, associated tests, and custom retry guidance have been reverted. Registration again uses Fortify’s default route without application-level throttling. Cloud’s effective protection depends on the subscribed plan and enabled edge settings; those settings have not been inspected or tested for this decision. This is an accepted hosting dependency, not a verified equivalent of the removed IP, recipient, and payload controls. Other hosts need their own registration abuse protection.

### F06 — P2 — Reset endpoints lack request-level throttling

- [x] Address password-reset request and token-submission abuse through Laravel Cloud (accepted hosting dependency).

**Confirmed:** Twelve reset requests for varying addresses and twelve invalid reset-token submissions all reached application validation without a 429. Laravel's configured password broker **does** impose a 60-second token-creation cooldown per existing account; that is useful but does not bound requests across addresses or repeated token-validation work.

**Location:** [config/auth.php](/Users/dalew/code/php/custom-react-starter-kit/config/auth.php), [FortifyServiceProvider.php](/Users/dalew/code/php/custom-react-starter-kit/app/Providers/FortifyServiceProvider.php:127), Fortify `password.email` and `password.update` routes.

**Suggested fix:** Add IP-level and normalized-recipient budgets to reset requests, and IP plus account/token attempt budgets to submissions. Do not log raw tokens or use them verbatim as observable cache keys.

**Acceptance:** Repeated and distributed-address requests are bounded; valid recovery remains usable; token expiry and single use remain intact.

**Disposition — addressed via Laravel Cloud, September 15, 2026:** The maintainer chose to rely on Laravel Cloud's edge rate limiting for this finding. The existing password broker's 60-second per-account cooldown remains in place; no additional application limiter is planned. Cloud's subscribed plan, enabled settings, and effective protection have not been inspected or tested for this decision. This is an accepted hosting dependency; per-IP edge limits do not establish a recipient/account budget across different IPs. Other hosts need their own reset-abuse protection.

### F07 — P1 — Sensitive authenticated endpoints allow unthrottled guessing

- [x] Address remaining sensitive-action abuse through Laravel Cloud, preserving existing application limits (accepted hosting dependency).

**Confirmed:** Twelve wrong passwords at `/user/confirm-password`, twelve wrong deletion passwords at `/settings/profile`, and twelve wrong setup codes at `/user/confirmed-two-factor-authentication` each returned validation failures without throttling. An authenticated session is required for these requests; this is not an anonymous password oracle. It still undermines the protection expected from reauthentication after session theft and permits expensive repeated work.

The separate password-update route already has `throttle:6,1`, and the 2FA **login** challenge already has a five-per-minute limiter. Preserve these protections.

**Partial remediation (2026-09-15):** The shared identity-confirmation endpoint now has independent five-per-minute user and thirty-per-minute IP budgets. Account deletion uses that confirmation session instead of its own password-validation endpoint. Repeated-password regression tests verify the 429 response. The remaining 2FA setup-code and mutation budgets are covered by the hosting-dependency decision below.

**Location:** [routes/settings.php](/Users/dalew/code/php/custom-react-starter-kit/routes/settings.php:18), [FortifyServiceProvider.php](/Users/dalew/code/php/custom-react-starter-kit/app/Providers/FortifyServiceProvider.php:127), effective Fortify confirmation and 2FA routes.

**Suggested fix:** Use named, action-specific user/IP limits. Also budget 2FA enable/disable, recovery-code regeneration, and passkey deletion to limit mutation churn.

**Acceptance:** Actual repeated HTTP attempts produce 429s and usable retry guidance. Chisel cannot leave a route referring to a removed limiter.

**Disposition — addressed via Laravel Cloud, September 15, 2026:** The maintainer chose to rely on Laravel Cloud's edge protections for the remaining 2FA setup-code and mutation abuse. Existing password-confirmation, password-update, and 2FA login limits remain in place; no additional application limiter is planned. Cloud's subscribed plan, enabled settings, and effective protection have not been inspected or tested for this decision. This is an accepted hosting dependency; per-IP edge limits do not establish a per-user budget across different IPs. Cloud's documented repeated-error rule covers 401/403/404, not validation responses returning 422 or form redirects. Other hosts need their own sensitive-action abuse protection.

### F08 — P2 — Login and passkey limits lack independent aggregate budgets

- [x] Address aggregate login/passkey abuse through Laravel Cloud, preserving existing application limits (accepted hosting dependency).

**Confirmed:** Login blocked the sixth attempt for one email/IP pair, but twelve different emails from the same IP all reached validation. Passkey options blocked after ten requests in one session, but twelve fresh sessions from the same IP all received options. The passkey limiter also accepts a client-provided credential ID as part of its key.

**Location:** [FortifyServiceProvider.php](/Users/dalew/code/php/custom-react-starter-kit/app/Providers/FortifyServiceProvider.php:135).

**Suggested fix:** Preserve existing limits and add independent IP and appropriate authenticated-user budgets. Use account-level risk signals carefully so attackers cannot trivially lock out a victim. Do not use a supplied credential ID or session cookie as the sole aggregate abuse boundary.

**Acceptance:** Varying emails, credential IDs, or cookies does not evade the aggregate budget. Test cache sharing and trusted client-IP resolution in a multi-instance deployment.

**Disposition — addressed via Laravel Cloud, September 15, 2026:** The maintainer chose to rely on Laravel Cloud's independent IP rate limits for aggregate login/passkey abuse. Existing application limits remain in place; no additional application limiter is planned. Changing an email, credential ID, or session cookie does not change the client IP used by Cloud's documented limiter. Cloud's subscribed plan, enabled settings, and effective protection have not been inspected or tested for this decision. This is an accepted hosting dependency; rotating IPs or staying below the configured edge threshold remains outside that aggregate IP protection. Other hosts need their own aggregate limits. See [Laravel Cloud rate-limiting documentation](https://laravel.com/cloud/docs/network#rate-limiting) for the available controls.

### F09 — P2 — Changing email capitalization can prevent login

- [x] Normalize email consistently before storage, uniqueness checks, login, and recovery.

**Confirmed on the default SQLite database:** A profile change from a lowercase email to its uppercase equivalent succeeded. Subsequent login attempts with either capitalization failed. Fortify lowercases login input, while the custom profile update persists the supplied capitalization.

**Location:** [ProfileValidationRules.php](/Users/dalew/code/php/custom-react-starter-kit/app/Concerns/ProfileValidationRules.php:40), [ProfileUpdateRequest.php](/Users/dalew/code/php/custom-react-starter-kit/app/Http/Requests/Settings/ProfileUpdateRequest.php), [ProfileController.php](/Users/dalew/code/php/custom-react-starter-kit/app/Http/Controllers/Settings/ProfileController.php:33).

**Suggested fix:** Adopt one canonical email policy across all entry points and enforce matching uniqueness semantics. Review existing records before migrating to it.

**Acceptance:** Mixed-case registration, profile edits, login, reset requests, and duplicate-address checks behave consistently on SQLite and the intended production database.

**Resolution — September 15, 2026:** F03 had already removed email writes from ordinary profile updates and normalized the separate email-change request; Fortify already lowercases registration, login, reset-link requests, and reset submissions. The remaining storage gap is now closed for model writes: `CreateNewUser` lowercases email before validation, including direct action calls, and a `User` email setter normalizes creation and updates. The existing unique index therefore rejects case-variant model writes on SQLite. Ten added regression tests cover HTTP/direct registration, model creation and updates, duplicate rejection, capitalization-only profile/email requests, a competing claim while an address is pending, login and recovery after an email change, and reset-token submission with mixed casing. The source PHP suite passes with 107 tests and 1,059 assertions. The maintainer confirmed SQLite as the intended production database. Existing mixed-case rows are not rewritten automatically; existing installations require a collision review before normalizing stored addresses. Raw SQL and bulk writes bypass model setters and must normalize explicitly. No frontend or installer changes were needed.

### F10 — P2 — Password-reset responses disclose account existence

- [x] Return a neutral recovery response for existing and unknown addresses.

**Confirmed:** A known address returned success with an emailed-link message. An unknown address returned 422 with “We can't find a user with that email address.” Combined with the missing aggregate limiter, this supports account enumeration.

**Location:** Fortify password-reset response handling, configured through [FortifyServiceProvider.php](/Users/dalew/code/php/custom-react-starter-kit/app/Providers/FortifyServiceProvider.php); [forgot-password.tsx](/Users/dalew/code/php/custom-react-starter-kit/resources/js/pages/auth/forgot-password.tsx).

**Suggested fix:** Use a consistent status and neutral message, review timing differences, and preserve useful validation for malformed email syntax. Decide explicitly whether registration should reveal duplicates as a separate product tradeoff.

**Acceptance:** Public reset responses do not distinguish existing from unknown valid addresses. See [OWASP forgot-password guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

**Resolution — September 15, 2026:** Both Fortify reset-link response contracts now resolve to the application's `PasswordResetLinkResponse`. Sent links, unknown addresses, and the broker's resend cooldown all return the same neutral message: “If an account exists with that email address, you’ll receive a password reset link shortly.” JSON requests receive HTTP 200 with the same body; browser requests redirect back with the same status flash and no account-specific errors or old input. Fortify still validates malformed email input before the broker runs. The broker retains its 60-second cooldown and token handling. Ten added regression cases cover JSON and browser/Inertia responses, unknown-address side effects, mixed-case repeat requests, preserving the original token during cooldown, renewed delivery after cooldown, and missing, empty, malformed, and array email input. The full PHP suite passes with 117 tests and 1,205 assertions; PHP lint/static analysis, frontend lint/format/types/build, and Base UI/Nova preset verification also pass.

**Timing review:** The installed Laravel broker already applies a 200 ms minimum to sent, unknown, and throttled reset-link requests. Reset mail is still synchronous, so delivery exceeding that minimum can expose timing differences; response normalization does not establish timing indistinguishability. Queueing mail and measuring real-provider timing remain part of the outstanding R02 mail-delivery work. Registration duplicate-address feedback remains unchanged and is a separate product decision. This resolution covers the explicit response disclosure; it does not certify production timing or hosting rate limits.

### F11 — P2 — Malformed authentication input produces server errors

- [x] Closed by maintainer decision — declined; no fix will be applied.

**Confirmed:** `email: ["bad"]` at login and `credential.id: ["bad"]` at passkey login each returned 500. The limiter applies string operations before the request validation can reject these arrays. A registration password containing a NUL byte also produced 500 through bcrypt.

**Location:** [FortifyServiceProvider.php](/Users/dalew/code/php/custom-react-starter-kit/app/Providers/FortifyServiceProvider.php:136), [PasswordValidationRules.php](/Users/dalew/code/php/custom-react-starter-kit/app/Concerns/PasswordValidationRules.php:17).

**Suggested fix:** Build limiter keys from safely type-checked, bounded values; return validation errors for unsupported credential input. Check arrays, objects, nulls, extreme lengths, and malformed WebAuthn payloads across every public auth endpoint.

**Acceptance:** These requests return controlled 4xx responses without exception/log floods, and still consume an appropriate abuse budget.

**Decision — September 15, 2026:** The maintainer explicitly chose not to fix F11 and requested that the implementation be discarded. All F11 code and regression-test changes were reverted. The finding remains confirmed and unfixed; closure records the maintainer’s decision, not remediation.

### F12 — P2 — Long passwords silently lose their suffix under bcrypt

- [x] Make password validation and the hashing algorithm agree about supported input.

**Confirmed:** Registration accepted a 100-character password. Login succeeded with a different suffix after its first 72 bytes. The default bcrypt configuration has no application input limit, and the password rules do not establish one.

**Location:** [PasswordValidationRules.php](/Users/dalew/code/php/custom-react-starter-kit/app/Concerns/PasswordValidationRules.php:17), framework hashing configuration inherited by the app.

**Suggested fix:** Prefer a deliberately configured Argon2id policy if supported by deployment, or explicitly enforce bcrypt's byte boundary and explain it to users. Bound request size regardless. Do not silently truncate passwords or invent an ad hoc prehashing scheme.

**Acceptance:** Distinct accepted passwords cannot authenticate solely because their first 72 bytes match. Include multibyte characters and password-manager-generated values. See [OWASP password storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

**Resolution — September 15, 2026:** The starter kit now defaults to Argon2id in its application hashing configuration and example environment, retaining Laravel's 64 MiB memory, four iterations, one thread, and algorithm verification. Shared `bail|required|string|max:255` input rules cover registration, reset, password updates, current passwords, confirmation fields, login through an application Fortify request binding, and sensitive-action password confirmation. No custom validator is needed. Tests use reduced Argon2id costs only in `phpunit.xml`. Forty-two new regression cases cover accepted 255-character ASCII and Unicode passwords, rejected 256-character inputs in JSON and browser requests, unchanged credentials on rejection, and suffix differences after byte 72 failing login and confirmation. The full source suite passes with 159 tests and 1,585 assertions, along with PHP formatting/static analysis, frontend checks, TypeScript, the production build, and Base UI/Nova preset verification. Existing bcrypt credentials are not migrated by this change; those installations need password resets or a deliberate migration before enabling strict Argon2id verification. Both READMEs remain unchanged by maintainer request.

**Confirmation validation — September 15, 2026:** Password confirmation now uses an application-owned `ConfirmPasswordRequest` and `PasswordConfirmationController`. The FormRequest applies the shared current-password rules, including Laravel's `current_password` verification, and preserves the existing incorrect-password message. The controller records confirmation through `session()->passwordConfirmed()` and returns Fortify's existing success response contract. The route retains its URL, name, authentication, and throttle. The former validation middleware was removed; Chisel removes the new request and controller when confirmation is omitted. Fortify's optional custom confirmation callback no longer participates. Browser and JSON regression cases cover missing, empty, null, array, oversized, and incorrect passwords, guest submissions, successful confirmation, and intended redirects. Full source checks pass with 180 tests and 1,850 assertions, PHP formatting/static analysis, frontend checks, TypeScript, and the production build.

### F13 — P2 — Password update trims one field but not its confirmation

- [x] Preserve password whitespace consistently.

**Confirmed by an isolated regression probe:** Submitting identical `new_password` and `password_confirmation` values with leading/trailing spaces produces a confirmation mismatch. Laravel's default TrimStrings exclusions cover `password_confirmation`, but not `new_password`.

**Location:** [PasswordUpdateRequest.php](/Users/dalew/code/php/custom-react-starter-kit/app/Http/Requests/Settings/PasswordUpdateRequest.php:22), [bootstrap/app.php](/Users/dalew/code/php/custom-react-starter-kit/bootstrap/app.php:17).

**Suggested fix:** Exclude the custom password field from trimming, or adopt standard naming consistently. Keep this behavior separate from the non-flash exclusion in F01; both protections are needed.

**Acceptance:** Matching passwords remain matching; leading/trailing whitespace is either consistently supported or explicitly rejected rather than silently transformed.

**Resolution:** The F01 rename restores Laravel’s default trimming exclusion. A regression test verifies surrounding whitespace in both the current and replacement passwords and confirms that the trimmed replacement does not authenticate.

### F14 — P2 — Global error alerts are obscured by open dialogs

- [ ] Make dialog request failures visible and accessible inside the active modal context.

**Confirmed in the browser:** In the disposable copy, a test-only 419 response was injected for the delete-account request. The Session expired alert appeared blurred behind the open dialog. DOM inspection confirmed an `aria-hidden="true"` ancestor on the alert. Its Refresh action became accessible only after Cancel closed the dialog. The temporary fault-injection route was subsequently removed.

**Location:** [flash-toaster.tsx](/Users/dalew/code/php/custom-react-starter-kit/resources/js/components/flash-toaster.tsx:13), [ui/alert-dialog.tsx](/Users/dalew/code/php/custom-react-starter-kit/resources/js/components/ui/alert-dialog.tsx), [notification-alert.tsx](/Users/dalew/code/php/custom-react-starter-kit/resources/js/components/notification-alert.tsx).

**Suggested fix:** Coordinate notification placement and dialog error handling with Base UI's modal accessibility model. Raising z-index alone will not fix hidden semantics or focus trapping. Preserve the existing alert animations and reduced-motion behavior.

**Acceptance:** 419, 429, network, and server failures from deletion, passkey, and 2FA dialogs can be perceived and acted on with keyboard, screen reader, and pointer without guessing that Cancel reveals an error.

### F15 — P2 — Unverified users cannot delete their account or easily correct their email

- [ ] Provide a coherent recovery path when the registration address is wrong or inaccessible.

**Confirmed:** An unverified user's correctly authenticated deletion request returned 403 because deletion is inside the `verified` route group. The profile page nevertheless renders DeleteUser. The verification screen offers resend and logout, with no direct edit-email action.

**Location:** [routes/settings.php](/Users/dalew/code/php/custom-react-starter-kit/routes/settings.php:17), [profile.tsx](/Users/dalew/code/php/custom-react-starter-kit/resources/js/pages/settings/profile.tsx), [verify-email.tsx](/Users/dalew/code/php/custom-react-starter-kit/resources/js/pages/auth/verify-email.tsx).

**Suggested fix:** Decide whether correctly reauthenticated unverified users may delete their own accounts, and make the UI agree. Add an obvious, safely authenticated email-correction route from verification. Coordinate with F03.

**Acceptance:** A user who mistypes their email can correct it or abandon/delete the account without first receiving mail at that address. Verify the no-email-verification Chisel variant too.

### F16 — P2 — CI does not retain the security and frontend coverage needed for these guarantees

- [ ] Add durable regression coverage and a Chisel matrix to the maintained repository.

**Confirmed by inspection:** CI runs one default setup on PHP 8.3/Node 22 and the existing check/test commands. There is no browser test suite, no retained frontend interaction tests, and no CI matrix for optional feature selections. Existing tests passed despite the findings above. Some security-page tests skip entirely when 2FA is absent, reducing coverage for passkey-only and minimal applications.

**Location:** [.github/workflows/tests.yml](/Users/dalew/code/php/custom-react-starter-kit/.github/workflows/tests.yml:12), [SecurityTest.php](/Users/dalew/code/php/custom-react-starter-kit/tests/Feature/Settings/SecurityTest.php), [tests/TestCase.php](/Users/dalew/code/php/custom-react-starter-kit/tests/TestCase.php), [package.json](/Users/dalew/code/php/custom-react-starter-kit/package.json).

**Suggested fix:** Retain focused regression tests as findings are fixed; add browser auth/settings/dialog tests, WebAuthn coverage, and all/none/mixed Chisel CI (all 32 combinations on a scheduled or release job if runtime is a concern). Test production-mode configuration separately. Either isolate HTTP tests from Vite or explicitly build assets before running them.

**Acceptance:** CI fails when a fixed finding is deliberately reintroduced. Generated applications have no missing-feature imports/routes, can cache production configuration, and are tested without relying on a developer's existing build artifacts.

## Rate-limit design to review

These are **proposed starting budgets**, not tested capacity limits. Tune them using expected traffic, shared-IP users, mail-provider quotas, and measurements. Use separate action names so unrelated endpoints do not accidentally share generic throttle counters. Keep an independent aggregate budget where needed.

| Operation                   | Current protection                                | Proposed direction                                                                            |
| --------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Registration                | No route throttle                                 | About 3/minute/IP plus a sustained hourly budget; recipient/mail and resource caps            |
| Password login              | 5/minute/email+IP                                 | Keep it; add an IP aggregate, e.g. 30/minute, and risk-based account signals                  |
| Forgot password             | 60-second broker cooldown per existing account    | Add IP and normalized-recipient request budgets, e.g. 5/minute/IP and a small hourly mail cap |
| Reset token submission      | No route throttle                                 | IP plus account/token attempt budgets; never expose raw tokens in keys/logs                   |
| Password confirmation       | No route throttle                                 | About 5/minute/user with an IP aggregate and a longer-window cap                              |
| Password update             | Generic 6/minute throttle                         | Preserve; name the limiter and test independence from verification traffic                    |
| Delete account              | Password required; no route throttle              | About 5/minute/user plus an IP budget for password checks                                     |
| Profile update              | Authenticated only                                | User write budget; stricter email-change budget and fresh authentication                      |
| Verification send/verify    | Generic 6/minute throttle                         | Keep; add sustained recipient/user mail limits and clear cooldown feedback                    |
| 2FA login                   | 5/minute/challenged user ID                       | Keep; add an aggregate IP budget and monitor targeted lockout abuse                           |
| 2FA setup confirmation      | No route throttle                                 | About 5/minute/user; budget setup/recovery mutations separately                               |
| Recovery-code regeneration  | Password confirmation where selected; no throttle | A small hourly user budget, fresh-auth policy, security notification                          |
| Passkey login/options       | 10/minute/credential-or-session+IP                | Add independent IP budgets; authenticated operations also need user budgets                   |
| Passkey enrollment/deletion | Some enrollment throttling; deletion unthrottled  | User mutation budgets and a reasonable maximum credential count                               |

Use a shared, reliable cache for limits across application instances. Configure trusted proxies before relying on IP identity. Return `Retry-After` and show a useful cooldown in the UI; the current global 429 message only says to wait “a moment.” Monitor blocked attempts without storing submitted credentials. Laravel supports [named request limiters](https://github.com/laravel/docs/blob/13.x/routing.md#rate-limiting).

## Additional production improvements

These are recommendations or deployment decisions, not claims that an unseen production environment is misconfigured.

- [ ] **R01 — Deployment checklist.** Document `APP_ENV=production`, `APP_DEBUG=false`, canonical HTTPS `APP_URL`, secure session cookies, trusted hosts/proxies, a `public/` document root, least-privilege filesystem/database access, optimized caches, worker supervision, and rollback. Local production-mode responses did not set CSP/frame restrictions, HSTS, or a referrer policy; establish them at the appropriate app/proxy layer. A CSP needs deliberate handling of the existing inline theme script/style. See [Laravel deployment guidance](https://laravel.com/framework/docs/13.x/deployment).
- [ ] **R02 — Mail and account-security notifications.** Validate real email delivery, SPF/DKIM/DMARC, bounces, delays, provider outages, and retries. Queue mail where appropriate, with user-facing recovery for delivery failures. Notify users about password, recovery-email, 2FA, and passkey changes. The audit used log mail and cannot certify deliverability.
- [ ] **R03 — Operations and recovery.** Add structured security events, exception monitoring, rate-limit/mail-spike alerts, queue lag and failed-job monitoring, and tested backup restoration. Define session, reset-token, audit-log, deleted-account, and unverified-account retention. `/up` alone is not an end-to-end check of database, cache, queue, and mail availability.
- [ ] **R04 — Passkey UX and real-device gate.** Show an explicit loading message/spinner and a supported cancellation/retry path during enrollment. In this browser, the request stayed pending and disabled both Register and Cancel; a successful authenticator ceremony was not completed. Verify enrollment, login, confirmation, cancellation, timeout, deletion, renamed/long credential labels, and recovery on real platform authenticators/security keys over HTTPS. Do not label passkeys fully certified from the route/ownership tests alone.
- [ ] **R05 — Explain password requirements and recovery.** Display the production password requirements before submission; the `passwordrules` attribute alone does not give every browser a visible explanation. Prefer “Log in using …” over “login using …,” “code” over “random pin,” and explain authenticator apps in familiar language. Consider clear copy/download affordances for recovery codes and an explicit back/cancel path on reauthentication screens.
- [ ] **R06 — Finish accessibility conventions.** Preserve the good form labels, first-error focus, dialog titles, skip link, and focus outlines. Review remaining `transition-colors` in `text-link.tsx` and `ui/breadcrumb.tsx`, and `transition-all` in `ui/sidebar.tsx`, against AGENTS.md. Add semantic headings to settings cards where useful. Run actual screen-reader, forced-colors, reduced-motion, zoom, and touch-device checks; a desktop viewport resize does not replace them.
- [ ] **R07 — Release and dependency discipline.** Keep lockfiles out of this starter source as instructed, but recommend committing resolved lockfiles in generated production applications. Run scheduled Composer/npm advisory checks and tested dependency updates. Test clean `--no-dev` deployment and the minimum PHP version, not only a developer installation with dev packages present.
- [ ] **R08 — Minimize exposed props and polish production pages.** The current User model hides password/2FA secrets correctly, but sharing the whole model makes future columns easy to expose accidentally; consider an explicit auth-prop allowlist. Supply coherent 403/404/500/503 pages with recovery navigation. Replace starter placeholder dashboard/marketing links in real applications. Clarify that appearance is saved per browser rather than synced to the account.
- [ ] **R09 — SSR and performance budget.** SSR build and worker health passed, but the build emitted an Inertia-plugin sourcemap warning. Track it for debugging quality. Establish asset/performance budgets on slow devices/networks and document whether production runs SSR. No production throughput or denial-of-service load test was performed.

## What was tested

### Automated and installation verification

| Check                                              | Result                                                                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Maintained checkout at start                       | Clean, on `main`; official Laravel upstream and user origin configured                                                          |
| Deferred Composer install in disposable copy       | Passed; installer files retained                                                                                                |
| npm install without a tracked lockfile             | Passed                                                                                                                          |
| Composer validation                                | Passed                                                                                                                          |
| Composer advisory audit                            | No known advisories or abandoned packages reported                                                                              |
| npm install advisory audit                         | No known vulnerabilities reported in resolved install                                                                           |
| shadcn info                                        | `base=base`, `style=base-nova`, preset `b37ZhrNTs`                                                                              |
| Radix / `asChild` scan                             | No matches in application JS or package.json                                                                                    |
| Chisel differences versus local upstream reference | Reviewed; customization retained                                                                                                |
| Frontend formatting/lint                           | Passed                                                                                                                          |
| TypeScript                                         | Passed                                                                                                                          |
| Production frontend build                          | Passed                                                                                                                          |
| PHP formatting / PHPStan                           | Passed                                                                                                                          |
| Existing PHP suite, PHP 8.5                        | 50 passed, 177 assertions                                                                                                       |
| Additional isolated probes                         | 4 passed, 13 assertions: passkey ownership/deletion, delete cascade, secret serialization, and whitespace-mismatch reproduction |
| PHP 8.4 suite including those probes               | 54 passed, 190 assertions                                                                                                       |
| All 32 Chisel selections                           | Trimming, formatting, TypeScript, build, applicable PHP tests, route caching, and optimization passed                           |
| All / none / mixed PHPStan                         | Passed                                                                                                                          |
| Fresh npm installs for none and mixed selections   | Passed; TypeScript and builds passed without sharing the all-feature node_modules                                               |
| Feature routes and selected database schema        | Checked; expected removals and retained features matched                                                                        |
| README / installer cleanup                         | README retained; Chisel installer/maintainer files removed from generated applications                                          |
| SSR build and health                               | Passed; sourcemap warning noted above; dashboard reload showed no captured hydration error                                      |

The Chisel harness initially ran HTTP tests before building frontend assets, producing missing-Vite-manifest errors. All combinations were rerun after their builds and passed. Those initial setup failures are not reported as Chisel defects. The harness used `LARAVEL_INSTALLER_NO_NODE=1` for trimming, then explicitly ran formatting/build steps; fresh dependency checks covered the minimal and mixed outputs. A full interactive installer run on every OS was not performed.

Resolved PHP packages included Laravel **13.31.0**, Fortify **1.39.0**, Chisel **0.1.1**, Laravel Passkeys **0.2.1**, and Inertia Laravel **3.3.4**. Primary runtime: PHP **8.5.8**, Node **22.23.2**. The PHP 8.3 minimum runtime was unavailable locally; existing CI targets it. An advisory scan is time-specific and is not proof that dependencies have no undiscovered vulnerabilities.

### Browser and HTTP feature coverage

| Feature                              | Coverage and result                                                                                                                                                                           |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Welcome/dashboard                    | Desktop and mobile inspection; navigation and placeholders render                                                                                                                             |
| Registration                         | Empty-field validation, error focus, valid disposable registration, verification redirect; production password policy tested by HTTP                                                          |
| Login/logout                         | Valid login, remember checkbox, logout, invalid requests, and measured login throttle behavior                                                                                                |
| Verification                         | Resend feedback, real signed link from log mail, unverified access restrictions; existing tests cover invalid signatures/IDs                                                                  |
| Forgot/reset password                | Browser request validation, email feedback, linked reset-page rendering; HTTP valid/invalid token and token-reuse rejection                                                                   |
| Profile                              | Browser save and success toast, backend validation, email-change behavior, casing bug, desktop/mobile layouts                                                                                 |
| Password confirmation/change         | Browser wrong/correct confirmation; HTTP correct/incorrect update, production policy, session persistence, flash and whitespace probes                                                        |
| 2FA setup                            | Browser QR/manual secret, copy feedback, invalid-code error and valid confirmation                                                                                                            |
| 2FA login/recovery                   | Browser recovery-code login; HTTP valid TOTP, used-code rejection, regenerated-code rejection, rate limits, disable/relogin                                                                   |
| Passkeys                             | Browser enrollment form/pending state; options endpoints, malformed requests, rate behavior, owner-only deletion, deletion cascade; successful real authenticator ceremony remains unverified |
| Account deletion                     | Browser dialog/error/cancel; HTTP correct-password deletion, wrong-password rejection, deleted-user login rejection, unverified restriction                                                   |
| Appearance/navigation                | Light/dark inspection, persisted appearance after reload, mobile sidebar/menu, Escape dismissal/focus return, settings navigation                                                             |
| Notifications                        | Success toast; injected 419/429/500 feedback; dismissal; modal accessibility failure reproduced                                                                                               |
| Minimal Chisel app                   | Browser login, dashboard, security without optional sections or password-confirmation redirect, forgot-password flow, reset form                                                              |
| Responsive/accessibility spot checks | Desktop 1280×720, mobile 390×844 and narrow 320×700; labels, error focus, dialog naming, hidden checkbox semantics; no horizontal overflow on the narrow login check                          |

No unexpected browser console warnings/errors were captured in the normal flows inspected, including the SSR dashboard reload. Injected HTTP failures were intentional. There was no successful real-device WebAuthn enrollment, independent Safari/Firefox/iOS/Android run, full screen-reader audit, full WCAG certification, offline-network fault test, high-concurrency test, external mail-delivery test, or production infrastructure penetration test. Unused UI primitives were reviewed through source/types/build checks, not a dedicated interactive component gallery. These are remaining validation gates, not implied passes.

### Evidence and preservation

Detailed command logs, request probes, and matrix results are in the local disposable directory [starter-audit-20260914](/private/tmp/starter-audit-20260914). Useful files include [original HTTP results](/private/tmp/starter-audit-20260914/http-results-original.json), [production probes](/private/tmp/starter-audit-20260914/production-results.json), [email/Host probes](/private/tmp/starter-audit-20260914/edge-results.json), [2FA probes](/private/tmp/starter-audit-20260914/twofactor-results.json), and [all 32 final matrix results](/private/tmp/starter-audit-20260914/matrix-rechecked.json). Temporary directories are not permanent storage; the reproductions and conclusions needed for review are retained in this report. Test credentials and reset links belong only to disposable accounts and are intentionally omitted here.

F01, F02, F03, F09, F10, and F13 have been fixed and marked complete. F10 closes explicit reset-response disclosure; its documented mail-timing limitation remains under R02. F04 is closed as an accepted, verified Laravel Cloud hosting dependency; other hosting requires the documented protection. F05–F08 are closed by maintainer decision as addressed via Laravel Cloud (accepted hosting dependencies), with the Cloud configuration still unverified. The application-level F05 changes were reverted; existing application protections for F06–F08 remain in place. F11 is closed by maintainer decision: the fix was declined and its code and regression-test changes were reverted; the confirmed issue remains unfixed. Continue with the other outstanding items, implementing each with its regression test while preserving the Base UI/Nova, FlashToaster, and Chisel invariants.
