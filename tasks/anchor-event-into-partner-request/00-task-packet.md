# Control - Remove AnchorEvent By Reassigning Its Capabilities

## Objective & Hypothesis

- Remove `AnchorEvent` as a product/domain concept by assigning each existing capability to a precise `PartnerRequest` lifecycle or support owner.
- Keep `PartnerRequest` as the only durable collaboration object and keep the current `PR.type` field and meaning unchanged.
- Treat the current `AnchorEvent` implementation as an accidental container for type-specific PR optimization across authoring, discovery, participation, coordination, and completion.
- Improve complexity, readability, and maintainability inside the directly affected graph through single ownership and precise, consistent naming.

## Accepted Direction

```text
universal PR invariants (code)
            +
type-specific PR behavior (code-registered, selected by PR.type)
            +
current runtime configuration (selected directly by PR.type)
            |
            v
consumer-owned behavior in the PR lifecycle
```

- The three rows are conceptual layers, not three required classes, tables, or replacement aggregates.
- There is no replacement `AnchorEvent` entity and no product-level PR-to-template cardinality.
- Runtime configuration is current configuration only. This task adds no configuration version, revision, effective-time model, scenario identity, or PR-side reference.
- Existing `assignmentRevision` belongs only to the current landing-assignment experiment. It is not a configuration-version design and is a retirement candidate, not a pattern to generalize.
- `AnchorEvent` lifecycle is removed with the concept. `ACTIVE`, `PAUSED`, and `ARCHIVED` are not migrated, renamed, or recreated under a PR/config owner.
- The characterized all-zero landing-ratio fallback is `LIST`. If landing assignment is later reduced or retired, `LIST` remains the baseline behavior that replacement tests must explain.
- Preserve FORM / CARD / LIST capabilities as PR-owned Discovery/Authoring views. CARD keeps its joinable candidate deck; LIST keeps current/future browsing and bounded CLOSED history; FORM owns criteria/recommendation and hands unmatched intent to ordinary PR Authoring. Preserve current ratios without `assignmentRevision` or another rebucketing/version mechanism.

## Hard Guardrails

- Preserve `PR.type`; do not introduce `scenarioKey`, `scenarioId`, `revision`, or a renamed identity field.
- Migrate or reduce existing behavior. Do not use the removal to invent new product capabilities or infrastructure.
- Frontend end state has no `AnchorEvent` / business `Event` domain, DTO, page, query key, route state, telemetry context, test id, or locale namespace.
- Canonical frontend discovery entry is `/prd`; internal code spells out `PRDiscovery` rather than using the ambiguous acronym `PRD`.
- `/prd` carries no `eventId`, `fromEvent`, or assignment/config revision.
- Do not mechanically replace `type`, `kind`, `mode`, `status`, `state`, `source`, or `context`. Classify the semantic owner and data flow first, then rename one complete semantic cluster.
- Scope is the AnchorEvent-removal dependency graph, including directly coupled admin, telemetry, BI, compatibility, persistence, tests, and durable documentation. Unrelated cleanup is excluded.
- No runtime or durable-document mutation begins without a later explicit start signal.

## Poly-file Work Products

- [10-target-product-and-owner-model.md](./10-target-product-and-owner-model.md): product essence, three layers, lifecycle owners, and non-versioned behavior semantics.
- [20-capability-disposition.md](./20-capability-disposition.md): field and capability retain/relocate/retire matrix.
- [30-semantic-naming-audit.md](./30-semantic-naming-audit.md): AST/call-flow findings and canonical naming rules.
- [40-pr-discovery-route-and-frontend.md](./40-pr-discovery-route-and-frontend.md): `/prd`, frontend Event removal, route state, and contract boundaries.
- [45-frontend-behavior-equivalence.md](./45-frontend-behavior-equivalence.md): corrected Landing behavior-preservation topology and interaction sequences.
- [50-migration-and-verification-plan.md](./50-migration-and-verification-plan.md): ordered migration slices, blockers, deletion proof, and verification gates.
- [60-implementation-dag.md](./60-implementation-dag.md): recommended target shape and executable dependency sequence.
- [70-executor-work-packages.md](./70-executor-work-packages.md): bounded executor ownership, waves, inputs, outputs, and checks.
- [80-execution-rehearsal-and-gates.md](./80-execution-rehearsal-and-gates.md): simulated branches, resistance, cutover/rollback, and stop/go gates.
- [evidence/2026-07-15-local-data-audit.md](./evidence/2026-07-15-local-data-audit.md): read-only local evidence and production audit queries.

## Execution Decisions

1. Retain title, description, cover, community entry, time-editor profile, preference curation, and route-application behavior under their precise PR Discovery/Authoring/support owners. A locally empty table is migration evidence, not authority to delete a user-visible capability. The old Event identity and aggregate boundary still retire.
2. Remove legacy public Event routes from canonical frontend code. If production traffic later requires compatibility, it belongs to a time-bounded edge/server redirect that resolves the old id to `PR.type`; the web application does not retain an Event route or DTO for that purpose.
3. The additive backfill selects legacy `ACTIVE` rows only. Non-`ACTIVE` rows are not assigned replacement semantics. Any staging/production dependency blocks destructive cleanup and is reconciled as a one-time data operation.
4. Use `FORM=50`, `CARD=50`, `LIST=0` as the persisted default view-ratio vocabulary. Preserve configured overrides when audited; arbitrary nonnegative weights and all-zero are valid, and all-zero resolves to `LIST`.

## Verification & Exit

- Explore exit: agree on the target owner model, capability disposition, `/prd` state, naming glossary, reduction decisions, and compatibility boundary.
- Solidify exit: promote the agreed product vocabulary, rules, and journey changes to durable docs; resolve documented behavior/reality conflicts.
- Implementation started after durable Solidify and the user's explicit authorization on 2026-07-16.
- Implementation exit requires one owner per behavior, no frontend Event business concept, no new configuration-version mechanism, stable `PR.type`, isolated historical compatibility, and behavior-level test evidence.

## Current Mode

- Execute/Verify after correcting the confirmed frontend product regression. `/prd?type=<PR.type>` now migrates the former Landing shell and FORM/LIST/CARD interactions under PR-type-scoped owners instead of replacing them with generic discovery UI. See [`evidence/2026-07-16-frontend-product-regression.md`](./evidence/2026-07-16-frontend-product-regression.md) and [`45-frontend-behavior-equivalence.md`](./45-frontend-behavior-equivalence.md).
- The correction changes identity, ownership, routes, contracts, and vocabulary only. It preserves the established information architecture and interactions, including RIDE_HAILING route selection, the three time modes, long-press recommendation, LIST date grouping, and the CARD swipe deck.
- The forward-only destructive migration is implemented, fail-closed, and independently rehearsed. Applying it outside an isolated environment remains gated by staging/production backup, dependency, data, and traffic evidence.
- Current local verification passes the full static gate, 130 Web unit tests, and all 10 focused real-browser PR Discovery system scenarios. Mobile captures cover RIDE_HAILING FORM, LIST, and CARD. Release cutover remains separately gated; no staging or production migration is authorized by this evidence.
