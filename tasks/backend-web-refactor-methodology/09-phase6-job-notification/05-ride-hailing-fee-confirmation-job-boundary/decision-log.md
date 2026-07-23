# D6-F-01 Decision Log

> Superseded in part on 2026-07-23. D6-F1-04, D6-F1-05, D6-F1-08 and their
> owner-generation consequences no longer govern implementation. Sir accepts
> lost-response duplicate-effect risk; current `6-4` uses one generic Job,
> ordinary retry, optional allowances omitted, and no historic-row/operator
> recovery model. See
> [`../09-fee-confirmation-recovery/decision-log.md`](../09-fee-confirmation-recovery/decision-log.md).

Sir ratified this owner/state boundary on 2026-07-22. Ratification does not
authorize source/schema or provider changes; named provider/input evidence
remains an execution gate.

| ID | Decision | Rationale | Status |
| --- | --- | --- | --- |
| D6-F1-01 | Do not create a RideHailing FeeConfirmationIntent entity. Persist the smallest `feeConfirmation` state on RideHailing Order; use one typed Job per confirmation generation only as the task record. | Provider-effect truth shares RideHailing identity/lifecycle, while a second intent would duplicate task identity and transitions. | Ratified |
| D6-F1-02 | With the first qualifying BillLine payment-settlement transition, atomically set RideHailing fee confirmation to `REQUIRED` and create its Job, or use a named recoverable handoff with the same deterministic causation generation. | Settlement must not commit while required work can disappear; a separate intent does not remove this requirement. | Ratified boundary; concrete adapter is `6-4` work |
| D6-F1-03 | Give each RideHailing-owned confirmation generation one terminal-safe Job causation key rather than current active-only dedupe. | Repeated payment callbacks/reconciliation must not duplicate a generation; an owner-authorized retry creates a new generation/Job. | Ratified |
| D6-F1-04 | Persist provider ambiguity as RideHailing Order `UNKNOWN` (or conservatively treat stale `IN_FLIGHT` as unknown). End the current Job with a generic non-retrying terminal result. | Provider-effect uncertainty is business truth; Job must not know or own `RECONCILIATION_REQUIRED`. | Ratified owner correction by Sir |
| D6-F1-05 | Operator recovery invokes a RideHailing command. Proven application records `CONFIRMED`; proven non-application plus safe retry advances generation and creates a new Job; unresolved evidence stays `UNKNOWN`. | Operator decisions concern RideHailing provider truth. The old Job and already-settled Bill remain unchanged. | Ratified owner correction by Sir |
| D6-F1-06 | Keep fee-confirmation state owner-local on `ride_hailing_orders`; do not introduce a standalone state table unless independent identity/cardinality/lifecycle is later proven. | This is a bounded fact of one provider-bound RideHailing order. | Ratified |
| D6-F1-07 | Resolve the semantic owner and value rules for both required CaoCao allowance fields before defining the Job payload/handler; do not infer zero or copy an unrelated fare field. | Current call omits fields that repository OpenAPI declares required, and no existing fact is proven to mean either allowance. | Ratified as execution gate; values remain unresolved |
| D6-F1-08 | Permit a same-generation/same-Job retry only for a transient result that proves non-application and immediate repetition safe. Any retry after `UNKNOWN` or another terminal old Job requires an operator-authorized new generation and new Job. | Infrastructure recovery before any ambiguous effect and business recovery after ambiguity are different transitions; conflating them either disables safe transient retry or replays an uncertain effect. | Ratified clarification |

## Ratified Boundary

```text
Bill/BillLine
  owns paid settlement truth

RideHailing
  owns provider binding, fee-confirmation generation,
  REQUIRED / IN_FLIGHT / CONFIRMED / UNKNOWN business state,
  reconciliation evidence and retry authorization

Job
  owns one opaque FeeConfirmation task per owner generation,
  scheduling, causation dedupe, claim/lease/retry and generic terminal state

O11y
  owns attempt history
```
