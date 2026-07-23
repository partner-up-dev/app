# `6-3.1c-1` Verification Log

Date: 2026-07-22

- `pnpm db:lint` and `pnpm db:check` — passed for
  `0090_partner_waitlist_cycle_identity.sql`.
- Focused JobRunner/Notification owner/runtime unit matrix — 4 files, 26 tests
  passed, including a pre-cycle generic v1 task that reaches the owner and
  terminally skips before channel I/O or credit consumption.
- Waitlist, activity-start and confirmation real-Postgres scenario matrix — 3
  files, 14 tests passed, including same-slot re-entry, distinct causal jobs,
  stale/current cycle fencing and transaction-bound promotion rollback.
- `pnpm check:type:backend` and `pnpm check:lint:backend` — passed.

The old generic v1 payload is retained only as a safe compatibility drain; the
old per-kind waitlist handler remains a separate legacy drain family.
