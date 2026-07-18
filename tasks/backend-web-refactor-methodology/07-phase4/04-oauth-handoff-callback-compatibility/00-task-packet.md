# 4-3 OAuth Handoff And Callback Compatibility

## Status

Execute was authorized by Sir on 2026-07-18. Local 4-3.1–4-3.3 implementation and focused proof are complete
pending the final packet exit audit. 4-3.4 remains an explicitly external evidence gap: it does not block this
local semantic repair, but it blocks topology change, real cross-origin proof claims, and legacy-path retirement.

## Objective

Make the callback-to-browser transition deterministic after the Phase 4 session boundary: no public token may be
issued for an anonymous or operator identity, a received failed handoff has a defined terminal recovery path, and
the direct callback compatibility consumer remains supported until its real consumers and provider topology are
observed.

## Scope And Ownership

| Subtask | Owns | Does not own |
| --- | --- | --- |
| 4-3.1 Backend terminal semantics | OAuth callback/handoff responses, nonce result classification, focused Backend proof | CORS authority, provider configuration, schema, public-session architecture |
| 4-3.2 Web terminal recovery | Handoff gate, client response classification, direct callback parameter hygiene, focused Web proof | Route auto-login policy, pending command replay, new shared auth owner |
| 4-3.3 Honest journey proof | Contract-level HTTP/browser proof and only the minimum faithful harness seam | Faking cross-origin cookie continuity through the development proxy |
| 4-3.4 Callback authority and rollout | Evidence log, consumer inventory, rollout checklist | Guessing WeChat-console or FC edge state; retiring a legacy consumer without proof |

## Non-Negotiable Invariants

- The navigation return URL contains a nonce only; it never contains an OAuth code, state, access token, or user
  credential.
- Handoff requests retain credential inclusion. The handoff cookie is short lived, HttpOnly, path-scoped, and
  one-shot.
- A public browser session is issued only for an active persisted public authenticated user. Rejecting an operator
  or anonymous identity is an expected security outcome, not a reason to widen public-session authority.
- A successful bind marker must not be emitted before the identity is eligible for the corresponding public-session
  completion path.
- Direct callback compatibility stays separate from navigation detection; no request-header heuristic is removed
  without a producer/consumer inventory and replacement proof.

## Protected State

The independent root toolchain changes and task folders listed in the Phase 4 scope audit remain protected. This
packet does not edit, stage, or claim them. Existing uncommitted 4-2 work is preserved and is treated as the
baseline on which 4-3 is rehearsed.

## Packet Index

- [Entry evidence](./01-entry-evidence.md)
- [Impact Handshake](./02-impact-handshake.md)
- [Decision record](./03-decision-record.md)
- [Subtask map](./04-subtask-map.md)
- [Execution plan](./execution-plan.md)
- [Mental rehearsal](./rehearsal.md)
- [Verification strategy](./verification-strategy.md)
- [Durable-document plan](./durable-docs-plan.md)
- [External topology gaps](./external-topology-gaps.md)
- [Evidence index](./evidence-index.md)
- [Verification log](./verification-log.md)
- [Exit evidence](./exit-evidence.md)
