# Button Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/actions/Button.vue`.
- Package target: `PuButton`.
- Desired final state: package owns command button rendering while local API
  either disappears or remains only as a compatibility facade during rollout.

## Current Contract

- Props: `type`, `form`, `variant`, `appearance`, `tone`, `size`, `loading`,
  `disabled`, `block`, `fullWidth`.
- Slots: default, `leading`, `trailing`.
- Event: `click`.
- Current references: highest blast radius shared primitive.

## Migration Shape

- From: local `appearance` plus mixed `tone` treatment vocabulary.
- To: package `shape`, semantic `tone`, visual `variant`, `size`, `loading`,
  `feedback`, `block`, and structured `action`.
- Compatibility strategy: first implement an internal mapping while preserving
  local props and attrs; only later migrate call sites to package vocabulary.

## Proposed Mapping

- `appearance="pill"` -> `shape="pill"`; `appearance="rect"` ->
  `shape="rect"`.
- `tone="primary"` -> `tone="primary" variant="solid"`.
- `tone="primary-outline"` -> `tone="primary" variant="outline"`.
- `tone="secondary"` -> map per current visual treatment after checking rect
  versus pill usages.
- `tone="outline"` -> `tone="neutral" variant="outline"`.
- `tone="surface"` -> likely `tone="neutral" variant="soft"`.
- `tone="tertiary"` -> `tone="tertiary" variant="solid"`.
- `tone="dashed"` -> `tone="neutral" variant="dashed"`.
- `tone="danger"` -> `tone="danger" variant="outline"` unless a solid danger
  call site is explicitly intended.
- `tone="ghost"` -> `tone="neutral" variant="ghost"`.
- `loading` -> package `loading`.
- `type` -> package `action={{ native: type }}` if needed.

## Risks

- `data-testid` and attrs must remain on the real interactive element.
- Existing CSS reaches into `.ui-button` and `.ui-button__label`; those
  dependencies must be mapped or removed in the same slice.
- Button is broad enough that a visual diff or staged PR is warranted.

## Verification

- Build, token lint, full frontend unit tests.
- Targeted PR action tests.
- Browser smoke on PR detail, Anchor Event, Me, Admin PR, Commerce checkout,
  and ordering support surfaces.
