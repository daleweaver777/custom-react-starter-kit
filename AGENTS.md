# Repository Instructions

These instructions govern maintenance of this starter-kit source repository, not applications generated from it.

This repository tracks `https://github.com/laravel/react-starter-kit.git` as the `upstream` remote. The customization branch is `main`; keep completed custom work on `main`. The user's own hosted repository should be configured as `origin`.

## Non-negotiable invariants

- Keep Laravel installer compatibility intact. Do not remove or bypass `chisel.php`, `chisel-paths.php`, `composer.json` installer hooks, or the `install:features` command.
- Preserve every `@chisel-<feature>` / `@end-chisel-<feature>` region unless an upstream change intentionally adds, removes, or relocates that feature. Markers can occur in PHP, TypeScript, and JSX comments, including multiple markers on one line.
- The frontend shadcn base is Base UI, not Radix. `npx shadcn@latest info --json` must resolve `base` to `base`, `style` to `base-nova`, and the small-radius preset code to `b37ZhrNTs`.
- Preserve the `FlashToaster` bridge: Laravel flash confirmations use the Base UI `toast` wrapper, while request failures use the top-center `NotificationAlert`. Preserve alert entrance/dismissal animations, countdown bars for timed notifications, pause behavior, and reduced-motion support. Do not restore Sonner or `resources/js/components/ui/sonner.tsx` during an upstream merge.
- Treat `resources/css/app.css` and the matching font setup in `vite.config.ts` as part of the Nova customization. Keep one copy of each Tailwind/shadcn/Inter import, preserve Laravel's `@source` directives, and keep Inter sourced through `@fontsource-variable/inter`; do not restore the upstream Instrument Sans Bunny Fonts configuration alongside it.
- Do not introduce `radix-ui`, `@radix-ui/*`, or Radix-only `asChild` APIs under `resources/js`.
- Do not use `.gitattributes` `merge=ours`, a custom `ours` merge driver, `git checkout --ours resources/js`, or bulk component overwrites. Conflicts are valuable: resolve them by combining upstream behavior with the Base UI/Nova customization.
- Do not commit generated `composer.lock`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `node_modules`, `vendor`, or Wayfinder-generated `resources/js/actions` and `resources/js/routes` unless upstream begins tracking them.

## Focus Styles for New UI Components

Focus uses a compact, solid 2px outline inspired by the [Tailwind Plus form examples](https://tailwindcss.com/plus/ui-blocks/application-ui/forms/form-layouts). After adding or updating a shadcn component, replace Nova's translucent 3px focus rings with the shared `focus-ring` utility in `resources/css/app.css`:

| Element                                                                                                                                                   | Focus classes                                                       | Appearance                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Solid primary buttons, primary interactive badges, and checkboxes (checked or unchecked)                                                                  | `focus-visible:focus-ring focus-visible:[--focus-ring-offset:1px]`  | Solid 2px outline with a minimal 1px gap                                                  |
| Secondary, ghost, link, outline, and tinted destructive buttons; icon close buttons; neutral interactive badges; toggles; sidebar and navigation controls | `focus-visible:focus-ring focus-visible:[--focus-ring-offset:-2px]` | Outline inside the control's edge, with no gap                                            |
| Inputs and textareas                                                                                                                                      | `focus:focus-ring focus:[--focus-ring-offset:-2px]`                 | Inward outline over the existing border, on pointer or keyboard focus                     |
| Select triggers, menu items, and links inside navigation popups                                                                                           | `focus-visible:focus-ring focus-visible:[--focus-ring-offset:-2px]` | Inward outline that fits inside compact, scrollable menus; retain highlighted backgrounds |
| Plain HTML links, buttons, and unstyled triggers                                                                                                          | `focus-visible:focus-ring` (provided by the base layer)             | Flush outline with no gap; follows the element's existing border radius                   |

The shared `Button` wrapper supplies the correct offset for each variant, so dialog, sheet, toast, and other close buttons inherit the inward outline from `variant="ghost"`. The link **button variant** matches ghost buttons; plain text links retain the flush fallback. If adding a solid destructive button variant, give it the same 1px gap as a solid primary button, with destructive focus color.

Keep the outline solid and unblurred; do not reintroduce `focus-visible:ring-3`, `ring-ring/50`, a 2px gap, or a second focus border. The inward outline does not change the control's size or move surrounding content. Avoid `transition-all` and `transition-colors` on these controls: they animate outline geometry or color. Use `transition-[color,background-color,border-color]` instead, adding `box-shadow,transform,translate` when needed.

### Changing shadcn Color Themes

Focus geometry is independent of the color theme. Components read the semantic `--ring` token through `focus-ring`; `--sidebar-ring` follows it. Review **both `--primary` and `--ring` in `:root` and `.dark`** when changing themes, along with the matching `--primary-foreground`. A ring defined as `var(--primary)` follows changes to the primary token; an independently defined ring must be updated separately. Keep palette values in the theme declarations, never in component classes or the focus utility.

`--primary` controls filled actions; `--ring` controls focus outlines. The default indigo theme matches the [Tailwind Plus form layouts](https://tailwindcss.com/plus/ui-blocks/application-ui/forms/form-layouts): **indigo-600** (`oklch(0.511 0.262 276.966)`) in light mode and **indigo-500** (`oklch(0.585 0.233 277.117)`) in dark mode, with white primary text/icons. Both modes use `--ring: var(--primary)`, so focus matches the primary color exactly. Sidebar primary colors follow the same tokens. Keep the separate `--ring` token so future themes can either follow their primary color or supply a different shade from the same color family. There is no automatic lightening or darkening formula.

After applying a shadcn color preset, preserve this focus utility and component offsets, then review the resulting `--ring` values in both modes. Check at least **3:1 contrast** against the surfaces adjacent to the indicator, including card/popover backgrounds and hovered neutral controls; inward outlines need contrast with the inside surface. Check primary text contrast separately. See [shadcn theme tokens](https://ui.shadcn.com/docs/theming) and [WCAG non-text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

The chart palette remains indigo-300, indigo-500, indigo-600, indigo-700, and indigo-800 (`--chart-1` through `--chart-5`) in both modes. Chart colors are independent of the primary action color. When adopting a full palette, review its other semantic tokens, including sidebar and chart colors, against their intended surfaces.

For **destructive variants**, add `[--focus-ring-color:var(--destructive)]` to the variant's classes. For **invalid controls**, use `aria-invalid:border-destructive aria-invalid:[--focus-ring-color:var(--destructive)]`. Keep error borders visible when unfocused, but remove the old `aria-invalid:ring-*` halos. Use the destructive token at full opacity in both themes. A neutral Cancel or Close button stays primary-colored unless its own variant or enclosing error notification supplies destructive focus styling. Verify the destructive token's contrast when changing it too.

For compound controls, draw one outline on the visual boundary: `InputGroup` watches its input's `:focus`, OTP slots use `data-[active=true]:focus-ring data-[active=true]:[--focus-ring-offset:-2px]`, and bordered `FieldLabel` cards watch descendant `:focus-visible`. Forward invalid state to that boundary. Do not outline the inner input as well; addon buttons retain their own keyboard focus indication. Checkboxes use a 1px gap in both checked and unchecked states; inside a bordered field card, the card owns the outline instead.

Custom wrappers that suppress outlines must explicitly apply the utility. Check new components with Tab and arrow keys, including disabled, invalid, destructive, light, dark, and forced-colors states. Preserve native outlines in forced-colors mode; never use `forced-color-adjust: none` for these focus indicators.

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
