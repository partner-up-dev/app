# Study Sprint Pomodoro

## Objective & Hypothesis

Design an independent Study Sprint Pomodoro feature before implementation.

The feature is intended for `STUDY_SPRINT` PRs where active participants cannot
sit at the same table but still want mutual accountability. It should provide a
multi-person online Pomodoro room with a video-call-like layout and record each
participant's "no-phone" focus time.

Hypothesis:

- A PR-attached Pomodoro room can make remote study partner sessions feel
  accountable without requiring the partners to share a physical desk.
- "No-phone" time should initially mean page-attention / focus-session evidence,
  not a hard claim that the user physically never touched the phone.
- Staying on the Pomodoro page is not considered "touching phone".
- The first entry can be hard-coded into the PR Page Utility Actions area for
  `STUDY_SPRINT` PRs while the domain model and recording semantics are still
  being designed.

## Packet Index

- Product decisions and open questions:
  `10-product-decisions-and-questions.md`
- Technical topology and constraints:
  `20-technical-topology-and-constraints.md`
- Candidate implementation slices:
  `30-implementation-slices.md`
- Verification strategy:
  `40-verification-strategy.md`

## Input Classification

- Type: `Intent` for the product behavior.
- Current requested artifact: task packet only.
- Active mode: `Explore`.
- Implementation status: started on 2026-06-02 after the user confirmed the
  remaining product and technical decisions and explicitly approved
  implementation.

## Guardrails Touched

- Product truth:
  - `docs/10-prd/behavior/capabilities.md`
  - `docs/10-prd/behavior/workflows.md`
  - `docs/10-prd/behavior/rules-and-invariants.md`
- Cross-unit technical truth:
  - `docs/20-product-tdd/cross-unit-contracts.md`
  - `docs/20-product-tdd/system-state-and-authority.md`
  - `docs/20-product-tdd/analytics-and-telemetry-contracts.md`
- Frontend entry and UI:
  - `apps/frontend/src/app/router.ts`
  - `apps/frontend/src/pages/PRPage.vue`
  - `apps/frontend/src/domains/pr/ui/sections/*`
  - `apps/frontend/src/domains/pr/queries/usePRDetail.ts`
  - possible new frontend domain under `apps/frontend/src/domains/study-sprint/*`
- Backend authority:
  - existing PR active participant eligibility from `pr-core`
  - `apps/backend/src/domains/pr/read-models/get-pr-detail.ts`
  - `apps/backend/src/domains/pr-core/services/partner-section-view.service.ts`
  - possible new backend domain under `apps/backend/src/domains/study-sprint/*`
- Verification:
  - focused frontend unit tests for entry visibility / disabled state
  - `apps/frontend/src/domains/pr/ui/sections/PRUtilityComponents.test.ts`
  - `tests/scenario/pr-core/pr-detail-participation.scenario.test.ts`
  - room-page unit tests for timer and visibility evidence behavior
  - backend unit tests if persistence or eligibility APIs are added
  - system scenario if the feature crosses real PR Page, backend auth, and room
    entry behavior

## Verification For This Packet

- No production code changed in this slice.
- Poly-file task packet created under `tasks/study-sprint-pomodoro/`.
- Current code anchors inspected for PR Page Utility Actions and PR detail
  participant/type/status fields.
- Open product and technical decisions are explicit before implementation.

## Discussion Log

- 2026-06-01: User requested a new independent feature: Study Sprint Pomodoro
  for self-study partners. Initial product intent: multi-person online Pomodoro
  with a video-call-like layout and no-phone time recording. Initial entry:
  hard-code a PR Page Utility Actions button when `pr.type == "STUDY_SPRINT"`
  and the user is an active participant; action available only while status is
  `ACTIVE`. User explicitly requested a task packet first because product and
  technical decisions still need discussion.
- 2026-06-01: User requested a poly-file task packet and confirmed key product
  decisions: each participant has an independent Pomodoro only; time counts only
  when the user has not touched the phone, defined initially as staying on the
  Pomodoro page, with screen-off time counted; duration is carried from the PR
  Page button based on the PR Time window with 30 minutes fallback; late
  participants can join an already-running interval; video-call-like means
  layout only, not real audio/video.
- 2026-06-02: User confirmed that completed participants do not automatically
  exit the room; first-use guidance should explain screen-off counting and a
  small number of key rules; the PR Page entry button copy is
  `开始一起专注<duration>分钟`; backend persistence should use event ledger plus
  session aggregate fields.
- 2026-06-02: User refined first-use guidance to include
  `熄屏会计入专注时长` and `可以实时看到同伴们的专注情况`. The initial
  `现在开始` action-copy idea was superseded by the later full-screen guidance
  flow decision.
- 2026-06-02: User refined guidance format: first-use guidance is a full-screen
  fake-page onboarding flow with illustration, text, and action button. Actions
  are `下一个` for intermediate pages and `开始` for the final page; final page
  text should be `开始专注`.
- 2026-06-02: User confirmed remaining implementation decisions: participants
  manually start after entering; non-`ACTIVE` PR Page entry stays visible but
  disabled; room realtime state is visible only to current active participants;
  user-visible summary shows only current room participant aggregates; Study
  Sprint results do not affect reputation or PR punishment. User approved
  starting implementation after these task packet updates.
- 2026-06-02: Implementation added durable docs, backend Study Sprint
  room/session/event persistence, participant-only room snapshots, PR Page
  Utility Actions entry, `/pr/:id/study-sprint` room route, full-screen
  guidance, manual start, polling room state, and event-ledger-backed aggregate
  updates.
- 2026-06-02: User requested different illustrations for each guidance step
  and a left/right swipe-style transition between guidance steps.
- 2026-06-02: User rejected the initial room shell as not video-call-like.
  Room shell should make the participant grid the primary visual surface:
  each active participant is a call tile with avatar/status/progress overlays,
  and the viewer's controls live in a bottom call-control area.
- 2026-06-02: User requested behavior and UI fixes after reviewing
  `https://partner-up.localhost/pr/26/study-sprint?duration=60`: `NOT_STARTED`
  viewer state must show start, single-person rooms should use a full-width
  tile, participant tiles should keep a stable ratio, header density should be
  reduced, and bottom controls should read more like call controls.
