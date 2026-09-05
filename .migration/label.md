# label

2026-09-04 — golden pair via CLI; replaced the Radix label primitive with Nova-styled native labels.

## Changed

- `resources/js/components/ui/label.tsx:6` renders a native `<label>` and retains the public component name. The leftover scan `grep -n "radix-ui\|@radix-ui" resources/js/components/ui/label.tsx` is clean.

## Left alone

- Existing `htmlFor` / control id associations remain unchanged.

## Behavior changes

## Verify by hand

- Click every visible form label and confirm focus or checked state moves to its associated control.
