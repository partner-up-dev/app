# 07C focused validation strategy (no full System)

## Phase order

1. Pure policy unit tests first; no DB and no HTTP.
2. Smallest backend scenario files for canonical owner/other/creatorless/anonymous/admin matrix.
3. Backend type/build (and focused backend lint if implementation changes signatures).
4. Reserve browser/full cross-unit proof for 07E; do not claim it here.

## Exact unit assertions

Create `apps/backend/src/domains/pr/services/draft-access-policy.service.test.ts` (or merge into current `pr-read.service.test.ts` only if test ownership requires it). With minimal `{status,createdBy}` rows and actors:

- OPEN/READY/ACTIVE/CLOSED/EXPIRED: every operation is no-op.
- DRAFT owner with `roles:["authenticated"]` and matching non-null ID: `read`, `content-mutation`, `status-mutation`, `publish` pass; `participant-flow` 404.
- DRAFT creatorless, other user, anonymous matching ID, service, analytics: all operations 404; failure detail/code does not reveal `createdBy` or `DRAFT`.
- Verify anonymous outer route `401` remains a controller concern, not a policy bypass.

Keep `apps/backend/src/domains/pr/services/pr-read.service.test.ts` public-status predicate assertions unchanged.

## Exact scenario files/fixtures/assertions

### `apps/backend/tests/pr/pr-draft.scenario.test.ts`

Reuse `givenUser`, `givenAnonymousUser`, `givenDraftPR`, `buildScenarioFields`, `getTestDb`, `requestJson`. Note that the current `givenDraftPR` accepts a `creator` label but persists `createdBy=null`; owner-bound cases must use `PartnerRequestRepository.create` (or a corrected builder) explicitly.

- Reverse existing creatorless publish claim and content-edit success cases: authenticated other actor gets opaque 404; row remains `createdBy=null,status=DRAFT`, title/type unchanged, no active creator slot.
- Add owner-bound DRAFT fixture via `PartnerRequestRepository.create` (or a builder extension) with `createdBy=owner.id`: owner detail 200, content PATCH 200, publish proceeds to existing business preconditions/success; owner status endpoint remains existing 400 publish guidance.
- Add other-user GET detail/PATCH content/POST publish all 404 and assert root unchanged.
- Add creatorless detail, gate projection/resolve, orders, profile and message list/create/read-marker 404; acceptance/message/inbox rows remain unchanged.
- Anonymous GET is 404; mutation may be 401 `AUTHENTICATED_REQUIRED` at outer auth boundary. Anonymous session with a user ID must not pass owner policy.

### `apps/backend/tests/pr/pr-join-gates.scenario.test.ts`

Create a DRAFT with `joinGateConfig` and query `GET /join-gates` + resolve as authenticated actor; both 404 before acceptance upsert, assert `prJoinNoticeAcceptances` count remains 0. Retain current OPEN+ projection/accept/join/exit/rejoin assertions.

### `apps/backend/tests/pr/pr-admin.scenario.test.ts`

Add a real admin-created/persisted DRAFT fixture and assert service admin workspace/detail/content/status/delete/message behavior remains available. Add ordinary USER token to `/api/admin/*` and assert existing admin-auth 401; never route this through ordinary DRAFT policy.

### `apps/backend/tests/pr/pr-route.scenario.test.ts` (conditional share/LLM)

Existing stable detail route fixture proves OPEN+ canonical share metadata. If LLM/share HTTP setup is available without external provider calls, add DRAFT requests to `/api/llm/xiaohongshu-caption`, share generation and cache read/write and assert opaque 404/no cache mutation; otherwise cover public `getPR` with a unit mock and leave expensive adapters to 07E.

### `apps/backend/tests/pr/pr-create.scenario.test.ts` (characterization only)

Keep past-start no-row case. Add same-owner overlapping OPEN/READY/ACTIVE fixture then authenticated `/api/pr/new/form`; assert Problem Details `409`, code `JOIN_TIME_WINDOW_CONFLICT`, and newly created row `createdBy=actor,status=DRAFT`, zero `partners`. If a questionnaire template is available, assert instance creation and that root deletion would only `SET NULL`; this is a probe, not cleanup implementation. Do not assert automatic deletion.

## Commands

Pure unit (no scenario DB):

```text
pnpm exec vitest run --config vitest.backend.config.ts --project backend-unit apps/backend/src/domains/pr/services/draft-access-policy.service.test.ts apps/backend/src/domains/pr/services/pr-read.service.test.ts
```

Focused backend HTTP/DB scenarios (isolated scenario DB; no System/browser):

```text
pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario apps/backend/tests/pr/pr-draft.scenario.test.ts apps/backend/tests/pr/pr-join-gates.scenario.test.ts apps/backend/tests/pr/pr-admin.scenario.test.ts apps/backend/tests/pr/pr-create.scenario.test.ts
```

Static reachability after implementation:

```text
pnpm check:lint:backend
pnpm check:type:backend
pnpm check:build:backend
```

Scenario setup owns temporary Postgres/migrations through `vitest.backend.config.ts`; no full `pnpm test:scenario:system` is required for this packet.
