# 07C execution rehearsal (read-only)

## Owner read

```text
authMiddleware -> { userId, roles }
  -> GET /api/pr/:id
  -> readPartnerRequestById
  -> assertPRDraftAccess(read)
      owner + authenticated + createdBy match -> existing detail projection
      otherwise -> opaque 404 before participants/feedback/share projection
```

`openId` remains only the existing bound-user resolver input; it cannot substitute for `roles`. Public `getPR`, share and LLM pass anonymous actor and therefore reject every DRAFT.

## Owner content/status/publish

```text
PATCH content/status -> authorizeCreatorMutation(full RequestAuth)
  DRAFT owner -> policy; content continues, status returns existing publish guidance 400
  DRAFT other/creatorless -> 404 before update

POST publish -> authenticated CreatorIdentity + policy(publish)
  owner DRAFT -> conflict/start/POI checks -> OPEN + creator slot
  creatorless/other -> 404 before resolvePublishedCreator/setCreatedBy
  anonymous -> route 401 AUTHENTICATED_REQUIRED
```

## Participant flow

```text
join-gate projection/resolve, messages/read-marker,
join, waitlist/cancel, exit, confirm, check-in
  -> actor policy(participant-flow)
  -> DRAFT always 404 before child lookup/upsert/status details
  -> OPEN+ existing gates/status/participant errors unchanged
```

Owner DRAFT is not a participant-flow exception. Partner profile remains a read seam and must guard before its active-participant query; if implementation classifies it as participant flow, owner DRAFT must also 404 and the scenario should lock that decision.

## Privileged and internal paths

Admin routes retain explicit service authority. Raw repository reads used by temporal refresh, notification, analytics, admin and order eligibility are not public authorization; do not globally make `readPartnerRequestById` public-only. `current-creator` reconciliation must be restricted away from legacy DRAFT before it can set `createdBy`.

## Failed-create characterization (not cleanup)

```text
authenticated create
  -> INSERT DRAFT(createdBy=actor)
  -> initializeSlotsForPR(id,null): no partners
  -> optional PR-type materialization (may create questionnaire instance)
  -> fire-and-forget create log
  -> publish conflict check throws 409 JOIN_TIME_WINDOW_CONFLICT
  => owner-bound DRAFT residue remains; no automatic delete in 07C
```

An exception after `updateStatus(OPEN)` is not a DRAFT cleanup candidate. Any future cleanup needs attempt/root ownership, child inventory, transaction and race proof in a separate work item.
