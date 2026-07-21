# 5-3 Bill–Payment Checkout Integration Audit — 2026-07-20

## Scope

Read-only audit of the current uncommitted 5-3 source, durable D2 contract,
focused proof, and the confirmed future Web read-model findings. No source or
durable documentation was changed by this audit.

## Verdict

The current source realizes the bounded D2 vertical: Bill owns the exact
payment-execution tuple, Payment observes provider state, stale attempts cannot
settle a newer attempt, and Checkout treats a browser return as a prompt to ask
the backend rather than as settlement truth.

The packet's completion evidence is nevertheless stronger than the tests that
currently exist. Before 5-3 is treated as fully evidenced, add direct proof for
the callback/poll race and component-level proof for same-session reload/error
recovery. The already-confirmed PaymentTx cache-authority conflict can remain a
future read-model tranche, provided 5-3 is described as a bounded D2/owner-cut
vertical rather than final Web server-state SSoT closure.

## Contract And Ownership Audit

| Claim | Result | Evidence / qualification |
| --- | --- | --- |
| Bill owns the execution slot | Pass | Checkout charge, provider reconciliation, and notification paths call Bill category commands/queries; exact CAS includes `billLineId`, `paymentProviderInstanceId`, and `attemptCount`. |
| Payment owns provider observation | Pass | Payment retains provider codec/prepay/query/notification handling and translates observations into Bill commands. |
| Trade is reached through a curated category command | Pass | Payment settlement consequence calls `trade/commands`; Bill checkout target obtains order facts through a Trade query. |
| Old attempt cannot settle a newer attempt | Pass | Focused backend scenario opens attempt 2, receives an old-attempt success, observes `STALE`, and keeps attempt 2 unsettled. |
| Browser/client result is not settlement truth | Pass | Checkout always fetches backend `PaymentTx` state; only backend `SUCCEEDED` selects the successful Bill return. |
| Browser persistence is only an opaque same-session hint | Pass, bounded | Session storage contains the lookup tuple, not a trusted payment status. Cross-device recovery is intentionally not claimed. |
| Callback/poll competition invokes at most one immediate consequence | Source supports the invariant; direct proof missing | Atomic Bill settlement means only the winning `SETTLED` result invokes the synchronous consequence. The named backend focused scenario exercises polling and a direct stale settlement call, not a concurrent callback/poll race or a consequence-count assertion. |
| Return/reload and query-error recovery are focused-proven | Proof gap | Helper tests cover hint validation and status decisions, while the browser scenario stays in one mounted JS-bridge journey. No component/browser test mounts Checkout with a stored hint, reloads/redirect-returns, or proves the retained-hint retry affordance after a query error. |

## Future Read-Model / Cache Interaction

The C0 Web read-model findings are present in the current 5-3 source:

- Checkout stores the latest `PaymentTx` server snapshot in a component-local
  `ref` and calls raw `fetchPaymentTx`, while `usePaymentTx` and its TanStack
  query key have no consumer. Invalidating that unused key cannot refresh the
  actual local source.
- Terminal reconciliation first invalidates active checkout target/Bill/order
  queries and then explicitly refetches the same queries with `type: "all"`.
  This can issue duplicate active fetches and obscures the terminal read owner.

These do not invalidate D2's backend-authoritative settlement rule: the local
snapshot comes from the backend and the session hint remains opaque. They do
mean 5-3 must not be read as final realization of the future rule that TanStack
Query is the sole Web owner of server-cache state. The future cache-source
tranche should adopt one PaymentTx query/cache authority and one deterministic
invalidate-or-refetch policy.

## Durability And Sequencing Risks

- The known Bill-transition-to-Trade-consequence crash window remains explicit:
  Bill can settle before the synchronous Trade consequence completes, and an
  `ALREADY_SETTLED` replay does not retry that consequence. This is outside the
  claimed no-outbox boundary, not hidden by browser reconciliation.
- The focused backend scenario creates a Rental bill line. Because Phase 5 also
  retires Rental runtime dependencies, this fixture should be replaced by a
  surviving Bill/Trade fixture before Rental removal makes the payment proof
  brittle. The Ride system scenario currently provides an additional surviving
  end-to-end journey, so this is a sequencing risk rather than a present D2
  correctness failure.

## Low-Cost Verification

| Command | Result |
| --- | --- |
| `pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario apps/backend/tests/payment/payment-provider-ssot.scenario.test.ts` | Pass — 1 test |
| `pnpm exec vitest run --project frontend-unit apps/web/src/domains/payment/use-cases/checkout-attempt-resume.test.ts` | Pass — 5 tests |
| `pnpm exec vitest run --config vitest.backend.config.ts --project backend-unit apps/backend/src/domains/bill/services/payable-bill-lines.test.ts` | Pass — 4 tests |
| `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts -t 'commerce_ride_hailing_ordering_reaches_order_detail_for_active_pr'` | Pass — 1 selected, 8 skipped |
| `pnpm check:type:backend` | Pass in the same unchanged working tree immediately before this audit |
| `pnpm check:type:web` | Pass in the same unchanged working tree immediately before this audit |
| `pnpm check:lint:backend` | Pass in the same unchanged working tree immediately before this audit |
| `pnpm check:lint:web` | Pass in the same unchanged working tree immediately before this audit |
| scoped `git diff --check` for the 5-3 source set | Pass |

## Completion Decision

5-3 is functionally complete as a bounded D2 and Bill/Payment/Trade ownership
cutover. It is not yet fully evidence-complete under its own callback/poll and
same-session return/reload wording.

Required before relying on the stronger completion claim:

1. Add a focused callback/poll competing-observation test that asserts one Bill
   transition and one immediate Trade consequence.
2. Add a Checkout component or browser test that mounts with a stored session
   hint and proves backend-driven resume, including a query-error retry path.

The PaymentTx query-cache consolidation and duplicate-refetch cleanup should
remain in the already-recorded future Web read-model/cache tranche; they need
not be pulled into 5-3 unless 5-3 is re-scoped to claim final Web SSoT closure.
