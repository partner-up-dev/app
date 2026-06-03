# Ordering Content / Command Realignment Packet

Date: 2026-06-01

## Purpose

Track the cross-file redesign discussion for Ordering Content, Ordering
evaluation, and Order creation ownership across Rental and RideHailing.

This packet exists because the desired change crosses frontend page topology,
backend API contracts, Trade order creation, Product typed order creation, PR
attachment, and the existing Placement/Ordering realignment work. It should stay
as a poly-file packet while the design is still moving.

## Objective & Hypothesis

Objective:

- Fix Ordering so product-specific Ordering Content is a frontend assembly
  contract, not a backend read/evaluate/create domain tied to Placement or PR.
- Make the page-level Ordering flow own evaluation and submission through a
  generic CreateOrder command shape.
- Move order creation orchestration to Order/Trade, with product-typed order
  creation as a subordinate step.

Hypothesis:

- Ordering Content can be made product-family-polymorphic if every concrete
  content component receives an expanded Offer Detail projection plus
  `bindings` and `source.offerId`, then emits order participants, `items`, and
  `productTypedExtraProperties`.
- Rental and RideHailing Content should independently fetch and compose their
  own product data, such as Offer detail, SPU/SKU, provider quote input, and
  pricing preview dependencies.
- Evaluation should use the same command shape as CreateOrder, so the
  BottomActionBar can ask `evaluateOrdering(command)` and display price detail,
  availability, and disabled reasons.
- CreateOrder should orchestrate `trade_orders`, family typed order records, and
  optional PR attachment atomically. The product-typed order path should not be
  the coordinator that calls back upward into Trade or PR.
- `offerId` should be treated only as a commercial source reference. It is not
  the Ordering Content data contract by itself.
- PR participants and order participants are distinct. PR participants can be
  one source for order participants, but frontend order participants are the
  command's participant authority at the Ordering boundary.

## Guardrails Touched

- `docs/20-product-tdd/ecommerce-contracts.md`
- `tasks/issue-231-placement-boundary-realignment/50-ordering-input-realignment.md`
- `tasks/order-bill-fulfillment-realignment/00-task-packet.md`
- `tasks/issue-231-ecommerce-mvp/phase5-ride-hailing/20-ordering-order-topology.md`
- `apps/frontend/src/pages/OrderingFromPlacementPage.vue`
- `apps/frontend/src/domains/commerce/queries/useCommerce.ts`
- `apps/backend/src/controllers/commerce.controller.ts`
- `apps/backend/src/domains/trade/use-cases/rental-ordering-flow.ts`
- `apps/backend/src/domains/trade/use-cases/ride-hailing-ordering-flow.ts`
- `apps/backend/src/domains/trade/use-cases/create-rental-order.ts`
- `apps/backend/src/domains/trade/use-cases/create-ride-hailing-order-foundation.ts`
- PR attachment authority under `apps/backend/src/domains/pr-core/`

## Packet Map

- `10-current-problem.md`
  - Current coupling and why the existing Rental/RideHailing Ordering APIs are
    structurally wrong under the new target.
- `15-current-contract.md`
  - Descriptive contract of the current implemented frontend/backend API and
    ownership shape before redesign.
- `18-current-baseline-confirmation.md`
  - Final code-read baseline confirmation against the current dirty worktree.
- `20-target-contract.md`
  - First target contract for Ordering Content, OrderingPage, evaluation, and
    CreateOrder.
- `25-target-contract-product-check.md`
  - Product-design consistency check against issue-231 product journey/scenario
    docs, excluding technical design authority.
- `30-impact-map.md`
  - Expected blast radius by owner and file family.
- `40-open-questions.md`
  - Decisions that still need discussion before implementation.
- `60-modification-plan.md`
  - Reviewable implementation sequence for the target topology.
- `90-discussion-log.md`
  - Chronological discussion updates and corrections.

## Current Status

- Implementation completed on 2026-06-01.
- Delivered topology:
  - Placement resolves and stores expanded `OrderingEntryPayload`;
  - frontend `/order/new` no longer calls `ordering/from-placement`;
  - Rental and RideHailing Content components receive only
    `{ source, offerDetail, bindings }` and emit `OrderingContentOutput`;
  - OrderingPage owns command construction, generic evaluation, BottomActionBar,
    and create submission;
  - backend exposes generic `POST /api/commerce/ordering/evaluate`;
  - backend exposes generic `POST /api/commerce/orders`;
  - Trade order base create flow owns base order creation and optional PR
    attachment before dispatching serial Rental/RideHailing typed steps.
- Sub-agent review ran after the initial implementation. Findings were fixed:
  - RideHailing provider initiation no longer leaves a committed partial local
    order on provider failure;
  - Placement ordering-entry no longer returns PR-derived participant defaults
    unless the current viewer is an active PR participant;
  - frontend product-specific content state was extracted from
    `OrderingFromPlacementPage.vue`;
  - legacy public family-specific ordering APIs and use cases were removed from
    the primary codepath.
- Final sub-agent review ran after cleanup. Follow-up fixes were applied:
  - deleted legacy family create helper use cases that still directly created
    base `trade_orders`;
  - RideHailing quote failures now return non-selectable quote options so
    generic evaluation can produce action-preflight-shaped denial instead of a
    transport error;
  - RideHailing provider create now attempts best-effort provider cancellation
    if local persistence fails after provider order creation;
  - durable docs now match the persisted `providerOrderId` implementation.
- Retired compatibility paths:
  - `GET /api/commerce/ordering/from-placement`;
  - family-specific evaluate/create routes;
  - old `get*OrderingFromPlacement`, `evaluate*Ordering`, and
    `create*OrderCommand` product-specific ordering-flow use cases.

## Verification

Completed:

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm lint:backend`
- `pnpm test:unit:backend`
- legacy API/use-case name search has no hits in `apps/backend/src` or
  `apps/frontend/src`
- `git diff --check`

Remaining risk / follow-up verification:

- Add backend contract tests for generic `evaluateOrdering(command)`.
- Add backend scenario tests for generic `createOrder(command)` with and without
  `prId`.
- Add focused rollback tests proving PR attachment failure leaves no partial
  base or typed order.
- Add frontend tests or scenarios proving Ordering Content does not submit or
  own evaluation.
- Run Rental and RideHailing user journey scenario coverage after API migration.
