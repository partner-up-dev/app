# 08A Waitlist Auth-Contract Trace Report

## Finding

The current implementation keeps the waitlist JSON response public-PR-only. The domain command carries an
internal `userId` alongside the public projection so the controller can rotate the request session, but the
controller does not serialize that internal field. Rotation is emitted by the shared `x-access-token` response
header and consumed by the shared Web RPC fetch wrapper. No waitlist-specific auth parser or public auth payload
was found.

## Browser -> Web mutation

1. `/apps/web/src/pages/PRPage.vue:136-138` mounts `PRWaitlistActions` in the PR detail primary-action stack.
2. The action component opens the gate flow from the waitlist CTA (`PRWaitlistActions.vue:82-108`) and receives the
   gate completion callback. `finalizeWaitlist` calls `waitlistMutation.mutateAsync` with only `id` and the checkbox
   value (`PRWaitlistActions.vue:259-274`, input at lines 267-270). Success is represented by local UI state,
   invalidation and the success prompt; the component does not inspect an auth/body field.
3. `useWaitlistPR` builds the typed Hono RPC call to `POST /api/pr/:id/waitlist`, sending
   `{ alternativePrReminderOptIn: boolean }` with `credentials: "include"` (`apps/web/src/domains/pr/queries/usePRActions.ts:127-144`).
   On success it calls `res.json()` (`:145-160`) and invalidates PR detail, join gates, joined PRs and notification
   subscriptions (`:162-175`). There is no waitlist-specific response-header parser here.

## Hono controller -> domain result -> HTTP body/header

1. `partner-request.controller.ts:389-397` validates `id` and JSON, checks the PR, and builds the authenticated
   participant identity. It calls `waitlistPRByIdentity` with the opt-in at `:398-400`.
2. `waitlistPRByIdentity` resolves the participant, executes `waitlistPRAsUser`, and returns an internal
   `{ pr: PublicPR, userId }` result (`apps/backend/src/domains/pr/commands/join-pr-by-identity.ts:24-27,77-92`).
   `userId` is an identity handle for session issuance, not a public auth payload.
3. The controller passes only that internal id to `issueResponseAuth(c, result.userId)` (`partner-request.controller.ts:401`).
   It records telemetry and serializes only `result.pr` through `c.json` (`:402-410`). Therefore the waitlist body
   is the `PublicPR` projection, not `{ pr, userId }` and not `{ auth, accessToken, role, userId }`.
4. `issueResponseAuth` reloads the active user, issues anonymous/authenticated JWT auth and replaces the Hono
   context auth (`apps/backend/src/controllers/pr-controller.shared.ts:195-205`). The outer `authMiddleware` writes
   the latest context token to `x-access-token` after the route returns (`apps/backend/src/auth/middleware.ts:96-104`).
5. CORS exposes that header to browsers (`apps/backend/src/index.ts:100-116`, `exposeHeaders: ["x-access-token"]`).

## Public body schema

`PublicPR` is defined as `Omit<PartnerRequest, "title">` plus optional `title`, `partners`, `myPartnerId`,
`myPendingPartnerId`, `isViewerWaitlisted`, and `isViewerReleased` (`apps/backend/src/domains/pr/read-models/public-pr-view.service.ts:7-14`).
The `PartnerRequest` projection fields are the persisted PR fields (`id`, `type`, `time`, `location`, `route`,
`status`, visibility/confirmation/join-lock settings, capacity/budget/timestamps/preferences/notes/meeting point,
edit/gate/order/feedback/creator and poster caches; see `apps/backend/src/entities/partner-request.ts:161-217`).
The body schema has no `auth`, `accessToken`, `role`, or session `userId` key. `createdBy` is a PR creator reference
inside the public PR projection and must not be confused with the internal `result.userId` used for token issuance.

## Shared Web session path

`apps/web/src/lib/rpc.ts:22-55` is the sole normal user RPC fetch wrapper: it adds the stored bearer token,
per-request journey/client headers, performs `fetch`, reads `response.headers.get("x-access-token")` and persists
the rotated value with `setStoredAccessToken`. The same wrapper handles global `401` escalation. This confirms
waitlist rotation follows the central transport/session path rather than a domain parser.

## Durable wording drift

`docs/20-product-tdd/pr-lifecycle-contracts.md:54` currently says waitlist “returns the refreshed public PR view
plus auth payload.” That is stale against the source trace. The cross-unit session authority says backend may rotate
through `x-access-token` and command bodies must not carry `auth`, `accessToken`, `role`, or `userId`
(`docs/20-product-tdd/cross-unit-contracts.md:63-66`). This 08A evidence supports a documentation-only correction
in 08B; no runtime mismatch or security fork was found.

## Sequence

```text
Browser PR detail
  -> PRWaitlistActions.finalizeWaitlist
  -> useWaitlistPR -> hc<AppType> POST /api/pr/:id/waitlist
  -> Hono controller validates + waitlistPRByIdentity
  -> internal { pr: PublicPR, userId }
  -> issueResponseAuth(c, userId) replaces context auth
  -> authMiddleware emits x-access-token
  -> c.json(result.pr) (PublicPR only)
  -> shared Web authFetch reads x-access-token and stores it
```
