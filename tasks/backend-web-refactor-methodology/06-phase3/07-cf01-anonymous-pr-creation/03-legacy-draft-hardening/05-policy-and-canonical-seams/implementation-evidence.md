# 07C policy and canonical seams — implementation evidence

Captured 2026-07-18. This records the coherent policy/seam batch only; it does not claim the whole 07C slice is
complete.

## Implemented

- Added pure `assertPRDraftAccess` with the frozen `{status, createdBy}` + `{userId, roles}` + operation contract.
  Non-DRAFT is a no-op; DRAFT participant-flow is always opaque 404; all other DRAFT operations require an exact
  authenticated owner match. Creatorless rows cannot be claimed by this policy.
- Guarded detail/public `getPR`, join-gates, partner profile, orders, message list/create/read-marker, content/status,
  publish, join/waitlist/exit/cancel/confirm/check-in, mine indexes, share cache, and current-creator reconciliation.
- Kept raw repository reads and dedicated admin/service paths unfiltered. `publishPR` checks before creator resolution
  or `setCreatedBy`; failed-create cleanup/transaction behavior was not changed.

## Production files touched by this batch

- `apps/backend/src/domains/pr/services/draft-access-policy.service.ts`
- `apps/backend/src/domains/pr/services/draft-access-policy.service.test.ts`
- `apps/backend/src/domains/pr/services/creator-mutation-auth.service.ts`
- `apps/backend/src/domains/pr/services/current-creator.service.ts`
- `apps/backend/src/domains/pr/services/join-gates.service.ts`
- `apps/backend/src/domains/pr/services/pr-message-access.service.ts`
- `apps/backend/src/domains/pr/read-models/get-pr-detail.ts`
- `apps/backend/src/domains/pr/read-models/get-pr-detail.alias.ts`
- `apps/backend/src/domains/pr/read-models/get-community-pr-detail.ts`
- `apps/backend/src/domains/pr/queries/get-pr.ts`
- `apps/backend/src/domains/pr/queries/get-pr-partner-profile.ts`
- `apps/backend/src/domains/pr/queries/get-my-joined-prs.ts`
- `apps/backend/src/domains/pr/commands/publish-pr.ts`
- `apps/backend/src/domains/pr/commands/join-pr.ts`
- `apps/backend/src/domains/pr/commands/waitlist-pr.ts`
- `apps/backend/src/domains/pr/commands/cancel-waitlist-pr.ts`
- `apps/backend/src/domains/pr/commands/exit-pr.ts`
- `apps/backend/src/domains/pr/commands/confirm-slot.ts`
- `apps/backend/src/domains/pr/commands/check-in.ts`
- `apps/backend/src/domains/pr/commands/update-pr-content.ts`
- `apps/backend/src/domains/pr/commands/update-pr-status.ts`
- `apps/backend/src/domains/pr/message/list-pr-messages.ts`
- `apps/backend/src/domains/pr/message/create-pr-message.ts`
- `apps/backend/src/domains/pr/message/advance-pr-message-read-marker.ts`
- `apps/backend/src/domains/pr/index.ts`
- `apps/backend/src/controllers/partner-request.controller.ts`
- `apps/backend/src/services/ShareService.ts`

## Validation

```text
pnpm exec vitest run --config vitest.backend.config.ts --project backend-unit \
  apps/backend/src/domains/pr/services/draft-access-policy.service.test.ts \
  apps/backend/src/domains/pr/services/join-gates.service.test.ts \
  apps/backend/src/domains/pr/services/pr-read.service.test.ts
# PASS — 3 files, 18 tests

pnpm check:type:backend
# PASS — tsc --noEmit

pnpm check:build:backend
# PASS — backend and db-migrate-fc bundles built

git diff --check
# PASS
```

## Gaps / handoff

- Existing legacy DRAFT scenario assertions still characterize the pre-hardening creatorless claim/content-edit
  behavior; the later proof worker must update them to the accepted 404 matrix and add owner-bound coverage.
- Scenario/system/browser verification is intentionally not run here. Failed authenticated-create residue remains a
  characterization/cleanup fork and was not deleted or rewritten.
