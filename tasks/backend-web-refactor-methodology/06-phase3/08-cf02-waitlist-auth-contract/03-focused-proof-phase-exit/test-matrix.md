# 08C Test Matrix

| Contract | Owner / test seam | Assertion | Command |
| --- | --- | --- | --- |
| Waitlist body is public PR only | Backend waitlist scenario | Body has expected PR/waitlist fields; own keys `auth`, `accessToken`, `role`, `userId` are absent | `pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario apps/backend/tests/pr/pr-waitlist.scenario.test.ts` |
| Rotation uses header, not body | Same Backend scenario | `x-access-token` exists without recording its value | same command |
| Header handling is shared Web transport | New generic `rpc.test.ts` | `authFetch` persists a mocked header token through session storage | `pnpm exec vitest run --project frontend-unit apps/web/src/lib/rpc.test.ts` |
| Browser waitlist behavior remains intact | Existing System detail participation journey | CTA → gate → success/notice → promotion | `pnpm exec vitest run --project system-scenario tests/scenario/pr/pr-detail-participation.scenario.test.ts -t 'pr_detail_waitlist_promotes_after_active_participant_exit'` |
| No cross-unit or boundary regression | Phase 3 final gate | full scenario, type/build, fitness, diff/format scope audit | final command log |

The Backend and Web tests deliberately prove separate halves of one transport contract. They must not be joined by a
waitlist-specific client parser or by exposing a token in a JSON fixture.
