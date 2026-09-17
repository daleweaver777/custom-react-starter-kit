# Security and release review

Updated September 17, 2026. Deployment target: **Laravel Cloud Business**. There is no staging URL yet. New rate limits below are for maintainer review; they were deliberately not implemented during cleanup.

## Additional limits to review

Preserve existing login, passkey, password-confirmation, password-update, email-change, and 2FA-login limits. Let Cloud supply the additional aggregate IP protection after its settings are verified. The following application-specific budgets are not established by the documented Cloud controls:

| Existing audit item | Remaining concern                                                                                        | Proposed next decision                                                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F07                 | Repeated 2FA setup-code guesses and sensitive mutations from different IPs for one authenticated account | Choose separate per-user/action budgets for setup confirmation, recovery-code regeneration, and other sensitive mutations                                       |
| F06                 | Reset-token guesses and sustained recovery-email requests targeting an account across IPs                | Choose account/token-attempt and recipient/mail budgets beyond the broker's existing token-creation cooldown; preserve private responses and recovery usability |
| F05                 | Registration/account creation and verification-mail work below or across generic edge limits             | Define the acceptable creation/mail rate, then add the smallest feature-specific control necessary when registration is installed                               |

Business offers configurable IP thresholds and repeated-response protections. Those controls do not identify a Laravel account across changing IPs, and the documented repeated-error rule names 401/403/404 rather than 422/500. This is an inference about coverage boundaries, not a failed test of the user's Cloud deployment. [Cloud rate-limiting documentation](https://laravel.com/cloud/docs/network#rate-limiting).

## Malformed authentication input

The current pre-cleanup application reproduced F11: array-valued login emails and passkey credential IDs returned 500 before request validation. Cleanup makes the existing limiter key construction type-safe so invalid input reaches validation. The five/ten-request budgets are unchanged. Twelve maintainer regression cases cover malformed types, JSON validation, HTML redirects, guest state, and continued consumption of the existing login limit.

The earlier bcrypt/NUL-password finding is historical: the application now defaults to Argon2id. Do not report it as a current reproduced failure. Keep password-policy regression coverage.

## Before release

- [ ] Record the Business environment's enabled WAF/rate-limit settings and selected actions; a subscription alone does not enable or verify every protection.
- [ ] Recheck Host/forwarding handling and actual reset/verification URLs on the final HTTPS domain. Earlier Cloud host checks remain historical evidence, not a test of an unavailable new deployment.
- [ ] Verify normal forms, passkeys, errors, and recovery remain usable under Cloud challenges and throttling.
- [ ] Validate real mail delivery and platform/security-key passkeys over HTTPS; local software-authenticator checks do not certify devices or deliverability.
- [ ] Complete real screen-reader and touch-device checks. Desktop browser engines, emulation, and DOM checks cover only part of accessibility/device behavior.
- [ ] Replace `laravel/framework: 13.x-dev` with a stable minimum containing the login-time session fingerprint fix once released, then rerun the full acceptance suite.

The stable-release check on September 17 found **v13.32.0** as latest. The merged session fix `f50c3ce4e04cf9c321a196ee3eac7effff3c8f50` is three commits after that tag, so cleanup keeps the development constraint rather than regressing session protection. See the [release](https://github.com/laravel/framework/releases/tag/v13.32.0) and [commit comparison](https://github.com/laravel/framework/compare/v13.32.0...f50c3ce4e04cf9c321a196ee3eac7effff3c8f50).

Use [the cleanup tracker](CLEANUP-PLAN.md) for completed checks and [the production audit](../../PRODUCTION-AUDIT-2026-09-14.md) for the original decisions. This file is maintainer-only and must not ship in generated applications.
