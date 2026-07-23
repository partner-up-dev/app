# `6-3.2a-1` — Message-Summary Owner / Window Contract

## Status

**Locally complete.** The owner/window contract is now implemented and
focused-verified. It intentionally does not move a PR message producer or
claim atomic message persistence; those mutations remain exclusively in
`6-3.2a-2` and `6-3.2a-3`.

## Objective

Make `pr.message-summary` a generic Notification template with private
`UNTIL_ACKNOWLEDGED` policy, WeChat binding, source-time availability and a
claimed-reservation dispatch fence. No PR message mutation moves in this child.

## Inputs Already Proven

- Job has a transaction-bound held-window primitive, high-water coalescing,
  covering/stale ACK and terminal-held behavior.
- The old PR-message provider renderer and limited-credit storage exist.
- The existing generic task schema already recognizes `pr.message-summary`.

## Plan

1. Add the private scheduler operation and transaction adapter; Job type/key,
   five-minute timing and creation key remain Notification-private.
2. Pass immutable generic `windowStartCursor` into a claimed Job context and
   retain fresh held-state lookup for the side-effect fence.
3. Add typed dispatch context, render/binding, option/credit mapping, provider
   adapter support, and channel availability capability.
4. Add the transaction-bound message-summary source port that filters a
   caller-supplied frozen roster inside its transaction.

## Rehearsal

- An absent channel creates no reservation.
- A task without a claimed window context skips rather than sending arbitrary
  thread history.
- ACK before handler I/O yields a skip; ACK after I/O begins is not rewritten
  as exactly-once behavior.

## Cheapest Verification

- owner and channel units verify policy/key/timing/render/option behavior;
- Job runner unit verifies window-start propagation;
- transaction-port fake verifies unavailable channel creates no held write;
- backend typecheck, lint and complete backend-unit suite protect the shared
  generic Job/Notification surface.

## Implemented Boundary

- Job claim context carries only generic `windowStartCursor`; the semantic
  task payload remains `{ prId }`.
- The ordinary Notification request command rejects `pr.message-summary`.
  Only the named transaction-bound source port can derive the private
  `UNTIL_ACKNOWLEDGED` key/timing and call its transaction-bound writer.
- The generic owner resolves a current PR message summary, maps it to the
  existing WeChat PR-message template, and rechecks HELD immediately before
  provider I/O.
- Source-time filtering checks channel availability, active bound user and
  explicit PR-message preference plus positive credit from its supplied
  transaction executor. No PR message producer invokes it yet.

## Verification Record

- `pnpm check:type:backend` — passed.
- `pnpm check:lint:backend` — passed.
- focused owner/Job/channel/runtime units — 4 files / 37 tests passed.
- `pnpm test:unit:backend` — 107 files / 487 tests passed.
- `git diff --check` — passed.

## Deferred Lifecycle Edge

An accepted message window deliberately stays `HELD` until a semantic ACK or
invalidation; consuming the final available WeChat credit does not itself
release the attention window. The generic opt-out, re-enable/credit-replenish
and PR/participant invalidation policy therefore remains an explicit
`6-3.2b` requirement before the PR producer cutover can claim full lifecycle
closure. This child must not silently reuse legacy subscription side effects.
