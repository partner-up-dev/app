# 07B entry evidence — PR create callers and WeCom

Read-only inventory captured 2026-07-17 from current production source and tests. No production or durable-doc
files were changed.

## Authority and identity rules observed

- `createPRFromStructured` declares `PRCreationAuthority = USER | ADMIN | SYSTEM` and defaults omitted authority to
  `USER` (`apps/backend/src/domains/pr/commands/create-pr-structured.ts:31-46,105-108`). The implementation resolves
  a creator at lines 114-115, but currently allows `creator = null` and writes `createdBy = null` at lines 120-140.
- `resolveDraftCreator` accepts an active row for any non-null `authenticatedUserId`, but ignores
  `anonymousUserId` entirely (`apps/backend/src/domains/pr/services/creator-identity.service.ts:39-53`). Thus an
  anonymous session id cannot satisfy creation today, while an internal caller that mislabels an anonymous row as
  `authenticatedUserId` could. A future USER guard must require an active genuinely authenticated user role, not just
  a non-null UUID; `anonymousUserId` must never be treated as ownership.
- HTTP public PR mutation middleware rejects non-authenticated roles before handlers (`apps/backend/src/controllers/
  partner-request.controller.ts:57-64,117-124`). `requireAuthenticatedCreatorIdentity` returns a non-null
  authenticated user id and no anonymous id (`apps/backend/src/controllers/pr-controller.shared.ts:170-180`).
- Admin ingress requires a `service` auth role plus a user id (`apps/backend/src/auth/admin-middleware.ts:7-17`), then
  calls the explicit `ADMIN` path. `SYSTEM` is currently an internal capacity-expansion path, not user-originated.

## Production creation-caller inventory

| Caller / source lines | Actor supplied | Identity input | Expected creation result | Current risk/decision |
| --- | --- | --- | --- | --- |
| `partnerRequestRoute POST /new/form` (`apps/backend/src/controllers/partner-request.controller.ts:117-139`) | `USER` (authority omitted; source is `STRUCTURED_FORM` or `PR_DISCOVERY`) | `requireAuthenticatedCreatorIdentity`: active auth user id, optional bound WeChat OAuth open id, anonymous id always `null` | Insert DRAFT then `finalizeCreatedPR`; normal success publishes `OPEN`, `createdBy = auth user id` | Public anonymous request stops at middleware 401. Keep USER guard and owner binding; failed publish cleanup is 07C/07D concern.
| `partnerRequestRoute POST /new/nl` (`apps/backend/src/controllers/partner-request.controller.ts:141-159`) | `USER` (authority omitted; natural language source) | Same authenticated identity as form | AI parse, insert DRAFT, then normal success `OPEN` owned by auth user | Same USER guard; no anonymous persistence.
| `wecomRoute POST /message` text task (`apps/backend/src/controllers/wecom.controller.ts:247-301`) | `USER` accidentally (authority omitted by `createPRFromNaturalLanguage`) | `{ authenticatedUserId: null, anonymousUserId: null, oauthOpenId: null }`; `FromUserName` is only retained as reply recipient | Current result is creatorless DRAFT and a success share URL claiming “draft created” | Offending creatorless enterprise path. No current mapping from WeCom `FromUserName` to an authenticated `users` row. Must stop before `prRepo.create`; never send a success URL. A truthful failure reply may say the enterprise account is not linked to a logged-in PartnerUp user and no PR was created; HTTP webhook ack can remain empty/200.
| `createAdminPR` (`apps/backend/src/domains/admin-pr-management/use-cases/commands.ts:41-83`; route `apps/backend/src/controllers/admin-pr-management.controller.ts:119-123`) | Explicit `ADMIN` | `authenticatedUserId = auth.userId` (admin middleware guarantees non-null service-role user on route); anonymous/oauth null | `publicationMode: create-open`; persist `OPEN`, normally `createdBy = admin actor id`; admin-only type allowed | Preserve explicit ADMIN exception. Use-case input permits null for non-route callers; if that remains supported, it is an explicit ADMIN case rather than USER loophole and should be covered.
| `expandFullCapacityPR` (`apps/backend/src/domains/pr/commands/expand-full-capacity-pr.ts:85-119`), called after full join (`apps/backend/src/domains/pr/commands/join-pr.ts:123-132`) | Explicit `SYSTEM` | All identity fields null by design | `publicationMode: create-open`; persist `OPEN`, `createdBy = null`, then schedule waitlist notifications | Preserve explicit SYSTEM exception; this is internal automatic expansion, not user-originated. No USER guard should reject it when authority is explicit.

The only production `createPRFromNaturalLanguage` callers are the authenticated H5 controller above and WeCom. The
only production `createPRFromStructured` callers are H5 form/discovery, admin use-case, and system capacity expansion
(the natural-language command delegates internally to structured). Search command used:
`rg -n 'createPRFromStructured\\(|createPRFromNaturalLanguage\\(' apps/backend tests`.

