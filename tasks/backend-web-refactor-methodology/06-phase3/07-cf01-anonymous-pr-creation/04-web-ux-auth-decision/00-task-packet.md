# 07D — Web UX and Auth Decision

## Objective

Implement the selected Browser A side of the authenticated-first server policy: authentication precedes a create
command, with no automatic replay or durable local draft continuity across authentication. The flow may not create a
Backend PR row before authentication or imply a creator-private anonymous server DRAFT.

## Owned Surface

- The selected A boundary, its local-memory loss/copy rules and command-owned authentication escalation.
- The exact Web create editor, command-owned auth handoff, local state/storage and focused tests frozen at 07D entry.
- The minimum user-visible copy and affordance changes needed to describe local composition versus durable server
  persistence accurately.

Backend anonymous persistence, a second auth protocol, global OAuth/session redesign and legacy DRAFT hardening are
outside 07D. Exact Web paths must be refreshed immediately before execution.

## Entry Information

- 07B proves no public or WeCom anonymous/creatorless server persistence; 07C has an explicit DRAFT ownership policy.
- Browser A is selected. Define when authentication occurs, what in-memory content can be lost and how the UI
  communicates that boundary before the user commits work.
- Characterize the current refresh and OAuth-return journey and freeze the exact Web/auth seams and focused tests.

## Fork / Stop Conditions

- If either option requires a pre-auth Backend row, stop; that contradicts the accepted server policy.
- If the selected A boundary proves unacceptable and needs local recovery, capability URLs, cross-device continuity,
  a server draft API or automatic replay, stop and reopen product/security design rather than quietly implementing C.
- If A cannot offer honest copy and an acceptable loss boundary, stop and reconsider C; do not silently preserve the
  current misleading affordance.

## Low-cost Verification

- Focused Web tests prove Browser A's no-request-before-auth rule, honest copy and auth escalation. A later manually
  initiated post-auth create remains exactly one normal command.
- A targeted Browser journey proves no row exists before authentication and exactly one owned `OPEN` PR exists after
  successful authenticated creation.
- Copy review confirms no server-side anonymous DRAFT or creator-private persistence promise.
- Run Web type/build after the coherent batch; reserve the full System gate for 07E.

## Status

Complete. Browser A's execution-time rebaseline, shared gate/disclosure implementation and focused Browser proof are
recorded in [`02-execution-preflight/`](./02-execution-preflight/) and
[`03-browser-a-implementation/`](./03-browser-a-implementation/); final cross-unit proof is in
[`../05-verification/`](../05-verification/). No Backend, OAuth-protocol, server-draft, or automatic-replay redesign
was introduced.
