# 08C — Focused Proof and Phase Exit

## Objective

Add or refresh only the focused proof missing from CF-02, then close 3-8 and Phase 3 when evidence confirms the
public-PR-only body and central `x-access-token` rotation path. Preserve runtime behavior and introduce no new auth
channel.

## Owned Surface

- The exact Backend waitlist, Web transport and targeted System test assertions frozen from 08A's proof-gap list.
- Task-local CF-02 verification log and Phase 3 exit reconciliation.
- Minimal test-only changes needed to assert absence of auth/session body keys and central handling of a rotated
  header.

Runtime/AppType response redesign, waitlist-specific session parsing, notification architecture and unrelated Phase
3 cleanup are outside 08C.

## Entry Information

- `3-7` has exited; 08A's trace is current; 08B's durable correction is complete.
- Freeze the smallest assertions that directly prove the JSON response is the refreshed public PR without `auth`,
  `accessToken`, `role` or `userId`, and that an issued `x-access-token` is consumed by the shared Web transport.
- Identify the existing waitlist side-effect and promotion journey assertions that must remain unchanged.
- Rebaseline the Phase 3 checklist, slice logs and architecture-fitness expectations before claiming exit.

## Fork / Stop Conditions

- If a focused test fails because runtime emits body credentials or does not use the shared header path, stop and
  reopen contract/security diagnosis; do not alter expectations to fit drift.
- If proof needs a waitlist-specific Web parser or second token channel, stop because that is an unauthorized runtime
  redesign.
- If notification side effects or waitlist semantics change, route them to their behavior owner.
- If any earlier Phase 3 slice lacks required evidence, keep Phase 3 open and return to that owner.

## Low-cost Verification

- Run focused Backend waitlist tests, Web transport/session tests and the selected waitlist Browser journey first.
- Assert both positive body shape and negative auth/session keys, plus rotated-header central consumption.
- Run Backend/Web type and build checks only if test/type fixtures affect those graphs; then run required targeted and
  full System/architecture-fitness Phase 3 exit gates.
- Final diff/scope audit proves test/evidence-only closure with no runtime redesign; update statuses only after all
  required gates are green.

## Status

Complete. The Backend HTTP body/header assertion, generic Web transport assertion, unchanged Browser journey and all
Phase 3 exit gates are recorded in [`exit-evidence.md`](./exit-evidence.md) and
[`scope-audit.md`](./scope-audit.md). No runtime or waitlist-specific session parser was introduced.
