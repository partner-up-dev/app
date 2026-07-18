# 4-2.2 Verification Strategy

Use a process-boundary unit test before any browser scenario. It records the request ordering and resulting
projection without mocking the full Hono client. Add storage/store checks for role narrowing and token ownership,
then run focused Web unit, type, lint and build slices.

## Result

The focused coordinator/storage/RPC set, Web type check, lint gate and production build passed. The command-level
record is in [`verification-log.md`](./verification-log.md).
