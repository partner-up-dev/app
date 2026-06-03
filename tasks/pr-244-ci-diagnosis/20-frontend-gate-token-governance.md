# Frontend Gate - Token Governance

## Failing Command

`pnpm --filter @partner-up-dev/frontend lint:tokens:strict`

The strict token check reports 5 findings outside baseline.

## Findings

| Rule | File | Line | Evidence | Cause |
| --- | --- | --- | --- | --- |
| `no-hardcoded-padding` | `apps/frontend/src/shared/ui/forms/MultiStopToggle.vue` | 146 | `--multi-stop-toggle-track-padding: 0.2rem;` | Shared UI primitive has internal geometry values, but token governance only allowlists `ToggleSwitch.vue` as a component contract. |
| `no-hardcoded-padding` | `apps/frontend/src/shared/ui/forms/MultiStopToggle.vue` | 184 | `--multi-stop-toggle-track-padding: 0.18rem;` | Same primitive size variant is outside the component contract allowlist. |
| `no-hardcoded-padding` | `apps/frontend/src/shared/ui/forms/MultiStopToggle.vue` | 190 | `--multi-stop-toggle-track-padding: 0.2rem;` | Same primitive size variant is outside the component contract allowlist. |
| `undefined-sys-color-token` | `apps/frontend/src/domains/commerce/ui/ButtonPlacement.vue` | 52 | `color: var(--sys-color-text-secondary);` | `--sys-color-text-secondary` is not defined in light or dark sys color maps. |
| `undefined-sys-color-token` | `apps/frontend/src/domains/commerce/ui/ButtonPlacement.vue` | 52 | same declaration | Same undefined token is checked against both color maps. |

## Diagnosis

This is a real frontend guardrail failure, not a flaky lint run.

`MultiStopToggle.vue` is a shared UI primitive with toggle-internal geometry. The token checker already has a `componentContractPaths` allowlist in `apps/frontend/scripts/check-token-governance.mjs`, currently containing `ToggleSwitch.vue` but not `MultiStopToggle.vue`. If these values are part of the primitive contract, the cleaner repair is to add `MultiStopToggle.vue` to that allowlist. Converting the values to sys spacing tokens is possible, but may weaken the fine-grained thumb/track geometry.

`ButtonPlacement.vue` uses an invented semantic color name. The local sys token family already uses names like `--sys-color-on-surface-variant`; the undefined token should be replaced by an existing semantic sys color unless a durable token addition is intentionally needed.

## Verification Boundary

- Re-run `pnpm --filter @partner-up-dev/frontend lint:tokens:strict`.
- If token maps or governance baseline change, run the normal frontend lint/build path as well.
