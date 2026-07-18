# 08A Test Inventory and Proof Gaps

## Existing focused proofs run

| Layer | Command | Result | What it proves |
| --- | --- | --- | --- |
| Backend scenario | `pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario apps/backend/tests/pr/pr-waitlist.scenario.test.ts` | 1 file, 4 tests passed (5.49s) | Real Hono/DB waitlist body and state behavior through `requestJson`; `waitlistPR` action parses the JSON body and asserts `status`, `isViewerWaitlisted`, and non-null `myPendingPartnerId` (`apps/backend/tests/pr/_kit/actions/waitlist.ts:6-25`). The scenario also exercises cancellation, FIFO promotion and alternative-reminder behavior (`apps/backend/tests/pr/pr-waitlist.scenario.test.ts:40-176,178+`). |
| Web unit | `pnpm exec vitest run --project frontend-unit apps/web/src/domains/pr/ui/sections/PRParticipationActions.test.ts` | 1 file, 10 tests passed (1.50s) | PR waitlist CTA, gate modal, notice/cancel states and participant hiding (`PRParticipationActions.test.ts:138-199`). The test mocks `useWaitlistPR`, so it is a UI proof, not a transport/header proof. |
| System/browser scenario | `pnpm exec vitest run --project system-scenario tests/scenario/pr/pr-detail-participation.scenario.test.ts -t 'pr_detail_waitlist_promotes_after_active_participant_exit'` | 1 test passed, 5 skipped in file (13.67s) | Real browser + frontend + backend journey opens the waitlist CTA, confirms the gate, observes the success prompt/notice, then verifies promotion after an active participant exits (`tests/scenario/pr/pr-detail-participation.scenario.test.ts:385-440`). It does not capture the response body or header. |

## Current test mechanics

`apps/backend/tests/_infra/http/backend-app.ts:3-44` exposes `requestJson` and `expectJsonResponse`; request helpers
can send a bearer token but do not inspect response headers. `apps/backend/tests/pr/_kit/actions/waitlist.ts:12-25`
narrows the body to three keys and does not assert absence of auth/session keys. No existing test under backend,
Web or root scenario suites references `x-access-token` in a waitlist assertion; source search found only the shared
auth middleware/CORS and Web RPC consumers.

## Minimal remaining proof gap

There is no existing test that simultaneously asserts:

1. successful `POST /api/pr/:id/waitlist` body contains the public PR projection and omits `auth`, `accessToken`,
   `role`, and session `userId`; and
2. the same response carries `x-access-token` and that the shared Web `authFetch` persists it.

This is a test-only gap for 08C if proof is required. Do not invent a runtime change in 08A. The source chain plus
the passing backend scenario and Web UI tests establish the current implementation; header/absence assertions
remain unproven by executable tests.

## Handoff

08B can correct the stale durable phrase to “returns the refreshed public PR view; session rotation, when needed,
uses the shared `x-access-token` response header.” 08C may add the smallest focused header/body contract test if the
team requires executable regression coverage.
