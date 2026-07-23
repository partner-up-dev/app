# `6-5.1` Execution Plan

1. Run focused Job/Notification/PR-message/RideHailing state and migration
   suites before broad gates.
2. Add the injectable request-tail overlap test seam and authenticated tick
   401/200 scenarios against isolated Postgres.
3. Exercise lease expiry/stale completion, retry exhaustion, missed timing,
   terminal HELD, stale/covering ACK and RideHailing UNKNOWN drills.
4. Verify authenticated DB backlog/lag/lease diagnostics and structured-log
   redaction snapshots.
5. Run canonical static, unit backend/web, scenario backend/system/all gates in
   widening order and classify every failure.
6. Record local source complete separately from external proof.

Stop if a green result depends on disabled request-tail, fake global singleton
mocks, broad retries or skipped migration fixtures.
