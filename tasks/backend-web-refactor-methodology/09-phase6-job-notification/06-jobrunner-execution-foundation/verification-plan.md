# `6-1` Verification Plan

## Cheapest Credible Checks

| Claim | Verification |
| --- | --- |
| structured dispositions drive generic control | JobRunner unit matrix for success, skip, retry, exhausted retry, permanent failure and missed timing |
| lease recovery cannot accept stale completion | lease-expiry/new-claim test where the old token updates zero rows and the new claim remains authoritative |
| cancellation does not erase history | covering ACK changes pending/retry to `CANCELED`; no physical delete and no fake attempt |
| terminal-safe causation works | repeated `ONCE_PER_CAUSE` insert before/after terminal state returns the same Job ID |
| one HELD generation exists | isolated Postgres concurrent create test against the partial uniqueness rule |
| coalescing is monotonic | concurrent cursor updates ending at max cursor |
| stale ACK cannot release newer work | two serialization-order tests: schedule-first and ACK-first |
| terminal execution can remain HELD | terminal Job + coalesced schedule + covering ACK + next-generation scenario |
| current rows survive | migration fixture for ordinary, pending, retry, terminal and active-dedupe rows |
| named owner transaction is atomic | generic caller-owned transaction schedules through the bound writer and then throws, leaving no Job; named owner adapters compose mutation and writer through that same transaction |
| Job has no business semantics | AST/text dependency and vocabulary check for business modules/statuses |
| attempt history is future O11y only | no console/stdout sink and no `job_attempts` schema; durable Job control facts remain |
| legacy cut-off is deliberate | current-source registration inventory plus explicit forward migration; no production inventory gate |

## Gate Order

1. pure decoder/disposition/state-machine tests;
2. focused injectable JobRunner compatibility tests;
3. one isolated Postgres schema/concurrency/transaction scenario group;
4. `pnpm check:type:backend` and `pnpm check:lint:backend`;
5. `pnpm test:unit:backend`;
6. `pnpm test:scenario:backend` for migration/concurrency paths;
7. `pnpm check:static` before slice exit if the focused gates are green.

Widen only when a narrower failure cannot localize the defect. No provider or
deployed-runtime probe belongs to this slice.
