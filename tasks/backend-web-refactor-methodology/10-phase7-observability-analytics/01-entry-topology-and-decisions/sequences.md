# `7-0` Corrected Sequences

## Current Legacy Program-Diagnostic Sequence

1. A production request, callback, Job trigger or debug path executes.
2. Hono logger or application code writes text/object/serialized JSON through
   console output.
3. FC `logConfig` sends captured output to a configured SLS project/logstore.
4. Operators may use saved queries/dashboards outside the repository.
5. No governed repository contract proves correlation, retention, access,
   alerting or recovery.

## Clean-Baseline Retirement Sequence

1. Freeze all repository and external legacy references.
2. Remove repository SLS configuration and environment plumbing.
3. Remove selected production structured/debug/request output.
4. Close external saved state from separately labelled platform/operator
   evidence; delete only artifacts proven to exist and authorized for removal.
5. Validate deployment and unchanged business/Job/provider behavior.
6. Promote the truthful state: professional program observability is absent.
7. Hand requirements to a separate future task.

No replacement signal is emitted in step 3.

Final D7-04 disposition: Sir confirms no saved SLS queries/dashboard are
configured and closes further platform-artifact inventory for this Phase.

## Current Backend-Confirmed User Event

1. Web attaches `x-journey-id`.
2. Controller executes and persists a PR command.
3. Controller awaits the user-telemetry recorder.
4. Recorder invokes ingest/storage.
5. Storage failure may turn the already committed command into HTTP 500.

## Target Backend-Confirmed User Event

1. Business persistence and response semantics remain authoritative.
2. Recorder attempts best-effort telemetry after success.
3. Telemetry loss/rejection is contained.
4. Until professional program observability exists, the loss remains a typed
   future operational requirement rather than being printed to console/SLS.

## Target Browser Event To BI

1. Web emits a Backend-registry-owned canonical event type.
2. Collector adds journey/context; transport owns batching/retry.
3. Backend Registry accepts/rejects.
4. BI reads fact projections or authoritative business facts.
5. Analytics-owned panels feed one route surface each.
