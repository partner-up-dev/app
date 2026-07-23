# `6-5.1b-1` Plan

1. Extract a `createRequestTailMaintenanceRunner` seam with injected runner,
   clock/config and timeout boundary; compose it from `index.ts` without
   changing request-tail skip policy.
2. Preserve external tick's current process-local overlap result and add
   focused route tests for unconfigured, unauthorized, success and overlap.
3. Add one repository aggregate using only indexed Job status/run/lease fields;
   cap dimensions and return counts/ages rather than rows or payloads.
4. Compose the aggregate with process-local runner status in infrastructure and
   expose it only behind the existing internal-token policy.
5. Seed real Postgres boundary cases and prove output has no payload/PII.

## Cheapest Credible Verification

An injected fake-runner/clock unit test proves interval/single-flight/error
reset. One real-Postgres route scenario proves token policy and aggregate shape.
Existing JobRunner scenario tests remain the low-cost proof of DB claim/fencing;
the new seam must not duplicate that state machine.
