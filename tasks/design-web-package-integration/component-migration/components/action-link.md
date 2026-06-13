# ActionLink Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/actions/ActionLink.vue`.
- Package target: `PuButton` with structured `action`.
- Desired final state: link-styled calls to action use the same package action
  component vocabulary as buttons.

## Current Contract

- Props: `to`, `href`, `target`, `rel`, `external`, `appearance`, `tone`,
  `size`, `disabled`, `block`, `fullWidth`.
- Slots: default, `leading`, `trailing`.
- Event: `click`.

## Migration Shape

- From: local `RouterLink` or native anchor selection.
- To: `PuButton` `action` prop with `to` or `href` payload.
- Compatibility strategy: no local wrapper. Replace usage sites directly with
  `PuButton` and delete `ActionLink.vue` after call sites clear.

## Selected Mapping

- Route links: `:action="{ to: routeTarget }"`.
- External or href links: `:action="{ href, external, target, rel }"`.
- `appearance="pill"` -> `shape="pill"`; otherwise use `shape="rect"` because
  package default is not the old action-link geometry.
- Local action-link tones map to package tone + variant:
  - `primary` -> `tone="primary" variant="solid"`
  - `primary-outline` -> `tone="primary" variant="outline"`
  - `secondary` -> `tone="secondary" variant="solid"`
  - `outline` -> `tone="neutral" variant="outline"`
  - `surface` -> `tone="neutral" variant="soft"`
  - `tertiary` -> `tone="tertiary" variant="solid"`
  - `dashed` -> `tone="neutral" variant="dashed"`
  - `danger` -> `tone="danger" variant="outline"`
  - `ghost` -> `tone="neutral" variant="ghost"`
- Some current `ActionLink` usage sites pass `variant="outline"`, but the
  local component does not define a `variant` prop. During direct migration,
  treat this as author intent and map it to real `PuButton variant="outline"`
  instead of preserving the ineffective DOM attribute.

## Risks

- Route actions rely on the consuming app's registered `RouterLink`.
- Disabled link navigation must remain blocked.
- External target/rel defaults must remain safe.
- `PuButton` is still an action control; do not use it for plain inline text
  links.

## Verification

- Passed: frontend build, token lint, frontend unit tests, source reference
  scan, old-prop vocabulary scan, and `git diff --check`.
