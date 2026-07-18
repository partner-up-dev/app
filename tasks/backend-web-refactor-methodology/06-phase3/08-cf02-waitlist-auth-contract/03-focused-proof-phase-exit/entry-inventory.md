# 08C Entry Inventory

## Frozen proof seams

- Backend: `apps/backend/tests/pr/pr-waitlist.scenario.test.ts` can call the real Hono route through
  `apps/backend/tests/_infra/http/backend-app.ts::requestJson`. Add one scenario-local assertion that a successful
  waitlist response has non-empty `x-access-token`, preserves public PR fields, and has no `auth`, `accessToken`,
  `role` or `userId` keys. Never record the token value.
- Web: add one generic `apps/web/src/lib/rpc.test.ts` proof for `authFetch`: a response header rotates stored session
  token through `setStoredAccessToken`. It must not mention waitlist or add a domain parser.
- System: `tests/scenario/pr/pr-detail-participation.scenario.test.ts` already covers the browser waitlist CTA, gate,
  success/notice and later promotion; rerun it unchanged as cross-unit corroboration.
- Final Phase-3 checks: Backend/Web type/build, full scenario, architecture-fitness baseline
  `01-baseline-and-fitness/architecture-fitness-baseline.json`, `git diff --check`, and focused scope audit.

08A's [`test-inventory.md`](../01-trace-characterization/test-inventory.md) establishes this minimal test-only gap;
08B has corrected the durable statement. No runtime change is an 08C default.
