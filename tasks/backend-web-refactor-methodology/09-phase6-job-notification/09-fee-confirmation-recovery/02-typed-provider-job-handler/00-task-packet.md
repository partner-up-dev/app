# `6-4c` — Typed Provider Job Handler

## Status

**Locally complete on 2026-07-23.**

## Objective

Replace Trade's synchronous provider edge with a RideHailing-internal typed
executor. The Job payload identifies stable local records; the handler reloads
the provider binding and returns a generic disposition.

## Scope

- remove fee confirmation from `RideHailingDispatchPort`;
- narrow provider contract and error classifier;
- `ride-hailing.fee-confirm.v1` definition/handler;
- official `order_id`-only request serialization; and
- fake provider success/retry/permanent-failure fixtures.

## Exit

Job has no RideHailing reconciliation vocabulary, and the adapter neither
invents nor serializes allowance values.
