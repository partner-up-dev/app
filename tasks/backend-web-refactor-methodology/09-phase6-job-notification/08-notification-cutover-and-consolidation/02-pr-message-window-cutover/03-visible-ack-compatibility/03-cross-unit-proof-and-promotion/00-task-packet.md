# `6-3.2c-3` — Cross-Unit Proof And Promotion

## Status

**Locally complete.** The focused system scenario passes; the separately
reproducible, scope-external Auth system-suite failure is recorded in
[`verification-log.md`](./verification-log.md).

## Objective

Prove the replacement ACK path end-to-end before declaring the inbox/read-marker
projection eligible for later retirement.

## Scope

- focused backend scenario and happy-dom workflow test;
- one system scenario using a real browser, frontend, backend and isolated
  Postgres state;
- task evidence and durable contract updates after the behavior is proven.

## Exit

The system scenario observes a held generic window before route entry, a
released reservation after the visible route's semantic ACK, and a new held
generation after a later source message. It also leaves the legacy endpoint as
an explicit overlap-only compatibility route rather than claiming it retired.
