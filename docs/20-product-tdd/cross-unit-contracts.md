# Cross-Unit Contracts

This file owns shared frontend/backend contract substrate and routes mature domain-specific contracts to focused Product TDD owners.

## Contract Owner Map

| Contract Family | Durable Owner |
| --- | --- |
| Typed HTTP, image upload, session, WeChat follow, error transport | This file |
| Local typed origin contract | This file |
| Local development runtime and commands | [`../40-deployment/environments.md`](../40-deployment/environments.md) |
| PR lifecycle, creation, join, waitlist, Study Sprint, share descriptors | [`pr-lifecycle-contracts.md`](./pr-lifecycle-contracts.md) |
| PR Discovery, Form/Card/List views, Authoring handoff, POI application | [`pr-discovery-and-authoring-contracts.md`](./pr-discovery-and-authoring-contracts.md) |
| PR messaging, read markers, message visibility, unread-wave handoff | [`pr-messaging-contracts.md`](./pr-messaging-contracts.md) |
| Admin and operator cross-unit surfaces | [`admin-surface-contracts.md`](./admin-surface-contracts.md) |
| Ecommerce placement, ordering, billing, RideHailing, commerce admin | [`ecommerce-contracts.md`](./ecommerce-contracts.md) |
| Notification opportunities, waves, dispatch, prompt boundaries | [`notification-contracts.md`](./notification-contracts.md) |
| User telemetry | [`analytics-and-telemetry-contracts.md`](./analytics-and-telemetry-contracts.md) |
| BI source/projection and analytics authorization | [`bi-domain-contracts.md`](./bi-domain-contracts.md) |
| Scenario test platform | [`test-platform.md`](./test-platform.md) |

## 1. Typed HTTP Contract

- Backend exports `AppType` from `apps/backend/src/index.ts`.
- Frontend creates Hono RPC clients with `hc<AppType>()`.
- Backend also exports selected domain and entity types for frontend compile-time reuse.

Contract implication:

- route shape, payload shape, and many response shapes are shared by type rather than duplicated manually
- some contract-breaking API changes are intentionally compile-time visible to the frontend workspace

## 1.1 Local Typed Origin Contract

Product TDD owns only the cross-unit origin shape required by the typed HTTP contract:

- During portless development, Vite reads `PORTLESS_URL`, `HOST`, and `PORT` from the portless runtime, publishes `import.meta.env.VITE_API_URL` as the frontend origin, and keeps browser API calls same-origin through the frontend `/api` proxy.
- The frontend `/api` proxy targets the backend portless app by deriving the backend host from the active frontend `PORTLESS_URL`, for example `api.localhost` in local-only mode and `api.partner-up.d.home.arpa` when the frontend runs as `web-app.partner-up.d.home.arpa`.
- This keeps browser API calls aligned with the typed backend HTTP contract while application code stays free of fixed numeric ports.
- Root-owned system scenario tests own isolated frontend and backend HTTP ports through the `system-scenario` Vitest project. That isolated test runtime is separate from the developer portless workflow.

`docs/40-deployment/environments.md` owns local runtime commands, portless app names, LAN mode, fake provider local routes, fixed-port compatibility, foreground readiness, and other operational development workflow details.

## 1.2 Credentialed Browser Origin And OAuth Return Contract

- A deployed Backend runtime that serves credentialed browser flows has one deployment-owned `FRONTEND_URL`. It
  must be an HTTP(S) URL; its URL origin is the only trusted public Web origin for that runtime.
- Credentialed CORS may emit `Access-Control-Allow-Origin` only when the request `Origin` exactly equals that
  configured origin. Request `Origin`, `Referer`, `Host`, and forwarded-host headers must not expand the trusted
  origin set.
- OAuth login and bind `returnTo` values may be absent, relative to `FRONTEND_URL`, or absolute HTTP(S) URLs with
  exactly that origin. Other protocols and origins are rejected. Caller-controlled headers cannot select a return
  origin.
- A second browser origin is a deliberate deployment and contract change: it needs an explicit configuration owner
  plus paired positive and hostile-origin proof. It is not introduced through aliases, request-header inference, or
  cross-environment access.

## 1.3 Image Upload Contract

