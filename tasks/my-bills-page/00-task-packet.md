## Objective & Hypothesis

- Add a viewer-scoped `/bills` page whose primary entry is the unpaid-order block dialog on `/order/new`.
- Reuse the existing `BillCard` component as-is.
- Keep the new viewer bill-list API intentionally narrow: it returns only ordered `billId[]`.
- Tighten unpaid-order blocking so it only considers positive, unsettled, still-payable charge obligations.
- Treat zero-amount charge bills as already paid, including historical backfill.

## Guardrails Touched

- Backend read path: add a Bill domain use-case and commerce route for viewer bill ids.
- Frontend route path: add `/bills` and keep `/bills/:billId` detail flow unchanged.
- Ordering recovery: unpaid-order dialog confirm action now routes to `/bills`.
- UI reuse rule: page reuses existing `BillCard` instead of inventing a parallel bill summary surface.

## Current Understanding

- The unpaid-order block can be caused by any intended participant, not only the current viewer.
- A viewer-scoped bill list therefore cannot guarantee that the blocking bill is visible to the current viewer.
- The page should make that limitation explicit when entered from the ordering-blocked dialog.
- The current backend only checks `CHARGE + settledAt is null`, so expired unpaid windows and zero-amount charge lines are falsely treated as blocking obligations.
- `createPaymentCharge` currently checks the unpaid window too late, after it may already open a provider execution slot.

## Verification

- Backend scenario: viewer bill list returns only the current viewer's bill ids.
- Backend scenario: unauthenticated `/api/commerce/bills` returns `AUTHENTICATED_REQUIRED`.
- System scenario: unpaid-order dialog CTA reaches `/bills`, and the user can continue into bill detail.
- Backend scenario: expired unpaid rental bills no longer block create-order.
- Backend scenario: zero-amount unpaid rental bills are treated as paid for order blocking and bill detail settlement.
- Backend scenario: expired bill detail no longer exposes a payable line.
- Static checks: targeted backend typecheck and frontend build.
