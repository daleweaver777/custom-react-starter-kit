# Laravel + React Starter Kit

Laravel 13, React 19, TypeScript, Inertia 3, and Tailwind CSS 4, with shadcn/ui on Base UI, Nova styling, and Inter.

Registration and account email verification are optional during installation. Password reset, two-factor authentication, passkeys, and password confirmation are included in every installation. Changing an email address always requires verification of the new address.

## Requirements

- PHP 8.3 or later in the PHP 8 series, Composer 2, and the extensions required by your database and Composer dependencies.
- Node.js 22.18+ in the Node 22 series, or Node.js 24.11+, with npm.
- SQLite for local development, or a configured database supported by Laravel.

## Install and run

Create an application using the Laravel installer:

```bash
laravel new my-app --using=daleweaver777/custom-react-starter-kit
cd my-app
composer run dev
```

Open the address printed by the server, normally [localhost:8000](http://localhost:8000). The development command starts Laravel, the queue listener, Vite, and the log viewer when supported. If Herd already serves Laravel, use `npm run dev` for the frontend alone.

For a fresh clone of an **installed application** in a new local environment:

```bash
composer run setup
composer run dev
```

Configure `.env` first if you need a different database. `setup` installs dependencies, creates `.env` when missing, generates an application key, migrates, and builds assets. Run it only for a new environment: it replaces `APP_KEY`. For existing environments, install dependencies and run migrations/builds individually.

## Configuration

Start with `.env.example`:

- Set `APP_NAME` and the canonical `APP_URL`.
- Configure your database; sessions, cache, and queues use it by default. Run `php artisan migrate` after database changes.
- Configure a mail provider for verification, email changes, and password recovery. The default `MAIL_MAILER=log` writes messages to `storage/logs/laravel.log` instead of sending them.

Sensitive account actions require recent password or passkey confirmation. `AUTH_PASSWORD_TIMEOUT` controls its duration in seconds (default 300). Password changes always require the current password. An email change leaves the existing sign-in/recovery address active until the new address is confirmed.

Pages live in `resources/js/pages`, shared components in `resources/js/components`, and themes/focus styles in `resources/css/app.css`. Backend routes live in `routes` and application code in `app`.

## Tests and builds

```bash
php artisan wayfinder:generate --with-form --no-interaction
npm run build
composer run ci:check
```

Wayfinder also generates route helpers during development and builds. `ci:check` runs frontend formatting/lint, TypeScript, PHP formatting/static analysis, and application tests. PHP tests use an in-memory SQLite database. Use `php artisan test` for tests alone, `npm run check:fix` to format frontend code, and `composer run lint` to format PHP.

## Server-side rendering and deployment

Build both client and server assets:

```bash
npm run build:ssr
```

On Laravel Cloud, enable **Use Inertia SSR** on the App compute cluster and use `npm run build:ssr` in the build commands. Cloud manages the SSR process. See [Cloud's Inertia SSR setup](https://laravel.com/cloud/docs/compute#inertia-ssr).

For a local production-build check, run `php artisan inertia:start-ssr` in a separate terminal. Check the worker with `php artisan inertia:check-ssr`. Set `INERTIA_SSR_ENABLED=false` for deliberate client rendering; `INERTIA_SSR_URL` defaults to `http://127.0.0.1:13714`.

Deploy with `APP_ENV=production`, `APP_DEBUG=false`, a canonical HTTPS `APP_URL`, working mail, and a persistent database. Preserve your application key and commit the installed application's dependency lockfiles. Follow [Cloud's deployment configuration](https://laravel.com/cloud/docs/environments#build-and-deploy-commands) and verify enabled [edge protections](https://laravel.com/cloud/docs/network#rate-limiting), your final domain, and actual recovery-email links before launch.
