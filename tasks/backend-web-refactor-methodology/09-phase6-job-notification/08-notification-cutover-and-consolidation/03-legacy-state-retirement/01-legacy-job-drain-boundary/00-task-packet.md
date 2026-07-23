# `6-3.3b` — Legacy Job Decoder And Drain Boundary

## Status

**Cancelled by Sir's 2026-07-23 forward-cut-off decision.**

## Objective

Ensure every pending/retry legacy `wechat.*` Job has one explicit safe outcome
before a handler registration or its required compatibility state disappears.

## Scope

- retain-decoder, verified migration or controlled-drain policy per Job family;
- `RUNNING` lease handling and old runner/request-tail deployment boundary;
- fixture proof for representative legacy payloads and terminal dispositions.

## Non-Goals

- no generic outbox or a Job business-state extension;
- no inference of an old inbox/wave state from target generic reservations; and
- no `notification_deliveries` retirement.

## Exit

No implementation exit is required. Breakage of already-deployed legacy Jobs
is an explicitly accepted cut-over risk.
