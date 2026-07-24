# `8-6` — Proven Endpoint, Compatibility And Control Residue

## Status

**Complete on 2026-07-24.** Sir explicitly authorized continuous execution of
`8-6` and `8-7`. All four bounded sub-tasks and their integrated proof are
complete; `8-7` may now execute against the settled source tree.

## Objective

Close only residue with a named owner, a reference/behavior proof and a lower
complexity end state. This is a bounded ledger, not a general dead-code sprint.

## Candidate Ledger

### Endpoint ownership

- move BI admin login out of `BIEntryPage` into the Admin session/auth
  workflow owner;
- make `PRPreviewCard` a pure primitive with an owned projection, or move its
  fetching wrapper to a composite/workflow boundary;
- move the three Share cache/generation RPC calls into focused
  query/command adapters.

The direct WeChat OAuth callback remains the named compatibility exception.

### Zero-consumer compatibility

- Web `router/index.ts` and `stores/userSessionStore.ts` re-export bridges;
- exact unused Backend/Web compatibility barrels or aliases proven by both
  references and focused behavior tests;
- Job legacy adapter/name/columns, deprecated environment aliases and legacy
  CaoCao route receive an explicit keep/remove/external disposition.

Provider-facing or deployed-config surfaces are not deleted from local
inference. Knip's other findings remain report-first.

### Control-plane reconciliation

- make root roadmap/register/README and Phase 8 packets current;
- annotate, rather than rewrite, historical Phase 4/7 evidence when needed;
- replace the obsolete Phase 5 edge-log proof procedure with an external
  operator network/edge capture plus signed Backend receipt procedure;
- leave migration journal/generator provenance in its independent controlled
  task.

## Current Entry Evidence

### Web endpoint owners

- Architecture fitness has exactly three known findings:
  `BIEntryPage` invokes Admin login RPC, `PRPreviewCard` imports
  `usePRDetail`, and the direct WeChat OAuth callback invokes its terminal
  compatibility endpoint.
- The OAuth callback is intentionally retained as a named exception.
- Three additional Share workflow calls bypass their existing
  query/command-adapter layer:
  WeChat description generation, WeChat thumbnail caching and Xiaohongshu
  poster caching.

### Compatibility ledger

- `apps/web/src/router/index.ts` and
  `apps/web/src/stores/userSessionStore.ts` have no source/test/doc consumer;
  each only re-exports its current owner.
- Official-account follow sync still calls the legacy Job
  `registerHandler`; it must first register a typed `JobDefinition` before the
  legacy adapter/API can be removed.
- `deletePendingJobsByDedupe` has no consumer beyond its declaration and
  implementation.
- `jobs.early_tolerance_ms` and `jobs.late_tolerance_ms` have no runtime
  reader/writer. They require a forward migration and current-fixture proof.
  `resolution_ms`, `early_tolerance_units` and `late_tolerance_units` remain
  active scheduling state and are not deletion candidates.
- `OPENAI_API_KEY` is parsed but unused; current CI/template/deployment truth
  uses `LLM_API_KEY`.
- The legacy CaoCao callback route remains mounted, scenario-tested and named
  by edge deployment configuration. It is externally gated, not locally
  reference-free.

### Control plane

- Current roadmap/register/README and Phase 8 status are reconciled through
  `8-5`.
- The remaining historical annotations are the Phase 4 completion packet's
  time-of-execution “only commit remains” statement and Phase 7 evidence row
  `P7-E007`; both need a superseded/history note, not rewritten history.
- Phase 5 `5-7a` still names edge-log correlation. Its executable replacement
  is operator network/edge capture plus a signed Backend receipt; no console
  or structured logger is restored.

## Planned Execution Order

1. [`01-admin-session-entry/`](./01-admin-session-entry/) moves BI login into
   the existing Admin query/session workflow.
2. [`02-pr-share-web-owners/`](./02-pr-share-web-owners/) moves the PR
   query-owning wrapper to composite depth and the three Share calls into
   focused adapters.
3. [`03-compatibility-ledger/`](./03-compatibility-ledger/) closes exact Web,
   Job/schema and environment compatibility while retaining the externally
   configured CaoCao route.
4. [`04-control-plane-reconciliation/`](./04-control-plane-reconciliation/)
   annotates historical evidence and replaces the obsolete Phase 5 external
   proof procedure.

Current execution state is owned by [`slice-map.md`](./slice-map.md).

## Exit

- ordinary Web endpoint invocation has an adapter/workflow owner;
- every compatibility ledger row is removed, retained with an exit condition,
  externally gated or independently handed off;
- no broad Knip deletion is implied; and
- current task control surfaces agree without falsifying historical evidence.

The integrated result and exact proof are recorded in
[`verification-log.md`](./verification-log.md).
