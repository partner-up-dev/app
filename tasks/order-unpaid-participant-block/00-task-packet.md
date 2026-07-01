# Task Packet - Order Unpaid Participant Block

## Objective & Hypothesis

- Objective & Hypothesis: keep order creation blocked when any intended participant still carries an unpaid order obligation, but define that obligation by unsettled `CHARGE` lines alone. Hypothesis: the backend create-order gate should depend only on participant-linked unsettled charge lines, without narrowing the rule by current bill or order status.

## Guardrails Touched

- Typed input: Intent.
- Durable owner: commerce ordering rule at the create-order boundary.
- Backend surfaces:
  - `POST /api/commerce/orders`
  - `BillLineRepository` unpaid-obligation lookup
  - create-order regression scenario coverage
- Frontend surfaces:
  - existing `/order/new` dialog mapping remains unchanged in this slice

## Current Understanding

- The current user-visible requirement is stronger than the previous implementation shortcut.
- `settledAt is null` on a participant `CHARGE` line is the relevant payment fact.
- Filtering further by `bill.status` or `order.status` weakens the requested rule.
- Regression fixtures should not manufacture `CLOSED` bills that still carry unsettled charge lines; use repository-consistent unpaid states instead.

## Verification

- Passed:
  - `pnpm exec vitest run --project backend-scenario apps/backend/tests/commerce/rental-order-persistence.scenario.test.ts -t commerce_create_order_blocks_participant_with_unpaid_order`
  - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts -t commerce_rental_ordering_blocks_participant_with_unpaid_order`
  - `pnpm check:type:backend`
