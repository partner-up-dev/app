# `6-3.3` — Legacy Notification State And Edge Retirement

Owner: Notification/Job compatibility migration.

## Status

**Locally complete on 2026-07-23.**
`6-3.1` / `6-3.2` replacement proof is locally complete. On 2026-07-23 Sir
explicitly decided that this refactor need not preserve state still used by old
Jobs or old clients. Production inventory, old-client sunset, decoder drain,
and archive/restore proof therefore no longer gate removal.

Migration `0094_retire_legacy_notification_state.sql` removes
opportunity/wave/inbox tables. Their entities, repositories, services,
read-marker contract and current caller edges are gone. All seven concrete
per-kind Job decoders/registrations that remained after the earlier PR-message
cutover are retired, for eight historical concrete Notification Job types in
total. The generic waitlist no-cycle compatibility shapes are also retired.
PR-message attention uses semantic acknowledgement over the current message
window.
`notification_deliveries` is not part of that compatibility waiver and remains
inert audit history until a later real observability phase replaces it.

Sub-task execution files:

- [`plan.md`](./plan.md)
- [`rehearsal.md`](./rehearsal.md)
- [`decision-log.md`](./decision-log.md)
- [`preflight-evidence.md`](./preflight-evidence.md)
- [`runtime-inventory-request.md`](./runtime-inventory-request.md) (cancelled)
- [`verification-log.md`](./verification-log.md)
- [`00-runtime-inventory-and-retention-gate/verification-log.md`](./00-runtime-inventory-and-retention-gate/verification-log.md)
- [`00-runtime-inventory-and-retention-gate/`](./00-runtime-inventory-and-retention-gate/)
- [`01-legacy-job-drain-boundary/`](./01-legacy-job-drain-boundary/)
  (cancelled by cut-off decision)
- [`02-pr-message-inbox-api-retirement/`](./02-pr-message-inbox-api-retirement/)
- [`03-opportunity-wave-source-retirement/`](./03-opportunity-wave-source-retirement/)

Parent contract: [`../spec.md`](../spec.md).
