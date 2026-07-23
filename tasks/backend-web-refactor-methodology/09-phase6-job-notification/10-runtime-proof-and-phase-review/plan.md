# `6-5` Execution Plan

## Current Ordering Decision

`6-5.1a` confirms a safe split:

1. Retain the generic `6-5.1b` wake-up and bounded DB-diagnostic foundation. It
   changes no provider outcome, Notification credit, Job business state or
   compatibility table.
2. Correct the logging branch: remove the Job attempt console sink and legacy
   CaoCao stdout diagnostics; retain only the protected bounded DB diagnostic
   surface.
3. Run the fee-confirmation recovery matrix after simplified `6-4`.
4. Defer real O11y infrastructure and `notification_deliveries` retirement
   beyond Phase 6; execute other legacy deletion under Sir's forward cut-off.

This lowers later verification cost without using generic infrastructure to
invent RideHailing semantics.

## Completion Record

- `6-5.1a` source ledger is complete.
- `6-5.1b-1` wake-up/tick/bounded-diagnostic source and its focused/full
  backend verification are complete.
- `6-5.1b-2` redaction work is superseded: remove the underlying stdout
  diagnostics instead. That removal is complete.
- `6-5.1c` completed the simplified `6-4` Job-only fee-confirmation matrix.
- `6-5.2` real O11y and delivery retirement are explicitly deferred to Phase 7.
- `6-5.3` compatibility retirement and final review are complete.

## Sub-Task 1 — Local Runtime Proof

1. Complete `6-5.1a` source ledger (complete) and `6-5.1b` injectable
   request-tail, external-tick route and bounded DB diagnostic proof.
2. Remove CaoCao stdout diagnostics and the new Job-attempt console observer;
   assert those paths emit no console/stdout output.
3. After `6-4`, run focused Job disposition/reservation, Notification kind,
   PR-message race, generic fee-confirmation disposition and migration suites.
4. Run canonical static/unit/backend/system gates from repository root.
5. Exercise authenticated internal tick locally with isolated DB; add a test
   seam for request-tail because current scenario configuration disables it,
   then verify both call the same injectable JobRunner semantics.
6. Run recovery drills: expired lease, exhausted retry, missed window, terminal
   HELD reservation and stale ACK.
7. Record every failure as source defect, environment gap or external evidence;
   do not mask failures through broad retries.
8. Verify authenticated operational diagnostics query DB backlog/lag/lease
   safely without depending on console logs.

## Sub-Task 2 — Observability Deferral

1. Record the absence of a governed telemetry backend, correlation/query,
   retention/access, alerts and runbooks.
2. Keep `notification_deliveries` and DB Job execution state.
3. Place real O11y infrastructure and eventual delivery-table retirement in the
   remaining-work register; do not add a console sink or synthetic probe.

## Sub-Task 3 — Compatibility Retirement And Review

1. Remove obsolete registrations/decoders and opportunity/wave/inbox state
   under the explicit old-Job/client cut-off.
2. Retain `notification_deliveries`; do not archive/drop it in Phase 6.
3. Run dead-code/import/config searches and full relevant gates again.
4. Review topology, sequences, state ownership, migration reversibility,
   observability and operational recovery against Phase objective.
5. Promote only verified current truth; keep any external/deferred item in the
   remaining-work register.
6. Produce Phase 6 exit evidence and only then mark the phase complete.

## Stop Conditions

- A source change adds or retains console/stdout diagnostics as observability.
- Runtime proof needs an unbounded debug handler or real provider/user mutation.
- Current source still creates a retired legacy state after the cut-over.
- Full scenarios reveal source or contract regressions.
- Deployed evidence would require an unsafe provider/business mutation.
