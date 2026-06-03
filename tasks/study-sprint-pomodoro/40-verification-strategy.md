# Verification Strategy

## Packet Verification

- No production code changed while creating or restructuring this task packet.
- Confirmed product decisions are recorded separately from technical
  constraints.
- Implementation started only after the user explicitly said to start.

## Implementation Verification 2026-06-02

- `pnpm exec vitest run --project backend-unit apps/backend/src/domains/study-sprint/services/duration.test.ts apps/backend/src/domains/study-sprint/services/focus-evidence-reducer.test.ts`
- `pnpm exec vitest run --project frontend-unit apps/frontend/src/domains/pr/ui/sections/PRUtilityComponents.test.ts`
- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm lint:backend`
- `pnpm db:lint`
- Playwright against temporary Vite dev server at
  `http://127.0.0.1:5175/pr/123/study-sprint` verified first guidance page
  text `熄屏会计入专注时长`, action `下一个`, and next page text
  `可以实时看到同伴们的专注情况`.
- Guidance illustration update:
  - `pnpm --filter @partner-up-dev/frontend lint:tokens` no longer reports
    findings in `StudySprintPomodoroPage.vue`; remaining findings are in
    pre-existing unrelated files.
  - Playwright against temporary Vite dev server at
    `http://localhost:4002/pr/123/study-sprint` verified all three guidance
    steps, distinct illustration classes (`screen-off`, `companions`, `start`),
    expected action copy, and transition cleanup to `transform: none`.
  - `pnpm --filter @partner-up-dev/frontend build` was attempted but is
    currently blocked by unrelated workspace type errors around
    `allowRelease` / `PREditableAfterReady` exports.
- Video-call-like room shell update:
  - `pnpm --filter @partner-up-dev/frontend lint:tokens` no longer reports
    findings in `StudySprintPomodoroPage.vue`; remaining findings are in
    pre-existing unrelated files.
  - `pnpm --filter @partner-up-dev/frontend build` was attempted. It passed
    `vue-tsc` and reached Vite transform, then failed on an unrelated missing
    import:
    `src/domains/event/ui/controls/AnchorEventAssistedPRTimeWindowInlineEditor.vue`.
  - Playwright against temporary Vite dev server at
    `http://127.0.0.1:5176/pr/123/study-sprint` mocked the room snapshot and
    verified a four-tile call grid, viewer tile highlighting, bottom controls,
    and consistency between the viewer tile and bottom focus summary.
- Behavior / UI fixes after real URL review:
  - Playwright visited
    `https://partner-up.localhost/pr/26/study-sprint?duration=60` with guidance
    marked seen and verified the actual single-person room renders
    `participant-grid--single`, a full-width participant tile, compact header,
    enabled `开始专注`, and enabled `离开房间`.
  - `pnpm --filter @partner-up-dev/frontend build`
  - `pnpm --filter @partner-up-dev/frontend lint:tokens` reports no
    `StudySprintPomodoroPage.vue` finding; remaining findings are in
    pre-existing unrelated files.

## Future Slice Verification

### PR Page Entry

- Focused frontend unit tests:
  - `STUDY_SPRINT` + active participant renders entry.
  - Non-`STUDY_SPRINT` hides entry.
  - Non-participant hides entry.
  - `ACTIVE` status enables entry.
  - Non-`ACTIVE` status renders the entry disabled for eligible participants.
  - PR Time window derives duration.
  - Missing / invalid PR Time window falls back to 30 minutes.
- Candidate test file:
  - `apps/frontend/src/domains/pr/ui/sections/PRUtilityComponents.test.ts`

### Room Shell

- Frontend unit tests:
  - viewer timer uses passed / recomputed duration.
  - late entry initializes an independent timer.
  - participants manually start their own timer.
  - completed participants remain in the room.
  - room state is visible only to current active participants.
  - layout remains stable on mobile and desktop.

### Focus Evidence

- Unit tests for lifecycle event reducer:
  - page route residence increments valid time.
  - in-page touches do not interrupt.
  - route leave interrupts.
  - screen-off policy credits elapsed wall-clock time only under the agreed
    event classification.

### Cross-Unit Scenario

Use a scenario test when the feature crosses real PR Page, backend auth, and
room entry behavior.

Candidate files:

- `tests/scenario/pr-core/pr-detail-participation.scenario.test.ts`
- a new Study Sprint scenario if room persistence / backend APIs are added.
