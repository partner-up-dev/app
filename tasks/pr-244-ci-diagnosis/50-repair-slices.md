# Repair Slices

This file records repair slices. Implementation started only after explicit approval and is now complete; see `60-repair-results.md` for the final outcome.

## Slice 1 - Frontend Token Gate

Address:

- `apps/frontend/src/shared/ui/forms/MultiStopToggle.vue`
- `apps/frontend/src/domains/commerce/ui/ButtonPlacement.vue`
- Potentially `apps/frontend/scripts/check-token-governance.mjs`

State diff:

- From `MultiStopToggle.vue` internal geometry outside the component contract allowlist and an undefined sys color token.
- To `MultiStopToggle.vue` as an explicit primitive contract, plus a defined semantic color token in `ButtonPlacement.vue`.

Verification:

- `pnpm --filter @partner-up-dev/frontend lint:tokens:strict`

## Slice 2 - Backend Anchor Event Recommendation Scenarios

Address:

- `apps/backend/tests/anchor-event/anchor-event-recommendation-participation.scenario.test.ts`
- `apps/backend/tests/anchor-event/anchor-event-route-pool.scenario.test.ts`

State diff:

- From hybrid `{ place, startAt }` payloads.
- To current `{ place, timeWindows }` payloads, unless compatibility for `{ place, startAt }` is approved.

Verification:

- Focused backend scenario tests above.
- Full `pnpm test:scenario:backend`.

## Slice 3 - Trade Scenario Foundation Contract

Address:

- `apps/backend/tests/commerce/rental-order-persistence.scenario.test.ts`
- `apps/backend/tests/ride-hailing/ride-hailing-order-foundation.scenario.test.ts`
- Potentially `apps/backend/src/domains/trade/use-cases/*` and trade barrel exports.

State diff:

- From tests importing removed runtime helpers.
- To either restored intentional foundation helpers or migrated tests using the current public order command.

Invariant:

- Ride-hailing foundation persistence tests should not accidentally become provider side-effect tests unless explicitly intended.

Verification:

- Focused backend trade scenario tests.
- Full `pnpm test:scenario:backend`.

## Slice 4 - System Scenario UI Contracts

Address:

- Form-mode time control test IDs.
- Rental non-creator availability notice assertion.
- Ride-hailing quote/evaluation gating.
- Join success subscription action CI env/test affordance.

State diff:

- From scenario expectations tied to old IDs/copy, incomplete UI state, or local-only env.
- To stable semantic test IDs, scenario steps aligned with current product contracts, and deterministic CI mock env.

Verification:

- Focused system scenario files.
- Full `pnpm test:scenario:system`.

## Suggested Order

1. Frontend token gate, because it is mechanical and blocks frontend-gate independently.
2. Backend Anchor Event payload tests, because the schema mismatch is clear and low-risk.
3. Trade foundation contract, because it needs an owner decision.
4. System scenario UI contracts, because they cross frontend/backend behavior and may reveal product decisions.
