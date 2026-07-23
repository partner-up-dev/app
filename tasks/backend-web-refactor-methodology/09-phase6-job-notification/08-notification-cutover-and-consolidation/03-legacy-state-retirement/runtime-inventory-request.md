# `6-3.3` Operator / Runtime Evidence Request

## Status

**Cancelled on 2026-07-23.** Sir explicitly accepts a forward cut-off even when
old Jobs or old clients still use the retiring state/API. None of the inventory
below gates `6-3.3`; it is preserved only as the superseded preflight record.

This slice cannot safely infer production data or cached-client behavior from
source. The requested evidence is shape/count-oriented; redact user IDs,
OpenIDs and payload contents.

## 1. Legacy Job Inventory

For each `jobs.job_type` beginning `wechat.` (and separately
`notification.send.v1` as a control), provide:

- counts grouped by `job_type`, `status`, and payload version/validity class;
- oldest and newest `run_at` / updated timestamp;
- count of `RUNNING` rows and their lease expiry; and
- whether a controlled worker tick can be paused/drained for a release window.

Do not migrate or delete `RUNNING` rows. The evidence chooses retain-decoder,
migration or drain per family.

## 2. Compatibility Table Shape

Provide row counts plus oldest/newest timestamps for:

- `pr_message_inbox_states`;
- `notification_waves`; and
- `notification_opportunities`.

Also record orphan/inconsistent categories by count only (for example, a row
whose referenced PR or Job no longer exists). Do not reconstruct read/notified
state from generic Job reservations.

## 3. Old-Client / API Overlap

Provide a bounded recent request count (by day and client/build identifier if
available) for `POST /api/pr/:id/messages/read-marker`, and the deployment
version/timestamp of the Web bundle that uses semantic acknowledgement. Decide
the old-client support/sunset window before removing the endpoint or legacy
response fields.

## 4. Archive And Recovery Authority

Name the approved archive location, retention duration, access owner and restore
procedure for the three retiring tables. Also name the rollback point for a
forward schema migration. `notification_deliveries` is excluded: it remains
live until `6-5`.

## Go / No-Go Rule

Only a documented `GO` on all four evidence groups opens application-source or
schema deletion. Any unknown legacy Job, active old-client call, active old
deployment writer, missing archive rule or `RUNNING` Job keeps `6-3.3` in
preflight.
