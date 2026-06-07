# Rental Order Detail Page Snapshot

## Objective & Hypothesis

Use the system scenario test infrastructure to seed rental order data through the same database and server path as scenario tests, then capture the Rental product Order Detail Page for layout inspection.

## Guardrails Touched

- System scenario infrastructure: temporary visual scenario used `tests/scenario/_infra`.
- Backend test fixtures: PR users, participant slots, rental merchandising, placement, and order creation were created through existing domain/test-kit APIs.
- Frontend route: `/orders/:orderId` was inspected without code changes.

## Verification

- Ran `pnpm exec vitest run --project system-scenario tests/scenario/commerce/rental-order-detail-visual.scenario.test.ts`.
- Result: 1 test file passed, 1 test passed.
- Screenshot: `order-detail-page.png`.
- Layout summary: `layout-summary.json`.
