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
- Compatibility strategy: preserve local API and event behavior while package
  owns visual/action rendering.

## Risks

- Route actions rely on the consuming app's registered `RouterLink`.
- Disabled link navigation must remain blocked.
- External target/rel defaults must remain safe.

## Verification

- Build, token lint, frontend unit tests.
- Navigation smoke for affected CTAs.
