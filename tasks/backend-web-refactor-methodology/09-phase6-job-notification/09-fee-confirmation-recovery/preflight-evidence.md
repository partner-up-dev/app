# `6-4` Read-Only Preflight Evidence

> Supersession note, 2026-07-23: this file preserves the initial repository-only
> audit. Its OpenAPI/allowance and external-gate conclusions are superseded by
> [`official-caocao-contract-review.md`](./official-caocao-contract-review.md)
> and [`decision-log.md`](./decision-log.md). Official docs make both allowance
> fields optional, and Sir accepts lost-response duplicate-effect risk plus a
> forward-only historic-row cut-over.

## Static Topology Observed Locally

| Concern | Local evidence | Consequence |
| --- | --- | --- |
| Normal payment path | `payment-notifications.ts` and `payment-execution.ts` settle a BillLine, then use `payment-settlement-consequence.ts` → Trade consequence. Exact `ALREADY_SETTLED` exits without another consequence. | A provider failure after the synchronous call can leave a settled line without a recoverable task. |
| RideHailing consequence | `apply-bill-settlement-to-order.ts` checks all charges/final settlement then calls Trade-facing `confirmRideHailingProviderFeeAfterPayment`. | The current cross-owner call is not atomic with settlement or a Job insert. |
| Zero-charge path | `commitTerminalSettlement()` may create the final Bill; `createBillFromSeed()` directly marks nonpositive charge lines settled. | No payment callback runs, so the current consequence is absent. |
| Provider boundary | Trade-facing dispatch port exposes one optional allowance; CaoCao adapter serializes two optional fields and returns only `Promise<void>`. | Target must remove this Trade edge and introduce a RideHailing-internal typed boundary. |
| Provider fixture | Fake OpenAPI requires both form fields and reports nominal `data: null`; fake state only appends a confirmation. | Useful for serialization tests, not evidence of idempotency/query/error semantics. |
| Allowance ownership | Whole-source search finds no durable Trade, Bill or RideHailing owner, rule, unit or valid/default mapping for either field. | Values cannot be invented from total fare, company pay, zero, null or names ending in `Fen`. |
| Owner persistence | `ride_hailing_orders` has execution/binding/final-settlement facts but no fee-confirmation generation, state or audit reference. | `6-4b` must add owner-local facts after evidence freezes their shape. |
| Generic Job foundation | `6-1` local source/tests expose transaction-bound `ONCE_PER_CAUSE`, lease fencing and structured generic dispositions. | It is suitable locally, but deployment/active-row/worker evidence remains an external gate. |

## Source Ledger

- `apps/backend/src/domains/payment/use-cases/payment-notifications.ts`
- `apps/backend/src/domains/payment/use-cases/payment-execution.ts`
- `apps/backend/src/domains/payment/use-cases/payment-settlement-consequence.ts`
- `apps/backend/src/domains/trade/use-cases/apply-bill-settlement-to-order.ts`
- `apps/backend/src/domains/trade/use-cases/ride-hailing-ordering-flow.ts`
- `apps/backend/src/domains/ride-hailing/adapters/ride-hailing-reconciliation-transaction.ts`
- `apps/backend/src/domains/bill/use-cases/create-bill-from-seed.ts`
- `apps/backend/src/domains/ride-hailing/{ports.ts,model/provider.ts,services/caocao-provider.ts}`
- `packages/fake-caocao-server/openapi/provider/caocao-provider-minimal.openapi.yaml`
- `packages/fake-caocao-server/src/{routes.ts,state.ts}`

## Gate Result

**No-Go for source/schema mutation.** All missing proof changes external money
effect or recovery semantics. More repository search cannot supply it; the
bounded, redacted evidence required to change this result is in
[`evidence-request.md`](./evidence-request.md).
