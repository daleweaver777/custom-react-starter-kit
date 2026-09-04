# Custom Laravel + React Starter Kit

## Introduction

This repository is a customization layer on top of Laravel's official [React starter kit](https://github.com/laravel/react-starter-kit). It keeps Laravel's backend, authentication options, installer hooks, and Chisel feature trimming while replacing the frontend component base with [Base UI](https://base-ui.com) and the shadcn/ui Nova preset.

Inertia allows you to build modern, single-page React applications using classic server-side routing and controllers. This lets you enjoy the frontend power of React combined with the incredible backend productivity of Laravel and lightning-fast Vite compilation.

This starter kit uses React 19, TypeScript, Tailwind CSS 4, Inertia, Base UI, and [shadcn/ui](https://ui.shadcn.com). Its shadcn configuration resolves to `base-nova` and the small-radius preset `b37ZhrNTs`.

## Installing the Starter Kit

Publish the repository as a Composer project on Packagist after changing the `name` field in `composer.json` to your own `<vendor>/<package>` name. It can then be installed through the Laravel installer:

```bash
laravel new my-app --using=<vendor>/<package>
```

The Laravel installer runs the starter kit's `post-create-project` hook, which invokes Chisel. Chisel asks which authentication features to retain, trims marked sections and optional files, regenerates Wayfinder resources, and runs the frontend fixer. Do not remove `chisel.php`, `chisel-paths.php`, the Composer installer metadata, or any `@chisel-*` / `@end-chisel-*` comments from this source repository.

## Syncing Laravel Upstream Manually

The official Laravel repository should be configured as `upstream`; your repository should be `origin`. Keep custom work on `custom/base-ui-nova` (or a branch based on it), then merge Laravel updates so Git performs a three-way merge and reports conflicts instead of silently replacing local UI work.

One-time setup after cloning your own repository:

```bash
git remote add upstream https://github.com/laravel/react-starter-kit.git
git fetch upstream
git config rerere.enabled true
git config rerere.autoupdate true
```

For each sync:

```bash
git switch custom/base-ui-nova
git status --short
git fetch upstream
git branch backup/pre-upstream-sync-YYYY-MM-DD
git merge --no-ff upstream/main
```

Start only from a clean working tree. If the merge conflicts, inspect every conflict with `git diff --name-only --diff-filter=U`. In `resources/js`, retain Laravel's functional changes while keeping Base UI APIs and Nova styles. Never resolve the whole directory with `--ours`, configure an `ours` merge driver, or overwrite all shadcn components; those approaches hide upstream fixes.

Treat `resources/css/app.css` as a customized shadcn theme file during merges. Preserve the Laravel `@source` directives, the single Tailwind/shadcn/Inter import set, and the Nova preset's semantic tokens. Inter is bundled through `@fontsource-variable/inter`, so do not also restore Laravel's upstream Instrument Sans Bunny Fonts configuration in `vite.config.ts`; doing so downloads and emits two font families.

When Laravel adds or changes a shadcn component, use the official `shadcn` and `migrate-radix-to-base` skills. Preview registry changes with `npx shadcn@latest add <component> --dry-run` and `--diff`, then merge the new Base UI implementation into the local wrapper. Migrate consumers from Radix `asChild` to Base UI `render` and record behavior differences in `.migration/<component>.md`.

This customization uses shadcn's Base UI `toast` component for Laravel flash notifications. If upstream changes its notification integration, retain the `FlashToaster` bridge and do not restore Sonner, which is intended for Radix and React Aria shadcn projects.

Before completing the merge, verify the project:

```bash
npx shadcn@latest info --json
rg -n 'radix-ui|@radix-ui|\basChild\b' resources/js package.json
git diff upstream/main -- chisel.php chisel-paths.php
git diff upstream/main -- resources/js | rg '@(end-)?chisel-'
composer install
php artisan wayfinder:generate --with-form --no-interaction
npm install --no-package-lock
npm run check
npm run types:check
npm run build
composer run test
```

The first scan should return no Radix dependencies or legacy `asChild` consumers. `shadcn info` must report `base: "base"`, `style: "base-nova"`, and preset `b37ZhrNTs`. Review every Chisel diff deliberately: upstream may add legitimate markers, but existing paired markers must never disappear accidentally. This source intentionally follows upstream by not committing generated Composer or npm lockfiles.

For the agent-specific version of this workflow, see [AGENTS.md](AGENTS.md).

## Official Documentation

Documentation for all Laravel starter kits can be found on the [Laravel website](https://laravel.com/docs/starter-kits).

## Contributing

Thank you for considering contributing to our starter kit! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

All contributions to the Starter Kits from now on should be made through [Maestro](https://github.com/laravel/maestro).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## License

The Laravel + React starter kit is open-sourced software licensed under the MIT license.
