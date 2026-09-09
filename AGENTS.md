# Repository Instructions

This repository tracks `https://github.com/laravel/react-starter-kit.git` as the `upstream` remote. The customization branch is `main`; keep completed custom work on `main`. The user's own hosted repository should be configured as `origin`.

## Non-negotiable invariants

- Keep Laravel installer compatibility intact. Do not remove or bypass `chisel.php`, `chisel-paths.php`, `composer.json` installer hooks, or the `install:features` command.
- Preserve every `@chisel-<feature>` / `@end-chisel-<feature>` region unless an upstream change intentionally adds, removes, or relocates that feature. Markers can occur in PHP, TypeScript, and JSX comments, including multiple markers on one line.
- The frontend shadcn base is Base UI, not Radix. `npx shadcn@latest info --json` must resolve `base` to `base`, `style` to `base-nova`, and the small-radius preset code to `b37ZhrNTs`.
- Keep application notifications on the Base UI `toast` wrapper. Do not restore Sonner or `resources/js/components/ui/sonner.tsx` during an upstream merge.
- Treat `resources/css/app.css` and the matching font setup in `vite.config.ts` as part of the Nova customization. Keep one copy of each Tailwind/shadcn/Inter import, preserve Laravel's `@source` directives, and keep Inter sourced through `@fontsource-variable/inter`; do not restore the upstream Instrument Sans Bunny Fonts configuration alongside it.
- Do not introduce `radix-ui`, `@radix-ui/*`, or Radix-only `asChild` APIs under `resources/js`.
- Do not use `.gitattributes` `merge=ours`, a custom `ours` merge driver, `git checkout --ours resources/js`, or bulk component overwrites. Conflicts are valuable: resolve them by combining upstream behavior with the Base UI/Nova customization.
- Do not commit generated `composer.lock`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `node_modules`, `vendor`, or Wayfinder-generated `resources/js/actions` and `resources/js/routes` unless upstream begins tracking them.

## Upstream sync procedure

1. Confirm the working tree is clean and the current branch is the customization branch.
2. Ensure `upstream` points to Laravel's official React starter kit; fetch it.
3. Create a dated backup branch before merging.
4. Merge `upstream/main` with `--no-ff`. Do not rebase published customization history unless the user explicitly requests it.
5. Resolve non-UI conflicts in favor of upstream unless they overlap a documented local customization.
6. Resolve `resources/js` conflicts manually. Preserve upstream functionality and Chisel regions, then express the result with Base UI primitives and Nova component styling.
7. If upstream adds or materially changes a UI wrapper, use the installed `shadcn` and `migrate-radix-to-base` skills. Run shadcn `info` first. Use component-level `--dry-run` and `--diff`; never use a bulk `--overwrite` on customized files.
8. Update or add `.migration/<component>.md` reports using the migration skill's exact report structure. Keep `.migration/project.md` current.
9. Run all checks below. Do not finish a sync with unresolved conflicts, missing markers, Radix imports, or failing verification.

Enable Git's recorded conflict-resolution reuse locally; this helps repeat resolutions without suppressing new conflicts:

```bash
git config rerere.enabled true
git config rerere.autoupdate true
```

## Required verification

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

The Radix scan must have no output. Review the Chisel diffs rather than assuming any output is wrong: upstream may intentionally evolve its feature boundaries. When validating Chisel itself, use disposable copies and test at least all features retained, no optional features retained, and one mixed selection; Chisel deletes its own script after a successful run.

After dependency-based checks, remove untracked lockfiles and generated Wayfinder artifacts so the starter-kit source continues to match upstream's packaging conventions.
