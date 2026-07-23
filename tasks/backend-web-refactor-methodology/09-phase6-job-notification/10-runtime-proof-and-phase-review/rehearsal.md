# `6-5` Mental Rehearsal

## Local Proof Branches

0. Request-tail runtime work starts before `6-4` only as a generic execution
   seam and bounded read diagnostic. It cannot manufacture a provider outcome,
   declare O11y deployed, or exercise the future fee-confirmation handler.
1. Static/unit gates pass but system PR-message ACK fails: Phase remains open;
   do not classify the Web/backend contract as a test-harness issue without
   evidence.
2. Expired lease re-enters a Notification handler: current eligibility and
   provider retry classification still gate the edge; Job lease alone never
   authorizes resend.
3. Expired fee-confirmation lease re-enters the generic handler: ordinary retry
   may repeat the provider call under Sir's accepted risk; no owner
   `IN_FLIGHT/UNKNOWN` state is invented.
4. Terminal HELD reservation is selected by retention: retention skips it until
   release.
5. Request-tail and FC tick overlap: DB claim semantics prevent duplicate
   current control ownership, and lease-token fencing rejects stale completion;
   any external-effect duplication still follows handler idempotency/owner
   rules.
6. Scenario tests appear green because request-tail is disabled: the explicit
   injectable seam test must exercise the overlap before local proof passes.
7. Public health is green while DB backlog is late: authenticated diagnostics,
   not process-local health summary, reveals backlog/lease facts.
8. CaoCao returns a body containing coordinates, order data or a vendor error
   message: provider behavior remains typed, but the adapter emits no debug
   stdout.

## Observability Deferral Branches

1. `job.attempt` JSON exists only in console: remove it; that is not a telemetry
   backend.
2. CaoCao debug output is merely redacted: remove it rather than promoting it.
3. A future O11y design is needed to delete delivery audit rows: retain the rows
   and record the debt instead of expanding Phase 6.

## Retirement/Review Branches

1. A pending legacy type appears just before deletion: proceed under the
   explicit forward cut-off; do not reintroduce the compatibility gate.
2. Delivery-table data remains: retain it as transitional audit, not product
   authority.
3. Durable docs say target behavior is current before migration: correct the
   claim and keep compatibility explicit.
4. Phase review finds no code defect and real O11y is still absent: close Phase
   6 with an explicit future-O11y/delivery-retirement item.

## Likely Traps

- Treating build/static green as runtime proof.
- Assuming current `/health` reports DB backlog/lag or that request-tail has
  scenario coverage.
- Deleting delivery history before real O11y exists.
- Using O11y as retry/ACK/product-state input.
- Calling console JSON an observability foundation.
- Expanding into Phase 7 analytics taxonomy during a runtime proof slice.
- Registering a debug Job to manufacture evidence.
