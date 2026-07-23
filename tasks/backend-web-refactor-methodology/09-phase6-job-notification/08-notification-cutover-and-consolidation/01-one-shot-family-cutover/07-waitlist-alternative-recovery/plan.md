# `6-3.1g` Plan

1. **Complete.** Extend the pending alternative-slot projection with its `waitlistCycleId`.
   Add a curated PR query that loads one source-slot/candidate pair, validates
   the exact source cycle and all current read-only eligibility facts, and
   returns typed candidate rendering facts or a classified skip. Its pure
   temporal veto must reject a stale raw-OPEN candidate after its relevant
   join boundary without persisting a status transition.
2. **Complete.** Replace the speculative generic payload `{ prId, candidateId }` with the
   unambiguous semantic tuple `{ sourcePrId, sourcePartnerId,
   sourceWaitlistCycleId, candidatePrId }`. Add a private active-only generic
   policy/binding/render/context and option/credit bridge. Its private key and
   causation include recipient, source partner, cycle and candidate; source
   callers never construct a Job key.
3. **Complete.** Add a named PR reconciler with three narrow entry modes: candidate changed,
   source slot entered/regranted, and recipient current-source rebuild. It
   enumerates candidate pairs, calls the pure query, deduplicates semantic
   pairs, and requests generic Notification work only for READY pairs.
4. **Complete.** Redirect every PR mutation and the WeChat quota-regrant controller to that
   reconciler. Retain the alternative-join closure as PR-owned mutation, but
   remove all new imports/calls of the concrete scheduler.
5. **Complete.** Make the retained legacy handler's dispatch preparation use the same pure
   PR query. Keep only handler registration, old-payload decoder, Delivery
   accounting and recipient-prefix cancellation for pre-cutover rows.
6. **Complete.** Add owner/query/reconciler unit proof plus a real-Postgres recovery
   scenario. Then search for reverse temporal/infra edges, promote passing
   contracts to durable docs, and record full backend gates.

## Cheapest Verification

- unit fake/spy proves the pure query/reconciler and both generic/legacy
  dispatch paths cannot call temporal refresh or a PR mutation;
- a missed schedule, then repeated reconciliation, creates exactly one active
  generic task for the current source-cycle/candidate pair and no Opportunity;
- canceled/re-entered source cycle, full/cancelled/time-conflicting candidate,
  route/null location and opt-out all skip before channel I/O/credit;
- existing opt-in/matching behavior remains green, provider-template reuse is
  explicitly covered, and a historical legacy row still executes;
- focused units/scenarios then backend unit/scenario/type/lint/build and a
  static legacy/reverse-edge audit pass.
