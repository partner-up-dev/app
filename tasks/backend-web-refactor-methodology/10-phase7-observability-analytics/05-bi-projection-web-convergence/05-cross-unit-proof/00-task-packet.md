# `7-4E` — Cross-Unit Proof And Slice Review

## Status

**Complete on 2026-07-23.** The existing role/access proof remains, and one
real System journey now carries a browser PR Discovery interaction through
Web collection, Backend HTTP ingest, the accepted ledger, the typed fact,
Analytics API filtering, and the rendered dashboard. It asserts SPM/source at
the fact boundary and verifies inactive dashboard APIs are not called.

## Objective

Prove the target ownership chain through the real Web, Backend HTTP and
isolated Postgres, then audit the slice for semantic drift and stale owners.

## Concrete Work

1. Retain the existing analytics-role/access scenario.
2. Add one deterministic PR Discovery System journey:
   - enter real `/prd` with controlled SPM and Discovery dimensions;
   - perform a real interaction;
   - wait for telemetry ingestion;
   - assert accepted ledger and typed fact;
   - authenticate as Analytics;
   - open the real Discovery dashboard;
   - assert current funnel/dimension UI.
3. Assert SPM/source at the fact boundary, not in an undefined panel.
4. Prove inactive dashboard APIs are not called.
5. Run zero-reference audits for raw Discovery payload reads, old Admin BI
   owner and the monolithic page.
6. Run focused gates, then canonical static/unit/scenario gates.
7. Reconcile durable BI/Web architecture truth and record deferred semantic
   backlog.

## Exit

The slice closes only when the System journey and canonical gates pass, the
old owner/raw-reader references are gone, and no output/formula drift remains
unexplained.

See [`rehearsal.md`](./rehearsal.md).
