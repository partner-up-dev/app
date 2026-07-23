# 2026-07-23 Durable-Truth Correction Plan

Status: **complete on 2026-07-23 after source, migration and local gate proof.**

The task packets now reflect Sir's accepted cut-offs, the first-party CaoCao
contract, and the no-console observability decision. Several durable documents
were corrected in the same verified batch so the superseded implementation
target no longer competes with current truth.

## Fee Confirmation

After `6-4` source proof, correct:

- `docs/20-product-tdd/ecommerce-provider-contracts.md`: official
  `order_id`-only request; both allowances optional; no allowance-owner gate.
- `docs/20-product-tdd/ecommerce-contracts.md`: one atomic
  settlement-created generic Job; no owner
  `REQUIRED/IN_FLIGHT/CONFIRMED/UNKNOWN` state or operator recovery.
- `docs/20-product-tdd/system-state-and-authority.md`: Job owns only the task;
  no duplicate fee-confirmation authority is introduced.
- `docs/20-product-tdd/architecture-objectives-and-decision-rules.md`: retain
  the general “business uncertainty is not Job state” rule, but remove the
  CaoCao `UNKNOWN` example because this risk is explicitly accepted rather than
  modeled.

## Legacy Notification State

After `6-3.3` source/migration proof, correct:

- `docs/20-product-tdd/pr-messaging-contracts.md`: remove the old-client/runtime
  retirement gate and describe the forward cut-off as current.
- `docs/20-product-tdd/notification-contracts.md` and
  `docs/20-product-tdd/unit-topology.md`: opportunity/wave/inbox and concrete
  legacy decoder removal become current truth; `notification_deliveries`
  remains transitional audit data.

## Observability

After console/stdout removal and Phase 6 review, correct:

- `docs/40-deployment/observability.md`: remove Job JSON stdout and redacted
  CaoCao stdout as target/source observability claims; document the absence of
  a governed attempt-telemetry backend and the Phase 7 handoff.
- `docs/40-deployment/backend-runtime.md`,
  `docs/40-deployment/backend-rollout.md`, and
  `docs/40-deployment/recovery.md`: keep the protected bounded DB diagnostic
  surface separate from future O11y; remove SLS/deployed-proof gates from Phase
  6 completion.
- `docs/20-product-tdd/analytics-and-telemetry-contracts.md`: preserve
  telemetry non-authority, but do not imply that Phase 6 console output is an
  observability implementation.

## Promotion Rule

Task decisions are current planning truth now. Durable “current source”
statements change only after the relevant source/migration tests pass. The
correction must happen in the same verified batch as Phase 6 completion, not as
an unverified wording-only edit.
