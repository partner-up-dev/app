# 08A — Trace Characterization

## Objective

Rebaseline and characterize the waitlist Browser → HTTP → Backend → session-rotation trace, confirming that the JSON
body is only the refreshed public PR and optional rotation is carried by `x-access-token`. Produce evidence for a
documentation correction without redesigning runtime.

## Owned Surface

- A task-local trace of the current waitlist command, typed response, controller serialization, response header and
  central Web session consumption.
- Exact runtime and test paths frozen at 08A entry.
- Read-only captures or existing focused test output needed to distinguish body content from header transport.

No runtime, Web, durable-doc or broad test mutation belongs to 08A. All paths are rebaselined before execution;
planning-time locations are not an execution inventory.

## Entry Information

- `3-7` has exited and has not introduced a second auth/session channel.
- Accepted CF-02 contract: the body is the refreshed public PR only; optional session rotation uses
  `x-access-token` under the shared transport contract.
- Trace the domain result separately from the public HTTP body so internal identity used to rotate a session is not
  mistaken for an auth payload.
- Capture current typed-client inference and central response-header handling, plus the closest existing Backend and
  Browser waitlist proofs.

## Fork / Stop Conditions

- If a public waitlist response actually contains auth/session fields, stop and classify the drift as a security or
  versioned-contract issue; do not normalize it in documentation.
- If rotation uses a channel other than `x-access-token` or bypasses central Web handling, stop and reopen the
  cross-unit contract.
- If characterization requires changing runtime to observe it, defer that proof gap to 08C rather than redesigning
  behavior in 08A.
- If findings expand into general session/OAuth work, route them to User/Auth.

## Low-cost Verification

- Produce a compact sequence trace showing public PR body serialization, optional header issuance and central header
  consumption.
- Focused source/type searches show no waitlist-specific auth parser and no public response auth keys.
- Run the smallest existing Backend waitlist and Web transport tests needed to verify the trace without mutation.
- Record exact evidence and unresolved proof gaps for 08B/08C.

## Status

Complete. The current source-backed sequence and proof gaps are recorded in
[`trace-report.md`](./trace-report.md) and [`test-inventory.md`](./test-inventory.md), alongside the entry inventory,
execution plan and mental rehearsal. Runtime aligns with the accepted header-only contract, so 08B is a
documentation-only correction and 08C owns the remaining test-only gap.
