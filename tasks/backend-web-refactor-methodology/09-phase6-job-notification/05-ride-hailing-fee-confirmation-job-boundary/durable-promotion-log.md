# D6-F-01 Durable Promotion Log

Sir's reconciliation-owner correction is durable even though the remaining
source/migration choices and provider gates are not yet authorized.

| Durable document | Promoted truth |
| --- | --- |
| `docs/20-product-tdd/architecture-objectives-and-decision-rules.md` | A task container owns generic execution mechanics; external-effect outcome and uncertainty remain with the semantic domain owner. |
| `docs/20-product-tdd/ecommerce-contracts.md` | Bill owns payment settlement; RideHailing owns provider fee-confirmation truth/uncertainty and operator commands; Job is only the task. |
| `docs/20-product-tdd/ecommerce-provider-contracts.md` | Fee confirmation follows payment settlement; current CaoCao idempotency/query and allowance-input gaps remain explicit entry gates. |
| `docs/20-product-tdd/notification-contracts.md`, `unit-topology.md`, `system-state-and-authority.md` | JobRunner consumes generic execution dispositions and does not persist domain reconciliation state. |
| `docs/20-product-tdd/analytics-and-telemetry-contracts.md`, `docs/40-deployment/observability.md`, `recovery.md` | O11y diagnoses attempts; Job controls generic execution; semantic owners authorize business recovery. |

## Compatibility Boundary

Current source has no RideHailing fee-confirmation state or FeeConfirmation
Job. It synchronously calls provider `feeConfirm` after BillLine settlement,
cannot recover the F-02 gap safely, and has no provider confirmation query or
application idempotency proof. Durable target truth is not a claim that this
source migration is complete.
