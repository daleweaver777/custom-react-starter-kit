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

## Official Documentation

Documentation for all Laravel starter kits can be found on the [Laravel website](https://laravel.com/docs/starter-kits).

## Contributing

Thank you for considering contributing to our starter kit! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

All contributions to the Starter Kits from now on should be made through [Maestro](https://github.com/laravel/maestro).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## License

The Laravel + React starter kit is open-sourced software licensed under the MIT license.
