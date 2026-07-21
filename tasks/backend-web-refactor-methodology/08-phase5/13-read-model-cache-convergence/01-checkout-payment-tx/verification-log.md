# Checkout PaymentTx Cache Convergence Verification

## Result

The source and focused proof satisfy this slice's completion criteria. No
backend, Ride, Placement, Rental, query-key registry, or durable documentation
was changed.

## Verification

| Command / proof | Result | Evidence |
| --- | --- | --- |
| `pnpm exec vitest run --project frontend-unit apps/web/src/domains/payment` | Pass — 5 files, 11 tests | PaymentTx cache seed/reconcile, terminal request counts, stored-hint recovery/retry, and existing Payment helpers. |
| `pnpm check:type:web` | Pass | Query adapter and component integration remain RPC/type correct. |
| `pnpm check:lint:web` | Pass | Oxlint and token checks pass; naming audit remains report-only with two pre-existing Ride component findings. |
| selected Ride Checkout system scenario | Pass — 1 selected, 8 skipped | Existing Bill Detail → Checkout → backend-confirmed payment → Bill Detail behavior remains intact. |
| scoped `git diff --check` | Pass | No whitespace errors in owned paths or this task packet. |

## Request-Count Assertions

The real QueryClient test primes checkout target, Bill Detail, and Order Detail
at one request each.

- With all three projections actively observed, terminal invalidation changes
  counts from `{ target: 1, bill: 1, order: 1 }` to
  `{ target: 2, bill: 2, order: 2 }`: exactly one additional request per active
  projection.
- With no active observers, the same invalidation leaves counts at
  `{ target: 1, bill: 1, order: 1 }` and marks every query invalidated: zero
  eager requests for inactive projections.

The production policy is explicit `refetchType: "active"` invalidation. There
is no following `refetchQueries` pass.

## Authority Inventory

- PaymentTx transport read is private to `domains/payment/queries/usePayment`.
- `PaymentCheckoutFlow` has no local PaymentTx server snapshot and imports no
  raw PaymentTx fetcher.
- query mutation seeding, resume, polling, and retry share
  `queryKeys.payment.tx(paymentTxId)`.
- session storage retains only the opaque bill-line/PaymentTx lookup.

## Remaining Proof Boundary

The focused component test represents reload by mounting a fresh Checkout with
a pre-existing session hint. It proves backend-query failure, retained hint,
visible retry, canonical-cache success, and terminal hint cleanup. It does not
drive a real browser `location.reload` or external redirect-return lifecycle.
That browser-only lifecycle remains an optional higher-cost scenario addition,
not a blocker for this local cache-authority convergence.
