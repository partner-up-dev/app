# Phase 7 Corrected Cross-Slice Rehearsal

## Before Source Work

1. Ratify `7-1` exact deletion boundaries.
2. Rebase the reference ledger onto then-current `HEAD`.
3. Read the nearest Backend/Web instructions before subtree edits.
4. Keep independent Node/Oxc/quality-gate and formatter-only work outside the
   Phase diff.
5. Stop if cleanup begins inventing a replacement observability abstraction.

## `7-1` Decision Rehearsal

- Repository SLS coupling, external saved state and application output are
  three separate deletion surfaces.
- Production diagnostics and CLI/dev terminal UX must not be deleted through a
  single global `console.*` rule.
- `operation_logs` required a separate retention/audit decision; Sir has
  ratified forward deletion of the table, implementation and guidance.
- `notification_deliveries` remains because replacement proof is explicitly
  deferred.
- The future task inherits requirements only; no logger, signal schema,
  exporter or vendor is chosen here.

## `7-2` Clean-Baseline Rehearsal

1. Freeze a path-by-path ledger: remove, retain, or separately decide.
2. Remove `s.yaml` log variables/config together with CI variables,
   environment validation and durable runtime claims.
3. Remove structured callback-router logging and adapt tests around routing
   behavior rather than emitted log events.
4. Remove Commerce debug storage/header/CORS/server/client paths as one batch.
5. Remove other selected production request/OAuth/WeCom/runtime diagnostics
   without touching business results.
6. Close external saved SLS state only from separately labelled platform or
   operator evidence; the final closure is Sir's confirmation that no saved
   queries/dashboard are configured and no further inventory is required.
7. Validate FC configuration/deploy packaging, focused affected tests and
   canonical local gates.
8. Record explicitly that no professional program observability now exists.

Likely branches:

- If FC deployment requires some platform logging field, stop and separate
  platform-mandatory runtime configuration from application observability.
- If a log callback is also a test seam, test routing outcomes directly rather
  than preserving a fake logger abstraction.
- If diagnostic bookkeeping controls polling/cache/reconciliation, stop and
  classify the hidden behavior before deletion.
- If external SLS state is unreachable, finish local cleanup and record the
  exact boundary until an operator supplies evidence or closes the follow-up.

## `7-3` User-Telemetry Rehearsal

1. Keep the Backend Event Registry as runtime name/version/schema owner.
2. Expose only type projections to Web.
3. Convert Web aliases to canonical event names.
4. Separate collection/context from queue/transport.
5. Treat deterministic rejection as non-retryable.
6. Make backend-confirmed recording passive after business success.
7. Do not route telemetry failures to console/SLS as a temporary replacement;
   preserve a typed future requirement in the handoff.

## `7-4` BI / Web Rehearsal

1. `7-4A` freezes response/formula, route, query, state and BI-entry
   compatibility.
2. `7-4B` adds the forward-only typed PR Discovery fact projection, verifies
   it against the Registry and retires the raw-payload reader.
3. `7-4C` introduces one instant-range boundary, corrects timezone handling
   and moves aggregation only with parity/plan evidence.
4. `7-4D` creates the Web Analytics owner and splits one route surface at a
   time without changing formulas.
5. `7-4E` proves real Web event -> ingest -> fact -> current API/dashboard
   behavior.
6. `/prd?spm` is asserted at the fact boundary; a source panel waits for a
   ratified attribution formula.
7. Do not implement disputed population, Retention or attribution semantics.

## `7-5` Review Rehearsal

- Prove zero rejected local mechanism and close or name exact external
  boundaries.
- Audit that no replacement logger/SLS/structured-output compatibility slipped
  in.
- Audit user telemetry remains non-authoritative.
- Run canonical gates once.
- Promote truthful durable state.
- Hand future program observability a requirement/topology/risk packet, not
  implementation debt.
