# 07A — Durable Rebaseline

## Objective

Rebaseline the exact PRD, Product TDD and runtime claims affected by CF-01, then align durable wording to the
accepted authenticated-first server policy before application mutation. Preserve the explicit `ADMIN` and
`SYSTEM` creation cases, and state the selected Browser A boundary without claiming local-draft continuity.

## Owned Surface

- The directly conflicting PRD and Product TDD statements identified and frozen at 07A entry.
- Task-local evidence mapping each durable statement to current runtime and accepted policy.
- The minimum durable wording delta needed to state that every `USER` persistence path binds an authenticated user,
  while explicit `ADMIN` and `SYSTEM` cases remain valid.

No runtime, Web, schema, migration or Browser continuity implementation belongs to 07A. Exact durable and runtime
paths must be refreshed before execution; planning-time or historical code paths are not an execution inventory.

## Entry Information

- `3-6` has exited with its evidence current.
- Accepted server policy: public and enterprise/WeCom ingress may not persist an anonymous or creatorless PR DRAFT;
  every persisted user-created PR or DRAFT binds an authenticated identity.
- `ADMIN` and `SYSTEM` are explicit actor cases, not loopholes for missing `USER` identity.
- Browser A is selected: authentication precedes a create command; no anonymous server row, automatic replay or
  durable local-draft promise is implied by this subtask.
- Refresh the exact conflicting lines, creation actor vocabulary and current runtime/test claims immediately before
  editing; record the frozen inventory in this task directory.

## Fork / Stop Conditions

- If durable alignment would remove or weaken the explicit `ADMIN`/`SYSTEM` cases, stop and correct the actor model.
- If WeCom needs a new User/Auth identity mapping to satisfy the policy, leave that design to 07B and its separately
  owned User/Auth fork; do not encode an assumed mapping in durable truth.
- If wording would imply persistence, replay or recovery beyond the selected Browser A boundary, stop and route it
  to 07D rather than broadening the product contract.
- If fresh evidence contradicts the accepted server policy rather than merely stale wording, stop and reopen the
  decision instead of normalizing the contradiction in prose.

## Low-cost Verification

- Review a compact `actor × ingress × persistence` table covering `USER`, `ADMIN`, `SYSTEM`, public H5 and WeCom.
- Focused searches show no remaining durable promise of anonymous or creatorless server-side PR DRAFT persistence.
- Diff review proves only the frozen CF-01 durable statements changed and Browser A/C remains explicitly unresolved.
- Run documentation link/format checks required by the repository after the coherent wording batch.

## Status

Complete. Durable wording was rebaselined against the refreshed runtime evidence and accepted Browser A policy;
runtime, test, schema, migration, and Browser continuity work remain outside 07A.

## 07A Entry Design (read-only)

This packet freezes the durable wording delta before any PRD or Product TDD edit. It is a design artifact, not an
implementation claim. The accepted contract is **Browser A**: authentication precedes a USER create command; the
anonymous browser may author transiently, but it never creates a server-side PR/DRAFT and no create is automatically
replayed after OAuth. A successful authenticated USER create persists and publishes `OPEN` in one command.

The actor model is explicit:

| Actor / ingress | Durable outcome | Durable wording guard |
| --- | --- | --- |
| Public H5 `/pr/new`, `/prd`, home NL (`USER`) | Authenticated user-bound `OPEN`; no pre-auth row | `anonymous` is a browser/session role, never a USER PR owner |
| WeCom webhook | No PR until an authenticated PartnerUp user mapping exists | Do not equate `FromUserName` with `users.openId` or anonymous UUID; no success URL on rejection |
| Admin (`ADMIN`) | Existing explicit operator create path remains valid | Keep separate admin authority; do not weaken to a USER exception |
| Full-capacity expansion (`SYSTEM`) | Existing explicit system-owned `OPEN`, `createdBy = null` case remains valid | Keep explicit SYSTEM authority; it is not anonymous authoring |

Historical creatorless DRAFT rows and a failed authenticated create that remains `DRAFT` are remediation/cleanup
evidence, not a supported anonymous-draft product state. Durable wording must not promise their recovery, claim, or
automatic replay. The legacy DRAFT privacy/ownership gap remains owned by 07C; failed-create cleanup remains subject to
the 07C transaction/child-effects stop condition.

Frozen edit map, replacement sentences, rehearsal and document/link checks are in:

- [`document-map.md`](./document-map.md)
- [`execution-plan.md`](./execution-plan.md)
- [`rehearsal.md`](./rehearsal.md)
