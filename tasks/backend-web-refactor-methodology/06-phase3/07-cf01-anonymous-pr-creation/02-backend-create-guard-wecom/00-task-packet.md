# 07B — Backend Create Guard and WeCom

## Objective

Enforce one Backend rule for every `USER` PR persistence entry: an authenticated user identity is required and is
bound as owner. Close the current WeCom creatorless-write route without changing the explicit `ADMIN` or `SYSTEM`
creation cases.

## Owned Surface

- The exact Backend PR creation ingresses, actor/identity guard, WeCom adapter seam and focused tests frozen at 07B
  entry.
- The minimum error/result handling needed for WeCom to stop before persistence when no authenticated User mapping
  exists.
- Task-local before/after inventory of every PR creation caller and the actor kind it supplies.

Legacy DRAFT ownership/privacy, failed-create residue, Browser UX, general OAuth/session design and a new User/Auth
mapping are outside 07B. Specific code paths are execution-time evidence and must be rebaselined; do not reuse
historical `pr-core` paths.

## Entry Information

- 07A has frozen the actor vocabulary and aligned the accepted server policy.
- Refresh all production and test callers that can persist a PR, including public HTTP, WeCom, admin and system
  jobs. Record each caller's actor kind, authenticated identity source and expected persisted state.
- Characterize WeCom behavior when an external identity has no authenticated User mapping, including response and
  side-effect expectations, before changing the guard.
- Baseline focused create scenarios proving anonymous public rejection, authenticated `USER` ownership and the
  explicit `ADMIN`/`SYSTEM` cases.

## Fork / Stop Conditions

- If WeCom lacks an authenticated User mapping, stop its PR persistence in this slice. If the product requires that
  creation to continue, fork a separately owned User/Auth mapping decision; do not use an external identifier,
  synthetic user or null creator as an implicit owner.
- If the change needs schema/data migration, global auth middleware redesign or a new identity protocol, stop and
  route it to the owning phase.
- If an `ADMIN` or `SYSTEM` call is actually an unclassified user-originated path, stop and classify the actor before
  preserving it as an exception.
- If create behavior reaches legacy DRAFT access or failed-publish cleanup, leave it to 07C.

## Low-cost Verification

- Focused unit/Backend scenario matrix proves: anonymous `USER` writes create no row; authenticated `USER` writes
  bind that user; unmapped WeCom writes create no row; explicit `ADMIN`/`SYSTEM` behavior remains intact.
- Before/after creation-caller inventory has no unclassified or creatorless `USER` persistence path.
- Focused search finds no production call supplying a missing user owner under a `USER` actor.
- Run Backend type/build after the coherent guard batch; reserve broader System proof for 07E.

## Status

Complete. The canonical guard and WeCom adapter batch passed independently rerun focused unit (2 files / 8 tests),
Backend scenario (2 files / 6 tests), Backend typecheck and Backend build. See [`exit-evidence.md`](./exit-evidence.md).
Full System proof and legacy-DRAFT hardening remain outside this subtask.
