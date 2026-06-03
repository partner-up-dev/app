# Product Decisions And Questions

## Confirmed Decisions

- The feature is a standalone Study Sprint Pomodoro capability for self-study
  partner PRs.
- Each participant has an independent Pomodoro timer.
- The room contains only Pomodoro accountability behavior. It is not a chat,
  video, audio, co-editing, or full meeting feature.
- "Video-call-like" means layout only: a multi-person grid / call-room visual
  pattern, not actual camera or microphone.
- Late participants can join an already-running focus interval.
- Staying on the Pomodoro page is not considered touching the phone.
- Screen-off time should count as focus time when the user had entered the
  Pomodoro page before screen-off.
- The Pomodoro duration is passed from the PR Page entry button.
- Duration source: compute from the PR Time window.
- Duration fallback: 30 minutes.
- Reaching `Completed` does not automatically exit the participant from the
  room. The participant remains in the room and can review others' state or
  leave manually.
- The first-use experience should show a concise guidance surface before or
  when entering the room.
- Use event ledger plus session aggregate fields for backend persistence.
- Participants manually start their own timer after entering the room.
- Non-`ACTIVE` PR state keeps the PR Page entry visible but disabled for
  eligible active participants.
- Room realtime state is visible only to current active participants.
- User-visible summary shows only aggregate state for participants in the
  current room session.
- Study Sprint Pomodoro results do not affect personal reputation,
  reliability, PR punishment, or participation status.

## Initial Entry Rule

User-provided target:

- On PR Page, when `pr.type == "STUDY_SPRINT"` and the viewer is an active
  participant, show a Study Sprint Pomodoro button in the Utility Actions area.
- The action is only available when PR `status == "ACTIVE"`.

Current interpretation:

- Visibility gate: `pr.core.type === "STUDY_SPRINT"` plus
  `pr.partnerSection.viewer.isParticipant === true`.
- Availability gate: `pr.status === "ACTIVE"`.
- Duration carried by the entry should be:
  - `endAt - startAt` in minutes when both sides of `pr.core.time` exist and
    the result is positive.
  - `30` minutes otherwise.
- Button copy: `开始一起专注<duration>分钟`.

Disabled UX:

- When the viewer is an active participant but the PR is not `ACTIVE`, keep the
  entry visible but disabled with explanatory copy.

## Pomodoro Semantics

Current product shape:

- The PR / room can contain multiple active participants.
- Each participant's timer is independent after they enter.
- A participant who joins late starts their own remaining / elapsed accounting
  from their own entry point, not from the first participant's start time.
- The room layout should make other participants' presence and focus progress
  visible enough to create accountability.
- Completing the target duration changes the participant's timer state to
  completed but keeps the participant in the room until they explicitly leave.

Current MVP exclusions:

- No pause or reset.
- No break / report phase.
- MVP is a single continuous focus interval whose length comes from the PR Time
  window.

## First-Use Guidance

Show a full-screen first-use guidance flow the first time a user enters this
feature.

Guidance is a fake page / onboarding surface, not an inline notice or modal. It
is composed from:

- illustration
- short text
- one action button

Recommended guidance items, capped at three:

- 熄屏会计入专注时长：进入番茄钟页面后熄屏，恢复时仍回到这里，会按规则计入。
- 可以实时看到同伴们的专注情况：房间会展示同伴的在线和专注状态。
- 开始专注：final guidance page text.

Action copy:

- Intermediate guidance pages use `下一个`.
- Final action uses `开始`.

Implementation note:

- Persisting whether guidance has been seen can be local-first for MVP unless
  cross-device consistency becomes important.

## No-Phone Recording Language

Current product target:

- Count time as focus / no-phone time while the user remains in the Pomodoro
  page context.
- Screen-off should count, because the user is not interacting with the phone.

Recommended product copy until stronger measurement exists:

- Use "专注时长" or "页面驻留专注时长".
- Avoid claiming "绝对没碰手机" in durable UI copy unless the measurement source
  can prove physical no-touch behavior.

Current policy:

- Room realtime state is visible only to current active participants.
- User-visible summary shows only this room session's participant aggregate
  state.
- Raw evidence ledger is backend-owned and not a user-facing history surface.
- Suspicious behavior does not affect PR participation, personal reputation,
  reminders, or punishment flows in MVP.
