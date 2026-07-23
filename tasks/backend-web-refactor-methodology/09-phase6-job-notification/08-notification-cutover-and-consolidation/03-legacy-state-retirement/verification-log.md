# `6-3.3` Verification Log

Date: 2026-07-23

## Result

**Pass.** The accepted forward cut-off is implemented. Current code has one
generic Notification Job runtime and no production registration or decoder for
the eight retired per-kind Job types.

## Structural Evidence

- `0094_retire_legacy_notification_state.sql` drops only
  `pr_message_inbox_states`, `notification_opportunities` and
  `notification_waves`.
- Their entities, repositories, services, read-marker endpoint and response
  fields are absent from current source.
- The six final infra wrappers contained seven definitions; together with the
  earlier PR-message wrapper/type, seven files and eight concrete Job
  definitions were retired. Their registration/cancellation edges, legacy
  Notification barrel and per-kind dispatch services are absent.
- Generic waitlist payloads require cycle identity; the former no-cycle
  compatibility decode and fallback reason are absent.
- `src/index.ts` registers only `registerNotificationSendJobs()` for
  Notification, backed by `notification.send.v1`.
- Remaining old Job-type string matches occur only in scenario assertions that
  prove those Jobs are not created.
- `notification_deliveries` remains as inert historical audit state. Phase 6
  neither writes it nor drops it.

## Executed Proof

- Focused Notification owner/context unit files: 10 tests passed.
- Focused PR notification scenarios affected by the retirement: 15 tests
  passed across 3 files.
- `pnpm test:unit:backend`: 108 files, 495 tests passed.
- `pnpm test:scenario:backend`: 45 files, 137 tests passed.
- `pnpm test:scenario:system`: 11 files, 38 tests passed.
- `pnpm check:static`: passed, including format, lint, type, config/database
  checks, report-first dead-code/security scans and backend/web builds.

## Compatibility Boundary

No production-row inventory, old-client overlap proof, decoder drain or
historic-row backfill was performed. Sir explicitly removed those requirements
for this forward cut-over. This is an accepted product/operations boundary, not
an inferred test result.
