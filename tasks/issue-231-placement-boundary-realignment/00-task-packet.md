# Issue 231 Placement Boundary Realignment

## Objective & Hypothesis

Objective: realign Placement, PR order linkage, and order creation input around
the agreed target contract.

Hypothesis: the current Button Placement implementation still leaks PR and
Commerce orchestration into Placement resolution. Placement should become a
generic matching and creative module: a page-owned PlacementSlot supplies a
matching context, Placement matches instances by type, and downstream page or
domain orchestration resolves order/navigation consequences.

## Input Classification

- Typed input: `Constraint`.
- Active mode: `Explore` -> `Solidify` -> `Execute`.
- Implementation status: started after the user explicitly said `开始`.
- Source packet: `tasks/issue-231-ecommerce-mvp`.
- Note: user referenced `tasks/issue-321-ecommerce-mvp`, but the existing task
  packet is `tasks/issue-231-ecommerce-mvp`.

## Guardrails Touched

- Durable contract candidate:
  - `docs/20-product-tdd/ecommerce-contracts.md`
  - `docs/20-product-tdd/cross-unit-contracts.md`
- Backend:
  - `apps/backend/src/domains/merchandising/**`
  - `apps/backend/src/controllers/commerce.controller.ts`
  - future Placement-owned controller under `/api/placements`
  - PR order attachment model currently represented by `pr_attached_orders`
- Frontend:
  - `apps/frontend/src/pages/PRPage.vue`
  - current `PRCommercePlacementAction`
  - future generic `ButtonPlacement` / `PlacementSlot` component boundary
  - commerce queries currently under `useCommercePlacement`
- Verification:
  - backend Placement unit tests
  - backend commerce / ride-hailing scenario tests
  - PR Page frontend unit tests
  - browser system scenarios for Rental and RideHailing placement entry

## Packet Index

- Current state and contradictions: `10-current-state.md`
- Proposed target contract: `20-target-contract.md`
- Placement key models: `30-placement-models.md`
- Open questions: `40-open-questions.md`
- Ordering input realignment: `50-ordering-input-realignment.md`
- Target sequence diagram: `60-target-sequence.md`
- Implementation steps: `70-implementation-steps.md`
- Discussion log: `90-discussion-log.md`

## Current Agreement Draft

- `PRCommercePlacementAction` is a misleading name because the UI unit should
  be a generic Button Placement renderer mounted by PR Page.
- Placement matching should not be PR-specific. PR Page should build and supply
  `matchingContext = PR Detail`.
- Placement API should move out of `/api/commerce/placements` into
  `/api/placements`.
- `resolveCommercePlacementForPr` is the wrong boundary. The preferred shape is
  `matchPlacementInstance(type, matchingContext) -> placements`.
- `context` / `contextType` query semantics should be removed in favor of a
  supplied `matchingContext`.
- Placement should not return a click target. The click path should resolve
  downstream order/navigation consequences separately.
- `slotKey` and `contextType` should be removed from the entire Placement
  domain, not only from one PR Page API.
- `pr_attached_orders` will be removed. Target state: PR owns `orders uuid[]`.
- Button Placement creative should be only `{ ctaLabel, description? }`.
- Placement binding resolution should use `POST /api/placements/:instanceId/bindings`,
  not `GET` with a body.
- `trade_orders` should add top-level `offerId`. The current
  `offerSnapshot` blob is unnecessary as an identity container because concrete
  price, item, cancellation, and order facts should be snapshotted in their own
  order-owned fields.
- Ordering route should become `/order/new`, aligned with `/pr/new`.
- Ordering input should not carry PR context, Placement context type, or
  Placement matching context.
- Bindings only prefill and lock `items` / `productTypedExtraProperties` in the
  frontend; bindings are not submitted as command input.
- Target command shape is
  `{ offerId, prId?, items, productTypedExtraProperties }`.
- `ButtonPlacement` does not know `prId`; PR Page owns PR-specific order lookup
  and route transition.
- Order Content receives no `prId`; it exposes
  `items + productTypedExtraProperties`.
- The page-level BottomActionBar owns create-order submission.

## Non-Goals

- Do not rename the broader `/api/commerce/orders/*`, payment, bill, and order
  detail lifecycle routes in this slice.
- Do not introduce an opaque entry attribution payload.
- Do not pass `prId` into Order Content.

## Verification

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/frontend exec vue-tsc --noEmit`
- `pnpm lint:backend`
- `pnpm db:lint`
- `pnpm test:unit:backend`
- `pnpm test:unit:frontend -- apps/frontend/src/pages/PRPage.creator-actions.test.ts`
- `pnpm test:scenario:backend -- apps/backend/tests/commerce/rental-order-persistence.scenario.test.ts apps/backend/tests/ride-hailing/ride-hailing-order-foundation.scenario.test.ts`
- `pnpm test:scenario:system -- tests/scenario/commerce/rental-ordering.scenario.test.ts tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
- `pnpm build:backend`
- `pnpm build:frontend`
