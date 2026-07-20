# 4-4 Authenticated Escalation And Pending Commands

## Status

Execute was authorized by Sir on 2026-07-18 after local 4-3 completion. Local implementation, focused proof, and
durable promotion are complete. The attempted Browser-to-Backend continuation proof exposed a canonical-host
limitation in the System harness; it is recorded under 4-4.4 and is not represented as a passing browser journey.
This packet owns 4-4 only; 4-3.4 production/provider topology evidence remains open and 4-5 is not authorized by
implication.

## Objective

Make a protected browser command's transition from an `AUTHENTICATED_REQUIRED` response to OAuth and its
post-handoff continuation explicit, one-directional, and testable. The goal is not a generic auth service: transport
reports a response, a Web process owns OAuth escalation, and each PR command owns whether and what it persists for
continuation.

## Non-Negotiable Invariants

- `401 + AUTHENTICATED_REQUIRED` remains the Backend-owned cross-unit signal; no command response body becomes a
  session-sync payload.
- `lib/rpc` owns headers, token rotation, and transport reporting. It does not statically import OAuth navigation or
  make a domain continuation decision.
- A command-owned continuation is durably written before it claims OAuth escalation. A command with no continuation
  may still receive the compatible delayed escalation fallback.
- A pending action is browser continuity only, never Backend truth. It is TTL-bounded, validated on read, and has
  one local slot whose latest explicit intent wins.
- The chosen semantics are **at-most-once continuation delivery**: once an eligible handler is ready, the entry is
  cleared immediately before that handler starts and is never automatically reinserted or retried on its failure.
- `PR_CREATE` is never represented in pending storage or automatically replayed. The only initial continuation set
  is `PR_JOIN`, `PR_WAITLIST`, `PR_EXIT`, `PR_CONFIRM`, and `PR_PUBLISH`.
- Existing OAuth return-target, nonce, cookie, handoff-gate, direct callback, provider, and route-auto-login
  contracts stay unchanged.

## Scope And Ownership

| Subtask | Owns | Does not own |
| --- | --- | --- |
| 4-4.1 Escalation boundary | RPC response reporting, process registration/claim, response-bound fallback, focused ordering proof | backend auth policy, OAuth URL/cookie/provider changes |
| 4-4.2 Pending protocol | pending action shape/validation/TTL/at-most-once dispatcher | server persistence or universal command retry |
| 4-4.3 PR continuations | named PR command intent, waitlist input continuity, handlers and intentional no-replay inventory | PR create replay, new product eligibility |
| 4-4.4 Journey proof | faithful mocked OAuth/handoff Browser-to-Backend proof and honest limits | claiming real provider/cross-origin production proof |
| 4-4.5 Promotion and closure | compact durable promotion and compatibility ledger | 4-5 route auto-login/facade decisions |

## Protected State

Do not edit, stage, or claim the independent root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, or
`tasks/oxc-toolchain-migration/`, `tasks/project-node-runtime/`, and `tasks/quality-gate-orchestration/` work.

## Packet Index

- [Entry evidence](./01-entry-evidence.md)
- [Decision record](./02-decision-record.md)
- [Subtask map](./03-subtask-map.md)
- [Execution plan](./execution-plan.md)
- [Mental rehearsal](./rehearsal.md)
- [Verification strategy](./verification-strategy.md)
- [Durable-document plan](./durable-docs-plan.md)
- [Evidence index](./evidence-index.md)
- [Verification log](./verification-log.md)
- [Exit evidence](./exit-evidence.md)
