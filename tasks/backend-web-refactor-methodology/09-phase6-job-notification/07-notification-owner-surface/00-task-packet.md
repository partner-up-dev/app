# `6-2` — Notification Owner Surface And Representative Vertical Cutover

## Status

**Locally complete and proven.** The `WAITLIST_PROMOTED` topology, persistence
and provider seams were re-inventoried before the first `6-2` mutation. Its
then-deferred post-promotion atomic/recoverable handoff was subsequently closed
by `6-3`.

## Objective And Hypothesis

Create one deep Notification module that owns user-attention semantics and
prove it with one end-to-end one-shot template before migrating every family.
The representative cutover is `WAITLIST_PROMOTED`: it exercises typed business
payload, current eligibility, preference/credit, channel binding, rendering,
provider classification and a real PR caller without the PR-message window.

## Owned Scope

- curated Notification public request surface;
- complete stable business-template vocabulary and typed payload mapping;
- Notification-owned timing/creation/dedupe policy;
- business-template × channel binding and rendering;
- logical limited/unlimited credit decoding while current WeChat persistence
  remains non-null limited credit;
- injected current-eligibility/render-context query ports;
- generic `notification.send.v1` handler and neutral channel port;
- one `WAITLIST_PROMOTED` caller/handler vertical cutover;
- historical deferral of its best-effort handoff debt to `6-3`, now closed;
- temporary legacy coexistence for the other notification types, subsequently
  retired by `6-3`.

## Non-Goals

- no PR-message ACK/window cutover;
- no all-kind migration or legacy schema deletion;
- no new email/SMS fallback;
- no provider template ID in caller contracts;
- no generic Notification Intent/Opportunity;
- no change to Job control or RideHailing.

## Packet Files

- `spec.md`
- `plan.md`
- `rehearsal.md`
- `verification-plan.md`
- `decision-log.md`
- `implementation-rehearsal.md`
- `durable-promotion-log.md`
- `compatibility-ledger.md`
- `verification-log.md`

## Exit Shape

At the `6-2` exit, one real workflow depended only on Notification's public
command, one generic handler reached the existing WeChat channel adapter, and
template/payload correlation was compile-time/runtime validated. `6-3` then
repeated that owner structure and made the exemplar's post-promotion handoff
atomic/recoverable.
