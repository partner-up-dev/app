# `6-5.1b-1` — Wake-Up, Tick And Bounded Diagnostic Local Proof

## Status

**Locally complete.** The generic source work remains independent of `6-4`
business semantics. It has focused injected request-tail and internal-route
proof, a focused real-Postgres aggregate-diagnostic scenario, and full backend
unit/scenario/type/lint/build verification. FC cadence, deployed token access,
SLS, alert and retention proof remain external.

## Objective

Make the two Job wake-up paths locally testable and provide a protected,
read-only aggregate operational diagnostic without turning public health or Job
payloads into an operator API.

## Scope

- injectable request-tail runner preserving current interval/single-flight/
  timeout semantics;
- focused external-tick 503/401/200/overlap route proof;
- bounded Job backlog/lag/lease/retry/held aggregate read and protected route;
- real-Postgres route fixtures; and
- documentation of local versus deployed proof.

## Non-Goals

- no global cross-instance scheduler lock;
- no provider or business Job invocation to manufacture observability;
- no payload, OpenID, route coordinates or raw provider data in diagnostics;
- no `/health` expansion; and
- no `notification_deliveries` deletion.

## Exit

The source has one testable request-tail behavior, one protected bounded DB
diagnostic, and focused tests. FC cadence/SLS/alert/retention proof remains
external.

## Verification Record

See [`verification-log.md`](./verification-log.md) for the executed local
checks and the explicit deployed boundary.
