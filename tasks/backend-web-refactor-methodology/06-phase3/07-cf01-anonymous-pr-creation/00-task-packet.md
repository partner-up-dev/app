# Slice 3-7 — CF-01 Anonymous PR Creation

## Objective

Apply the decided authenticated-first creation policy, then align
PRD, Product TDD, Web/Backend behavior and one real browser journey around the chosen outcome.

## Entry / Exit

- Entry: `3-1`–`3-6` exited; create/publish seams and auth continuity remain stable.
- Exit: public H5 and enterprise/WeCom creation require an authenticated owner before persistence; no creatorless
  or anonymous server DRAFT remains reachable; durable statements agree; focused unit/scenario and System proof
  are green; no alternate PR identity or hidden draft protocol is introduced.

## Owned Surface

- `docs/10-prd/behavior/workflows/core-pr.md` and directly related invariant only after the product decision.
- `docs/20-product-tdd/pr-lifecycle-contracts.md` and the minimal create/auth implementation/tests needed to align.
- Exact code paths are frozen in this slice's entry delta before editing.

## Non-goals

- General OAuth/session refactor, waitlist behavior, Commerce or schema redesign.

## Status

Server policy, Browser A and failed-create cleanup treatment are decided 2026-07-17. `07A`–`07E` are complete with
scoped evidence. Browser A means authentication precedes a create command, with no anonymous server row or automatic
replay; failed authenticated-create DRAFT residue remains cleanup characterization rather than recovery state.

Decision evidence, options and recommendation: [`decision-brief.md`](./decision-brief.md).

## Planned Subtasks

- [07A — Durable Rebaseline](./01-durable-rebaseline/00-task-packet.md) — Complete
- [07B — Backend Create Guard and WeCom](./02-backend-create-guard-wecom/00-task-packet.md) — Complete (focused proof and Backend type/build)
- [07C — Legacy DRAFT Hardening](./03-legacy-draft-hardening/00-task-packet.md) — Complete
- [07D — Web UX and Auth Decision](./04-web-ux-auth-decision/00-task-packet.md) — Complete
- [07E — Verification](./05-verification/00-task-packet.md) — Complete

CF-01 is complete. Its final integration matrix, full scenario result, fitness delta and scope audit are in
[`05-verification/`](./05-verification/). `3-8` remains a separate waitlist-contract slice.