- The active image upload surface is `POST /api/upload/images/:purpose` with multipart field `image`.
- Backend accepts the allowlisted image purposes: `poster`, `poi`, and `feedback`.
- Backend generates one UUID key per uploaded image. The key is independent from client filenames and is also the stored image filename.
- Backend stores image bytes under the purpose-owned prefix: `posters/`, `pois/`, or `feedback/`.
- Backend serves uploaded images through `GET /api/upload/images/:purpose/:key` and derives the response content type from the stored image bytes.
- Frontend upload flows use the Hono RPC client and pass the purpose explicitly at the upload boundary.
- Xiaohongshu and WeChat generated poster assets use purpose `poster`; POI application and Admin POI Gallery uploads use purpose `poi`; feedback questionnaire image answers use purpose `feedback`.

## 2. Session Contract

- User and admin sessions use separate browser-storage and client contexts. Public-user token storage has one browser
  projection; the public reactive session projection contains only its role and user ID.
- A public-user session admits exactly `anonymous` and `authenticated`. `service` and `analytics` are operator roles
  only; a current user row that carries either operator role is not admitted to the public context, even if it also
  carries `authenticated`.
- `users.role` is a text-array role set. Valid role values are `anonymous`, `authenticated`, `service`, and `analytics`.
- Anonymous and authenticated public-user sessions both use `Authorization: Bearer <JWT>` transport.
- A subject-bound public bearer is valid only when its JWT integrity/expiry is valid and its current persisted user
  is `ACTIVE` with a public role. Missing, disabled, or operator-bearing users resolve as anonymous without a user ID.
- The User domain owns the canonical current-public-identity query (`UserId` to public identity or `null`). Auth
  transport owns JWT verification, issuance, renewal and `x-access-token` emission; public controllers consume the
  resolved request identity rather than querying user persistence to re-decide it.
- The anonymous user UUID is a continuity handle, not a credential: `/auth/session` may restore only an active
  anonymous user from a UUID when a valid public bearer did not already resolve an identity. An invalid or stale UUID
  is rejected rather than upgraded or reused.
- JWTs carry both `roles` and a primary `role` projection for existing session consumers. Authorization decisions that govern privileged surfaces read the full role set.
- The `authenticated` role is the product's strong user identity marker. Current public user flows obtain it through WeChat OAuth login or anonymous-user WeChat upgrade.
- Backend may rotate tokens through the `x-access-token` response header.
- The Web auth process owns public bootstrap. A clean browser registers one anonymous session without an immediate
  restore request; an existing session is restored once; a `401` recovery clears public state and registers one fresh
  anonymous session. Other restore failures do not create a retry loop.
- Frontend must preserve `credentials: "include"` on flows that rely on cookie-backed session state, especially WeChat OAuth, OAuth handoff, and bind paths.
- Frontend app bootstrap owns best-effort session restoration and anonymous continuity. For required identity
  escalation, `lib/rpc` observes a recognized backend response and reports the exact `Response` plus its Problem
  Details payload to the Web auth process; transport owns neither OAuth navigation nor a domain continuation choice.
- The Web auth process owns compatible OAuth escalation. A command that needs browser continuity first writes its
  own typed pending intent, then claims that same response; a command with no such intent may use the process
  fallback without manufacturing replay state.
- Domain command response bodies must not carry user-session payloads such as `auth`, `accessToken`, `role`, or `userId` for session synchronization. Session issuance and rotation belong to auth transport/session infrastructure, primarily the `x-access-token` response header and explicit auth/session endpoints.
- Admin session storage can carry `service`, `analytics`, or both; its bearer validation is a separate transport concern
  and is not inferred from the public-user resolver.
- WeChat OAuth callback completion must not place the long-lived access token in route query parameters. Backend-owned OAuth callbacks hand the frontend session across with a short-lived signed cookie plus a non-secret handoff nonce.

## 3. WeChat Official Account Follow Contract

- Backend persists official-account follow confirmation on `users.wechat_official_account_followed_at`.
- `GET /api/wechat/official-account/follow-status` returns `{ status, followedAt }`, where `status` is `FOLLOWED` or `UNKNOWN`; `FOLLOWED` requires an active authenticated user whose `users.wechat_official_account_followed_at` is present.
- A 6-hour backend JobRunner task reads the WeChat official-account follower list and positively marks local users whose `open_id` appears in the list.
- The follower-list cursor is pagination state for one scan. It is not persisted as durable user state.
- The sync task only writes positive confirmations. Missing users in a follower-list scan remain `UNKNOWN` until a later unsubscribe webhook or reconciliation contract exists.
- Frontend official-account follow prompts combine backend status with a 6-hour local cooldown aligned to the follower-list sync period, so a user who recently saw the prompt or opened the follow QR is spared repeat presentation before the next expected backend confirmation opportunity.
- Frontend may mount the shared official-account follow prompt on Home, `/prd`, and post-commitment follow-ups; those surfaces share the same cooldown and emit user telemetry for prompt presentation and completion/dismissal actions.

