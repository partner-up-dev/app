# 4-0 — Auth Transport And Continuity Inventory

## Status

Complete on 2026-07-18. The evidence maps and the proposed, non-authorized implementation order are linked from
[`exit-evidence.md`](./exit-evidence.md).

## Objective And Hypotheses

Produce one current authority/continuity graph for public-user authentication without changing runtime behavior.

Temporary hypotheses to test rather than assume:

1. User session continuity crosses more than one owner, but every edge can be classified as transport, bootstrap,
   redirect policy, domain-command replay, or legacy compatibility.
2. The OAuth handoff sequence has ordering invariants that make a mechanical SCC break unsafe.
3. Pending actions are intentionally command/domain-owned; a generic replay owner is not justified unless evidence
   exposes duplicated durable semantics.
4. Anonymous UUID recovery, authenticated upgrade, `/me` bootstrap and logout may have overlapping truth sources
   that must be separated before an implementation slice is designed.

## Entry Conditions

- Phase 3 exit evidence is recorded at `../../06-phase3/exit-evidence.md`.
- Session, handoff, and PRD identity contracts have been read.
- Current protected shared state is recorded in `../scope-audit.md`.

## Subtasks

| Folder | Question | Deliverable | Lowest-cost verification |
| --- | --- | --- | --- |
| `01-backend-session-identity/` | Which Backend module owns JWT/session resolution, anonymous restoration, authenticated upgrade and callback issuance? | inbound/outbound authority map plus unresolved seams | source/import inventory, then one focused unit/scenario probe only if it distinguishes a claim |
| `02-web-oauth-rpc-continuity/` | Which Web modules decide bootstrap, redirect, handoff completion, token persistence and route behavior? | SCC edge classification and sequence map | static import/reference graph, then focused Web unit probes |
| `03-cross-unit-journeys/` | Which browser→HTTP journeys establish or change identity, and what does each test actually prove? | journey table, contract comparison and test matrix | durable/source trace plus targeted System selection |
| `04-synthesis-and-next-slices/` | What is the smallest safe Phase 4 implementation order? | revised slice map, decision register and stop conditions | cross-map reconciliation and stale-claim search |

## Guardrails

- Treat existing product and cross-unit contracts as claims to compare against source, not permission to silently
  rewrite behavior.
- Do not run a provider-dependent OAuth flow as the first proof. Prefer source trace, existing mocks, and focused
  tests; use a browser scenario only for a named continuity claim.
- Do not use an import cycle alone as proof that a module must move.
- `PR_DISCOVERY_CREATE` remains intentionally absent from replay; no proposed generic pending protocol may restore it.
- Admin/service/analytics sessions are an explicit separate context. Do not absorb them into public User/Auth scope
  without a later decision.

## Exit Conditions

1. Every observed auth edge has an owner, direction, role and confidence level.
2. The public-user journeys identify one source of session truth and every deliberate compatibility seam.
3. Candidate implementation slices have explicit inputs, non-goals, stop branches, owned paths, and cheap first
   verification.
4. Any contradiction among PRD, Product TDD, Unit TDD, source and tests is either resolved as a fact or recorded as
   a decision requiring Sir.

All four conditions are met at inventory scope. The unresolved items are decisions/stop branches in
[`04-synthesis-and-next-slices/decision-risk-register.md`](./04-synthesis-and-next-slices/decision-risk-register.md),
not hidden assumptions.
