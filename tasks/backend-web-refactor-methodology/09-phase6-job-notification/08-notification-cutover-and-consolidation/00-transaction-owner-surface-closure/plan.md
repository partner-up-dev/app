# `6-3.1h` Plan

1. **Complete:** inventoried each source writer import and its corresponding
   Notification factory/template.
2. **Complete:** changed Notification factories to construct their writer from
   the supplied executor. Writer-injected adapters remain Notification-local
   and are not root exported.
3. **Complete:** updated PR admission, waitlist promotion, READY, PR-message,
   content/meeting point, POI, and admin type-coordination callers to pass
   only their existing executor.
4. **Complete:** updated focused factory tests and atomic-source scenario
   injections without weakening failure/rollback assertions.
5. **Complete:** passed zero-edge audit, type/lint and representative
   real-Postgres source regressions; see [`verification-log.md`](./verification-log.md).