## 4. Error Contract

- Backend API exceptions serialize as RFC 9457 `application/problem+json`.
- HTTP status selection should follow RFC 9110 semantics, especially across auth failures, forbidden actions, state conflicts, and invalid content.
- Backend owns stable machine-readable `code` values for domain guard failures and may also expose a stable `type` URI for the same problem family.
- Backend owns localized `title` and `detail` text for problem responses and selects them from request locale. Responses should set `Content-Language`.
- Frontend interprets HTTP status plus stable `code` to drive UX for auth-required flows, join failures, and create-path fallbacks.
- User-facing commands that require the `authenticated` role return `401` with code `AUTHENTICATED_REQUIRED`. The
  frontend transport reports that recognized response to the Web auth process, which owns the single-flight WeChat
  OAuth entry for the current browser URL. Domain code may claim its exact response only after it has persisted an
  explicitly owned continuation.
- For shared partner-bounds validation failures, backend and frontend should converge on one user-facing Chinese message rather than surfacing route-specific copies.
- Human-readable explanation remains backend-owned on command failures. Frontend owns placement and presentation.
- Problem-details transport shape is a cross-unit reusable substrate. Domain modules own their `type` and `code` registries.
- Backend production code must express expected API failures through Problem Details helpers or typed domain helpers. The canonical backend Oxlint and ast-grep slices reject `hono/http-exception` imports and `new HTTPException(...)`, with `src/index.ts` as the sole compatibility adapter that may read Hono `HTTPException` and normalize it into the same response contract.

## 5. Stable Route Families

Stable user-facing route families that materially affect coordination include:

- `/`
- `/pr/new`
- `/pr/:id`
- `/pr/:id/messages`
- `/pr/:id/study-sprint`
- `/pr/:id/partners/:partnerId`
- `/prd`
- `/pr/mine`
- `/me`
- `/contact-support`
- `/contact-author`
- `/about`
- `/wechat/oauth/callback`
- `/admin/login`
- `/admin/pr-type-configs`
- `/admin/pr`
- `/admin/pr-messages`
- `/admin/pois`
- `/admin/analytics`
- `/admin/analytics/overview`
- `/admin/analytics/pr-funnels`
- `/admin/analytics/pr-discovery`
- `/bi`

Route-family details belong to the focused owner files in the Contract Owner Map.

## 6. Public Configuration And Build Metadata

- Backend exposes public config values through `/api/config/public/:key`.
- Backend exposes build metadata through `/api/meta/build`.
- Frontend relies on those endpoints to avoid hardcoding operationally managed values.
- PR type configuration does not expose a community-group QR field; platform support assets remain under their dedicated public-config contracts.

## 7. Coordination And Failure Assumptions

- The primary coordination path is browser route -> frontend process and UI -> typed backend API -> backend persistence and side effects -> frontend cache and UI refresh.
- Rules that affect eligibility, status, timing, or identity must coordinate through backend-owned contracts; frontend may optimize UX and does not invent new domain truth.
- Best-effort outbox and job processing may complete after the initiating API response, so frontend must not assume all downstream side effects have already happened unless the API contract says so.
- Unsupported browser capabilities and auth or config gaps surface through backend status and code plus frontend fallback UX rather than through separate frontend-owned policy logic.

## 8. System Scenario Verification Contract

- Root-owned system scenario tests live under `tests/scenario/`.
- System scenarios verify user journeys through a real browser page, real frontend dev server, real backend HTTP server, and isolated Postgres state.
- Test runner, reporter, artifact, and scenario lifecycle ownership rules are governed by `test-platform.md`.
- Scenario `Given` setup may reuse backend scenario builders when they express the target business state without browser setup noise.
- Scenario `When` and minimal user-visible `Then` assertions should operate through the browser page.
- Backend probes are reserved for persistence or hidden side-effect proof that is not observable through the frontend workflow result.
- Frontend routes that participate in system scenarios should expose stable `data-testid` semantic nodes for primary actions, modal actions, and result-state affordances.
- `data-testid` names should follow route and workflow meaning, for example `pr-detail.join.open`, and action nodes should live on the real interactive element.
- CI validation is separated by verification owner: backend gate for backend-local proof, frontend gate for frontend-local proof, and E2E gate for cross-unit browser-to-Postgres user journeys.
- Backend and frontend gates protect ordinary PR integration into `develop` and `master`.
- E2E gate protects PRs whose base branch is `master`, with manual dispatch available for release qualification or diagnosis.
