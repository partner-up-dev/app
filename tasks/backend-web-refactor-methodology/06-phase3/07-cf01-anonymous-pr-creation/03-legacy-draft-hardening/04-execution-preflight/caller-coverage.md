# 07C caller coverage and actor propagation

## Central policy contract to rehearse

Owner file remains `apps/backend/src/domains/pr/services/draft-access-policy.service.ts` (not present yet). Suggested pure API:

```ts
type PRDraftActor = Pick<RequestAuth, "userId" | "roles">;
type PRDraftAccessOperation =
  | "read"
  | "content-mutation"
  | "status-mutation"
  | "publish"
  | "participant-flow";

assertPRDraftAccess({
  request: Pick<PartnerRequest, "status" | "createdBy">,
  actor: PRDraftActor,
  operation: PRDraftAccessOperation,
}): void;
```

Rules: non-DRAFT is a no-op; DRAFT participant-flow always 404; other operations require `roles.includes("authenticated")`, non-null `userId`, and exact `userId === createdBy`; `createdBy=null` never claims; failure detail/code must not expose status/creator. Admin/service authority is not an input escape hatch.

## Required signatures by seam

| seam | actor/signature change | operation |
| --- | --- | --- |
| `getPRDetailView` | add `roles` beside existing `userId/openId`; controller passes `c.get("auth")` fields; evaluate after raw read and before `toPublicPR`/child projections | `read` |
| `getPR` / share / LLM | keep public adapter actor fixed to `{ userId: null, roles: ["anonymous"] }`; no request viewer argument | `read` |
| join-gates projection/resolve | add `actor: PRDraftActor`; retain `viewerUserId` for acceptance lookup; resolve receives authenticated participant user plus roles | `participant-flow` |
| partner profile | add roles beside `viewerUserId`; policy before active participant query | `read` (lock profile-vs-participant classification in focused fixture) |
| orders controller | pass auth roles/userId before `pr.orders` lookup; no raw get-only path | `read` |
| message access/list/create/read-marker | access helper accepts actor (or full `RequestAuth`) and performs DRAFT guard before participant lookup; commands forward it | `participant-flow` |
| creator mutation auth | already receives full `RequestAuth`; replace DRAFT early return with policy; return owner actor ID only after check | content/status operation according to mode |
| publish | derive actor from authenticated `CreatorIdentityInput` plus roles at controller/use-case boundary; guard before `resolvePublishedCreator`/`setCreatedBy`; creatorless ordinary actor cannot enter claim | `publish` |
| join/waitlist/exit/confirm/check-in | pass full authenticated actor or an explicit actor at command boundary; guard before temporal refresh, active/pending slot, gate, openId or status details | `participant-flow` |
| `/mine/created` | require authenticated role, not merely non-null session user, if policy requires owner-only DRAFT index; creator query remains owner-scoped | owner read/index |

## Current map accuracy after pr-core retirement

The prior 03 map is accurate at behavior level: canonical detail/public adapter, gate, profile, orders, message, mutation, publish and participant seams are still the same. Path corrections are required: every former `domains/pr-core/use-cases/*` is now `domains/pr/{commands,queries}/*`; former `pr-core/services/*` is now `domains/pr/services/*`; tests and fixtures are under `apps/backend/tests/pr/*`. `rg` found no source/test consumer of `pr-core` or `PartnerRequestService`; do not edit historical references in this packet.

## Unexpected paths found

1. Anonymous `/api/share/*` cache endpoints write poster/thumbnail fields directly through `PartnerRequestRepository` without reading status first (`ShareService.ts:186-237`). This is a DRAFT mutation path absent from the old controller-only map.
2. `reconcileCurrentCreator` can mutate `createdBy` from active participant slots (`current-creator.service.ts:16-39`) and is called from join/exit/release effects. A creatorless legacy DRAFT with slots must not be claimed by this normal path.
3. `/mine/created` and `/mine/joined` are ID indexes over raw rows and can surface raw DRAFT IDs even though public discovery excludes them; tests must pin owner/session semantics.

No other unclassified ordinary HTTP DRAFT ingress was found after scanning controllers, PR commands/queries/services, trade order attachment, study-sprint eligibility, share/LLM adapters, and raw `getPROr404` callers.
