# Implementation Slices

Do not execute yet. Production code should wait until the user explicitly says
to start.

## Slice 0: Durable Design

Goal:

- Promote confirmed Study Sprint Pomodoro behavior and ownership into durable
  product / technical docs.

Candidate files:

- `docs/10-prd/behavior/capabilities.md`
- `docs/10-prd/behavior/workflows.md`
- `docs/10-prd/behavior/rules-and-invariants.md`
- `docs/20-product-tdd/cross-unit-contracts.md`
- `docs/20-product-tdd/system-state-and-authority.md`

## Slice 1: PR Page Entry Only

Goal:

- Add a peer Utility Actions component for Study Sprint Pomodoro.

Expected behavior:

- Render only for `pr.core.type === "STUDY_SPRINT"` and active participants.
- Disable when `pr.status !== "ACTIVE"` with explanatory copy.
- Derive duration from PR Time window with 30-minute fallback.
- Use button copy `开始一起专注<duration>分钟`.
- Navigate to the chosen Study Sprint route with enough bootstrap context for
  the room to initialize.

Candidate files:

- `apps/frontend/src/pages/PRPage.vue`
- `apps/frontend/src/domains/pr/ui/sections/PRStudySprintPomodoroAction.vue`
- `apps/frontend/src/domains/pr/ui/sections/PRUtilityComponents.test.ts`
- locale files if new copy is introduced

## Slice 2: Backend Room Baseline

Goal:

- Add room/session/event persistence and participant-only snapshot reads before
  shipping the multi-person room.

Expected behavior:

- Active `STUDY_SPRINT` participants can bootstrap the room.
- Participants manually start their own timer.
- Session events are stored in an append-only ledger.
- Session aggregate fields power room snapshot reads.
- Room snapshot is visible only to current active participants.
- Study Sprint aggregates do not update reputation, reliability, punishment, or
  PR participation status.

Candidate files:

- `apps/backend/src/controllers/study-sprint.controller.ts`
- `apps/backend/src/domains/study-sprint/*`
- `apps/backend/src/repositories/StudySprint*Repository.ts`
- backend migration and focused backend unit tests

## Slice 3: Room Shell And Guidance

Goal:

- Add the room route, full-screen first-use guidance, and video-call-like
  layout backed by polling snapshot reads.

Expected behavior:

- Show participant tiles using PR detail / participant projection.
- Make the participant grid the primary room surface. The viewer appears as one
  highlighted call tile rather than as a separate dominant timer panel.
- Use explicit viewer status branching:
  `NOT_STARTED -> start`, `FOCUSING -> complete`,
  `COMPLETED -> completed`, `LEFT -> left`.
- Single-person rooms use one full-width participant tile instead of a
  half-width grid cell.
- Participant tiles keep a stable aspect ratio instead of stretching to fill
  all available room height.
- Room header uses compact call-room chrome rather than a large detail-page
  header.
- Keep room commands in a bottom call-control area.
- Show the viewer's independent Pomodoro timer.
- Use the derived duration.
- Allow late entry by initializing the viewer's timer from their own entrance.
- Keep the viewer in the room after their timer reaches completed state.
- Show full-screen first-use guidance fake pages with illustration, text, and
  `下一个` / `开始` actions before entering the room.
- Use a distinct illustration for each guidance step and transition step
  changes with a horizontal slide treatment.

Candidate files:

- `apps/frontend/src/app/router.ts`
- possible new `apps/frontend/src/pages/StudySprintPomodoroPage.vue`
- possible new `apps/frontend/src/domains/study-sprint/*`

## Slice 4: Focus Evidence

Goal:

- Connect frontend route-residence / lifecycle evidence tracking to backend
  event recording without claiming durable physical no-touch proof.

Expected behavior:

- Count valid residence time while the viewer remains in the Pomodoro page
  context.
- Count screen-off elapsed wall-clock time according to product policy when the
  page lifecycle supports that classification.
- Do not treat in-page touches as interruptions.
- Classify route leave / app switch / hidden state carefully and visibly in the
  local summary.
