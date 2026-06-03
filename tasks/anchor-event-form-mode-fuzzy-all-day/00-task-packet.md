# Anchor Event Form Mode Fuzzy All Day

## Objective & Hypothesis

Add an `全天` option to Anchor Event Form Mode fuzzy time selection.

Hypothesis: Form Mode already treats fuzzy time as frontend-only input that expands into concrete recommendation match windows. Adding an all-day fuzzy preset can stay inside the existing frontend time model by expanding one product-local date into `00:00 -> next-day 00:00`, while preserving the backend recommendation contract.

## Guardrails Touched

- `docs/10-prd/behavior/rules-and-invariants.md`: Form Mode fuzzy time product rule.
- `docs/20-product-tdd/cross-unit-contracts.md`: recommendation `timeWindows` contract.
- `apps/frontend/src/domains/event/model/form-mode.ts`: fuzzy time option and time-window expansion.
- `apps/frontend/src/domains/event/model/form-mode.test.ts`: model-level proof for option list and all-day window.

## Verification

- `pnpm test:unit:frontend -- apps/frontend/src/domains/event/model/form-mode.test.ts`: passed, 9 tests.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
