# PR Current Creator Handoff

## Objective & Hypothesis

`PartnerRequest.createdBy` should represent the current responsible participant rather than an immutable original creator. Published PRs may start with `createdBy = null`, especially system-owned PRs. When the first active participant joins such a PR, that participant should become `createdBy`. When the current `createdBy` exits, ownership should transfer to the earliest remaining active participant; if no active participant remains, `createdBy` should return to `null`.

Hypothesis: this is a PR-core lifecycle contract gap. It should be fixed at join/exit authority boundaries and projected through PR detail actions, not in Anchor Event Form Mode and not in frontend-only state.

## Guardrails Touched

- `PartnerRequest.createdBy` is nullable and should mean "current responsible participant" when present.
- Any `createdBy` user should be allowed to exit under the same status/time guardrails as other active participants.
- After a successful exit, `createdBy` must still point at an active participant when active participants remain.
- After the last active participant exits, `createdBy` must be cleared to `null`.
- System-owned PR creation paths must continue to create an `OPEN` PR without assigning the viewer as creator at creation time.
- PR detail action projection must stay aligned with command authority: being `createdBy` alone must not block `partnerSection.viewer.canExit`.
- Current creator-only capabilities such as PR editing, READY-after edit, and commerce order creation continue to follow the current `createdBy`.

## Current Understanding

- `joinPRAsUser` creates or reactivates a participant slot, recalculates status, reconciles current creator responsibility, and returns the public PR view.
- `exitPRByUserId` allows current creator exit under the same status/time/participant guardrails as other active participants, then reconciles current creator responsibility after waitlist promotion.
- `PartnerRequestRepository.setCreatedBy(id, userId | null)` already supports setting and clearing creator.
- Creatorless draft publish already claims `createdBy` for the authenticated publisher.
- System-owned published PRs can come from Form Mode zero-candidate auto-create, dummy materialization, and full-capacity auto-expansion.
- PR detail `partnerSection.viewer.canExit` no longer blocks solely because the viewer is currently `isCreator`.

## Proposed State Machine

```text
No active participant
createdBy = null
        |
        | first successful active join
        v
One active participant
createdBy = firstJoiner
        |
        | another active participant joins
        v
Multiple active participants
createdBy = current responsible participant
        |
        | current createdBy exits
        v
Multiple or one active participant remains
createdBy = earliest remaining active participant
        |
        | last active participant exits
        v
No active participant
createdBy = null
```

User-created PRs follow the same handoff model after creation:

```text
User-created PR
createdBy = original creator
        |
        | original creator exits while others remain
        v
createdBy = earliest remaining active participant
```

## Likely Durable Contract Change

No new persisted ownership-mode column is needed if product accepts `createdBy` as the current responsible participant rather than immutable original creator.

The durable contract becomes:

- `createdBy = null` means no current active participant owns creator responsibilities.
- `createdBy != null` should point to one current active participant.
- Join should repair or claim creator responsibility when a PR has active participants but `createdBy = null`.
- Exit should transfer creator responsibility before returning the refreshed PR view.

## Implementation Surface

- `apps/backend/src/domains/pr-core/services/current-creator.service.ts`
- `apps/backend/src/domains/pr-core/use-cases/join-pr.ts`
- `apps/backend/src/domains/pr-core/use-cases/exit-pr.ts`
- `apps/backend/src/domains/pr-core/services/partner-section-view.service.ts`
- `apps/backend/src/domains/pr-core/services/anchor-participant-release-effects.service.ts`
- `apps/backend/src/domains/admin-anchor-management/use-cases/release-admin-pr-partner.ts`
- `apps/backend/src/domains/pr-core/temporal-refresh.ts`
- focused backend scenario/unit tests around first-join claim, creator exit handoff, last-participant exit reset, and detail action projection
- durable docs under `docs/10-prd/behavior/` and `docs/20-product-tdd/cross-unit-contracts.md`

## Verification

- Backend scenario: joining a creatorless `OPEN` PR as its first active participant sets `createdBy` to the joiner.
- Backend scenario: when `createdBy` exits and active participants remain, stored `createdBy` transfers to the earliest remaining active participant.
- Backend scenario: when `createdBy` exits and no active participants remain, stored `createdBy` becomes `null`.
- Backend scenario: a user-created PR creator can exit under normal exit guardrails.
- Partner section unit: creator status alone does not block `viewer.canExit`; status/time/participation guardrails still do.

Executed locally:

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm exec vitest run --config vitest.backend.config.ts --project backend-unit apps/backend/src/domains/pr-core/services/partner-section-view.service.test.ts`
- `pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario apps/backend/tests/pr-core/pr-join.scenario.test.ts`
- `pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario apps/backend/tests/pr-core/pr-waitlist.scenario.test.ts`
- `pnpm lint:backend`
- `pnpm test:unit:backend`

## Current Status

Implemented and verified locally under the handoff model. Backend source, tests, task packet, and durable docs have been updated. No commit has been created.
