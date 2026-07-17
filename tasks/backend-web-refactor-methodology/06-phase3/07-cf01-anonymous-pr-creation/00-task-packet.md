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

Server policy decided 2026-07-17; execution remains planned after `3-6`. Browser-local continuity is the only
remaining UX branch and may not weaken the authenticated persistence rule.

Decision evidence, options and recommendation: [`decision-brief.md`](./decision-brief.md).
