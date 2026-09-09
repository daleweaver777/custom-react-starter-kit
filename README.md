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

The official Laravel repository should be configured as `upstream`; your repository should be `origin`. Keep completed custom work on `main`, then merge Laravel updates so Git performs a three-way merge and reports conflicts instead of silently replacing local UI work.

One-time setup after cloning your own repository:

```bash
git remote add upstream https://github.com/laravel/react-starter-kit.git
git fetch upstream
git config rerere.enabled true
git config rerere.autoupdate true
```

For each sync:

```bash
git switch main
git status --short
git fetch upstream
git branch backup/pre-upstream-sync-YYYY-MM-DD
git merge --no-ff upstream/main
```

Start only from a clean working tree. If the merge conflicts, inspect every conflict with `git diff --name-only --diff-filter=U`. In `resources/js`, retain Laravel's functional changes while keeping Base UI APIs and Nova styles. Never resolve the whole directory with `--ours`, configure an `ours` merge driver, or overwrite all shadcn components; those approaches hide upstream fixes.

Treat `resources/css/app.css` as a customized shadcn theme file during merges. Preserve the Laravel `@source` directives, the single Tailwind/shadcn/Inter import set, and the Nova preset's semantic tokens. Inter is bundled through `@fontsource-variable/inter`, so do not also restore Laravel's upstream Instrument Sans Bunny Fonts configuration in `vite.config.ts`; doing so downloads and emits two font families.

When Laravel adds or changes a shadcn component, preview registry changes with `npx shadcn@latest add <component> --dry-run` and `--diff`, then merge the new Base UI implementation into the local wrapper. Adapt consumers to the matching Base UI APIs.

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

## Focus Styling and Color Themes

The customized UI uses compact, solid 2px focus outlines inspired by the [Tailwind Plus form examples](https://tailwindcss.com/plus/ui-blocks/application-ui/forms/form-layouts). Shared controls use consistent offsets, including inward outlines for most controls and a small gap around solid primary buttons and checkboxes.

Focus colors follow the semantic theme tokens in `resources/css/app.css`. The default indigo theme uses indigo-600 in light mode and indigo-500 in dark mode, with white primary text and matching focus colors. Focus geometry stays consistent when changing color themes.

For component-specific focus classes, theme maintenance rules, and accessibility verification, see [Focus Styles for New UI Components in AGENTS.md](AGENTS.md#focus-styles-for-new-ui-components).
