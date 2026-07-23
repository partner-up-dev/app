# `6-3.3c` Mental Rehearsal

- Old Web sends read-marker after the route is removed: deployment/API logs must
  have satisfied the sunset policy before this batch.
- A tombstoned high-water is the only response cursor: target cursor query stays
  all-row and must not accidentally depend on the deleted inbox table.
- A current generic window has no reader state: acknowledgement still maps only
  PR/recipient/cursor through Notification, so no backfill is needed.
