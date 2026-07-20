# Candidate Repair — Route Guard Cancellation

## Status

Complete locally. Sir authorised the source change; it now has focused and full-Web proof. Final Phase-close review
remains owned by the parent completion-review packet.

## Objective

Prevent a superseded `beforeResolve` attempt from mutating attempted-route state or starting OAuth after a newer
navigation has begun.

## Proposed Boundary

Own only `apps/web/src/processes/wechat/route-wechat-auto-login.ts`, its focused test, the exact OAuth/Web durable
rule, and the Phase 4 packet evidence. Preserve the single app-bootstrap guard, `/bills`-only metadata, handoff
deferral, bootstrap coordinator, and existing OAuth single flight. Do not touch router pages, Commerce queries,
callbacks, cookies, or provider URLs.

## Lowest-Cost Proof

Use a deferred bootstrap test: start eligible `/bills` guard A, invoke a later non-opt-in guard B before resolving
bootstrap, then resolve it. Assert A neither marks `/bills` nor requests OAuth; B proceeds normally. Retain the
existing happy-path and handoff/attempt coverage.

The implementation records a navigation epoch from the earliest app-installed `beforeEach`, captures it for the
`beforeResolve` attempt, and rechecks after bootstrap. The focused test directly exercises that earliest epoch signal
before a later navigation reaches `beforeResolve`.
