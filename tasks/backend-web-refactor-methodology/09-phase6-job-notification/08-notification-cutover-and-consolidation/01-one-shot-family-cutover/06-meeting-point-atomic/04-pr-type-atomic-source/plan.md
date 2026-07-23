# `6-3.1f-04` Plan

1. Add a named admin-PR-type transaction port rather than extending the global
   persistence helper or creating a generic transaction callback.
2. In a serializable retry loop, lock the config, then the exact-type PR set in
   ascending ID order; resolve transaction-local before snapshots, update only
   coordination fields, and derive after snapshots from the same locked PRs.
3. Generate one operation UUID/timestamp inside the successful transaction;
   fan out every real delta with the shared operation identity, PR-specific
   causation, source-time roster and Notification-owned recipient filtering.
4. Replace the use-case's global capture/list/concrete-schedule flow with that
   port and keep the returned operator detail derived from the saved tx row.
5. Add route-level success and no-effective-delta scenarios plus a direct
   named-port injected-handoff-failure proof. Then run focused and full backend
   regression before declaring the slice complete.