## WeCom identity and response characterization

1. Decrypted XML reads `FromUserName` (`wecom.controller.ts:252-254`) and uses it only as `sendTextMessage.toUser`
   (`:288-294`). It is not passed to `resolveUserByOpenId`, no UserRepository lookup occurs, and no authenticated JWT
   context exists on the webhook.
2. The WeChat OAuth resolver (`apps/backend/src/domains/user/services/user-resolver.service.ts:10-31`) creates or
   finds `users.openId` rows for web OAuth open ids. No analogous WeCom external-user mapping exists in the current
   schema/services. Do not equate `FromUserName` with `users.openId`, synthesize a user, or reuse anonymous UUID.
3. Before the guard, the command resolves null (`creator-identity.service.ts:39-53`), computes `createdBy = null`, then
   calls `PartnerRequestRepository.create` (`create-pr-structured.ts:114-140`). It subsequently initializes slots and
   materializes type configuration (`:142-149`), logs the operation (`:151-162`), and `finalizeCreatedPR` sees all-null
   identity and returns DRAFT (`create-pr.shared.ts:15-33`). Only after that does WeCom construct and send a success
   link (`wecom.controller.ts:283-294`). This proves the current route has durable side effects before its response.
4. Exact no-persistence proof for the fix: invoke the WeCom-equivalent `USER` command with all-null identity (or the
   webhook text path), snapshot `partner_requests` (and optionally `partners`/type-materialization rows), assert the
   expected authenticated-required problem/rejection, then assert row counts and matching rows are unchanged. The
   guard must execute before `PartnerRequestRepository.create`; no operation log, slots, materialized configuration, or
   success message may be emitted. If the webhook keeps its fast empty HTTP acknowledgement, the asynchronous failure
   must be observable in a test spy and must not call `sendTextMessage` with a creation URL. A truthful optional WeCom
   reply is a non-success message such as “当前企业微信账号未绑定已登录用户，无法创建；请先完成登录绑定后再试。”

## Focused verification entry points (before implementation)

- `apps/backend/tests/pr/pr-create.scenario.test.ts`: add/refresh scenarios for
  `anonymous_user_pr_create_is_rejected_without_persistence` (anonymous token, HTTP 401, DB unchanged),
  `authenticated_user_pr_create_binds_owner` (HTTP 201/OPEN and `createdBy` equals authenticated user), and a
  direct command-level all-null identity case representing unmapped WeCom (no PR row). Existing
  `structured_pr_create_rejects_past_start_time` is at lines 33-49 and already demonstrates a no-row assertion.
- Cross-system Browser coverage already names the relevant boundaries in `tests/scenario/pr/pr-create.scenario.test.ts`:
  `pr_create_form_requires_authentication_for_save_draft` (lines 140-159, HTTP 401) and
  `pr_create_form_publishes_authenticated_pr` (lines 230-261, HTTP 201/OPEN plus `createdBy` probe). These do not
  exercise the WeCom webhook or directly prove the anonymous DB row count, so Backend scenario coverage remains the
  cheapest authoritative guard test.
- `apps/backend/tests/pr/pr-admin.scenario.test.ts:54-95` is the current ADMIN creation coverage; retain assertion of
  `OPEN` and type policy. Add `createdBy` actor assertion if the guard batch changes that path.
- `apps/backend/src/controllers/wecom.controller.test.ts` currently only tests `buildWeComPRShareUrl` (lines 8-14).
  Add a focused webhook task test or an extracted WeCom identity/response seam test that proves unmapped input does
  not call PR persistence and does not send a success link. Avoid inventing a User mapping in fixtures.
- SYSTEM expansion has no focused scenario currently. If touched, add coverage at the `expandFullCapacityPR` entry
  (or a command seam) asserting explicit `SYSTEM` + null identity still yields `OPEN`/`createdBy = null`; otherwise
  preserve the existing call unchanged and record the gap.
- Cheap post-batch checks: `pnpm check:type:backend`, `pnpm check:build:backend`, and focused
  `pnpm test:scenario:backend -- ...pr-create...` / backend unit test for the creator guard. Broader system proof is
  reserved for 07E.

## Minimal backend change proposal (no implementation in this preflight)

1. In the canonical structured command, derive the authority first and enforce: `USER` requires a resolved active
   authenticated User before `prRepo.create`; throw the existing authenticated-required problem for missing/null,
   inactive, unmapped or anonymous-only identities. Keep `ADMIN`/`SYSTEM` paths explicit and unchanged.
2. Strengthen identity validation at the boundary so a User row used as `authenticatedUserId` must carry a genuinely
   authenticated role (service/admin route remains explicit ADMIN; SYSTEM does not resolve identity). Never fall back
   to `anonymousUserId`.
3. In WeCom, stop treating the external sender id as a creator. On guard failure, do not build a PR URL or claim
   creation. Return the existing fast webhook acknowledgement and optionally send a truthful non-success message; do
   not create a new User/Auth mapping in 07B.
