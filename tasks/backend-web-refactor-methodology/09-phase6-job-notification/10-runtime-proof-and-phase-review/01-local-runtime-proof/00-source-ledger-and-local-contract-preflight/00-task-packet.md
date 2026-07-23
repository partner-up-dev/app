# `6-5.1a` — Source Ledger And Local Contract Preflight

## Status

**Complete, read-only.**

## Objective

Separate source-proven local runtime facts from FC/SLS/operator facts that only
deployed evidence can establish, then identify the smallest generic source work
that can proceed before `6-4`.

## Findings

- request-tail is inline, process-local and disabled in scenario setup;
- at the preflight point, protected external tick had no focused route test;
- `/health` has no DB backlog/lag/lease read;
- bounded `job.attempt` JSON exists but deployed query/retention/alert proof
  does not; and
- legacy deliveries still have writers while CaoCao logs are not yet redacted.

## Exit

`6-5.1b` can add generic wake-up/diagnostic/redaction proof. No deployment or
compatibility-retirement claim is authorized.
