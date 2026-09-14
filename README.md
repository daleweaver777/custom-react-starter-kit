# Laravel + React Application

A Laravel 13 application with React 19, TypeScript, Inertia 3, and Tailwind CSS 4. The interface uses shadcn/ui components built on Base UI, the Nova style, and a bundled Inter font.

## Requirements

- PHP 8.3 or later in the PHP 8 series, with the extensions required by Composer and your database driver.
- Composer 2.
- Node.js 22.18 or later in the Node 22 series, or Node.js 24.11 or later, with npm. These versions satisfy the project's Vite and Vite Plus requirements.
- SQLite for the default database, or a configured MySQL, MariaDB, or PostgreSQL database.

## Getting Started

Run commands from the application directory.

If the Laravel installer has already installed dependencies and configured the database, start development with:

```bash
composer run dev
```

Open the address printed by the server, normally [http://localhost:8000](http://localhost:8000).

For a fresh clone of an installed application with a new local environment:

```bash
composer run setup
composer run dev
```

`setup` installs PHP and JavaScript dependencies, creates `.env` if it is missing, generates an application key, runs database migrations, and builds frontend assets. Configure `.env` before running it if you want a database other than the default SQLite database. This command generates a new `APP_KEY` each time, so use the individual dependency, migration, and build commands when updating an existing environment.

## Configuration

The starting configuration is in `.env.example`:

- `APP_NAME` and `APP_URL` identify the application and its local URL.
- `DB_CONNECTION=sqlite` uses `database/database.sqlite` by default. Configure the database connection variables when using another database.
- Sessions, cache, and queues use the database by default, so run migrations before using them.
- `MAIL_MAILER=log` writes mail to the application log instead of delivering it. Configure a mail provider to send password-reset or verification emails.

Authentication includes login and password reset. Registration, email verification, two-factor authentication, passkeys, and password confirmation depend on the options retained during installation.

Changing a password signs out other browser sessions and revokes their remembered logins. The browser making the change stays signed in with a new session ID and CSRF token. Resetting a forgotten password requires all browsers to sign in again. Revoked sessions are rejected on their next request; this works with any session storage driver.

## Development

`composer run dev` starts the Laravel development server, queue listener, and frontend development server. It also starts the Pail log viewer when the PHP `pcntl` extension is available.

If Laravel is already served by a local tool such as Herd, you can run only the frontend development server:

```bash
npm run dev
```

Build production frontend assets with:

```bash
npm run build
```

The Wayfinder plugin generates TypeScript route and controller helpers during frontend development and builds. To generate them explicitly, including before a standalone TypeScript check on a fresh checkout:

```bash
php artisan wayfinder:generate --with-form --no-interaction
```

## Project Structure

| Location                   | Purpose                                                 |
| -------------------------- | ------------------------------------------------------- |
| `app/`                     | Controllers, requests, models, and application services |
| `routes/`                  | Laravel routes                                          |
| `resources/js/pages/`      | Inertia page components                                 |
| `resources/js/components/` | Shared application and UI components                    |
| `resources/js/layouts/`    | Page layouts                                            |
| `resources/css/app.css`    | Tailwind setup, theme tokens, and shared focus styles   |
| `tests/`                   | PHP unit and feature tests                              |

## Interface and Notifications

Edit the semantic color tokens in `resources/css/app.css` to customize the light and dark themes. Shared controls use solid 2px focus outlines. Component implementations live in `resources/js/components/ui/`.

Application confirmations use the Laravel flash-to-toast integration. Inertia request failures appear as persistent alerts at the top of the page; expired-session alerts include a Refresh action. Field validation errors remain beside their inputs. Timed notifications display a countdown bar that pauses during hover or keyboard focus.

## Checks

With dependencies installed and Wayfinder helpers generated:

| Command                    | Purpose                                                                          |
| -------------------------- | -------------------------------------------------------------------------------- |
| `npm run check`            | Check frontend formatting and lint rules                                         |
| `npm run check:fix`        | Apply frontend formatting and lint fixes                                         |
| `npm run types:check`      | Check TypeScript types                                                           |
| `composer run lint`        | Format PHP with Pint                                                             |
| `composer run types:check` | Run PHPStan with Larastan                                                        |
| `composer run test`        | Clear the configuration cache, check PHP formatting and types, and run PHP tests |
| `composer run ci:check`    | Run frontend checks, TypeScript checks, and the PHP check/test suite             |

The default PHP test configuration uses an in-memory SQLite database. Run `npm run build` separately to verify the production frontend build.
