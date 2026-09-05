# Visual and form audit — September 4, 2026

Reviewed the local app at http://localhost:8000 using the existing test account. Inspected desktop (1280 × 720) and mobile (390 × 844) views, including light and dark appearances. This is a starter-kit audit: the Laravel welcome content and dashboard placeholders are intentional scaffolding.

## Validation follow-up

All forms now use `noValidate` at the user's request. Browser constraint messages and submission blocking are disabled; Laravel validates submitted requests and supplies inline errors. Input constraints remain for semantics. This supersedes the native-validation behavior described in the original inspection below.

## Changes made

- Removed excess separator margins on passkey login/password confirmation. The auth layout already provides spacing; the additional margins made these screens unnecessarily tall.
- Made password visibility buttons keyboard reachable, exposed their pressed state and associated input, and respected disabled inputs. Verified Tab and Space interaction in the browser.
- Added required constraints to password confirmation, password reset, password update, account deletion, and forgot-password controls, matching registration/login behavior. Blank password confirmation previously returned “The provided password was incorrect.”
- Linked profile, security, deletion, and passkey messages to their controls with `aria-describedby` and stable error IDs.
- Added accessible names, required/length constraints, and error associations to authentication-code inputs.
- Submit buttons keep their labels and dimensions stable while disabled during processing; no submit spinners are used. Inertia handles delayed request progress.
- Enabled email autofill on password recovery; standardized reset labels to “Email address” and “New password.”
- Trimmed passkey names before submission and added an explicit required field and length limit.
- Replaced legacy vertical spacing in the two-factor modal with the existing gap convention.

## Coverage and observations

| Area                       | Coverage                                                                                     | Result / remaining concern                                                                                                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Welcome                    | Desktop light, mobile dark                                                                   | Layout fits mobile without horizontal overflow. Laravel marketing links and artwork remain starter content.                                                                                 |
| Login                      | Desktop/mobile, invalid credentials, successful login, keyboard visibility toggle            | Inline credential errors render correctly; spacing improved; submit button disables during processing. Server failure leaves focus on the document rather than the field.                   |
| Register                   | Mobile dark; duplicate email, short password, mismatched confirmation                        | All rejected correctly. Password mismatch appears under Password while Confirm password remains neutral. Both password fields clear on error, including an unrelated duplicate-email error. |
| Forgot password            | Mobile dark; blank and malformed email                                                       | Required and email-format feedback now consistent with login/register. No email was sent.                                                                                                   |
| Reset password             | Mobile dark; read-only email and blank submission, synthetic invalid URL token               | Layout and required controls checked. Password changes and real email/token flow were not performed.                                                                                        |
| Confirm password           | Desktop light; blank and valid existing password                                             | Successfully reached Security. Required constraint now prevents confusing blank-password server feedback.                                                                                   |
| Dashboard                  | Desktop light                                                                                | Placeholder panels have no explanatory text or next action. This is suitable scaffolding, but should become a meaningful empty state before product launch.                                 |
| Profile                    | Desktop light/mobile dark; whitespace-only name                                              | Server rejects blank-after-trimming names; inline error renders. Name/email persisted values were unchanged. Error associations improved.                                                   |
| Delete account             | Desktop confirmation dialog                                                                  | Copy, focus and cancellation checked. No deletion submitted; backend deletion behavior is covered by the existing tests.                                                                    |
| Security / update password | Desktop light/mobile light; empty submission                                                 | Required errors shown and first password field focused. Error associations improved; submit button disables during processing. No credential changed.                                       |
| Passkeys                   | Mobile empty state and naming form                                                           | Form fits, supplies a useful default name, and disables blank-name submission. Hardware registration/sign-in and populated passkey removal were source-reviewed only.                       |
| Two-factor authentication  | Security card visually inspected; setup, code challenge, recovery-code forms source-reviewed | Input accessibility improved. Enrollment, QR scanning, challenge/recovery success, and disabling were not exercised on the account.                                                         |
| Email verification         | Source review and existing backend tests                                                     | Submit button disables during processing. Verified test account does not display the verification screen; resend/delivery not exercised.                                                    |
| Appearance / navigation    | Mobile dark appearance, settings navigation, sidebar and account menu; desktop settings      | Cards and navigation remain consistent. Original System preference restored after inspection.                                                                                               |

## Recommended next improvements

1. **Show password requirements before submission.** Derive friendly help text from the same server policy that supplies `passwordRules`, so production's stronger rules and local rules cannot drift. The browser `passwordrules` attribute does not explain requirements to most users.
2. **Improve error recovery.** Focus the first invalid control after server validation on all forms; clear or revalidate errors when corrected. Profile and registration errors currently remain visible while editing. Put mismatch feedback on Confirm password (or associate it with both fields), using server validation keys rather than parsing translated messages.
3. **Review password-reset-on-error behavior.** Registration clears both passwords even when only email is invalid. Decide whether preserving input for recoverable validation errors is preferable; keep successful submission resets.
4. **Add recovery navigation.** Password reset and password confirmation lack an obvious “Back to log in” or “Back to settings” action. An expired reset link should offer a direct way to request a replacement.
5. **Use specific action labels.** “Save profile,” “Update password,” and “Delete account” are easier to understand out of context than “Save” and “Delete.”
6. **Finish product scaffolding when the product is defined.** Replace dashboard placeholder patterns with a useful empty state and a first action; replace Laravel welcome/branding links with product content. No invented dashboard metrics were added.
7. **Test hardware/email flows separately.** Use a disposable account and authenticator for two-factor setup/recovery, passkey enrollment/removal, verification delivery and password-reset success. A source review or backend test is not a substitute for those browser journeys.

## Verification

- shadcn reports Base UI, `base-nova`, preset `b37ZhrNTs`.
- Frontend formatting/lint, TypeScript and production build pass.
- Composer test command passes: Pint, PHPStan, and 39 tests / 136 assertions.
- No Radix imports or `asChild` usages in application code/package manifest.
- Installer scripts unchanged; Chisel markers preserved.
- Composer install completed. In-place npm install fails in the existing pnpm-style node_modules tree with an Arborist `matches` error; a clean disposable npm install succeeds (486 packages, no reported vulnerabilities). Existing working dependencies were retained.
- No dependency lockfiles or generated source artifacts included in the change.
